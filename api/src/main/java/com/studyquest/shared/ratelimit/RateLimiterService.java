package com.studyquest.shared.ratelimit;

import jakarta.enterprise.context.ApplicationScoped;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiter por usuário com janela deslizante (sliding window).
 * Usa um Map em memória — adequado para aplicativo desktop single-user.
 * Chave do bucket: "{userId}:{limitKey}" (ex: "abc-123:judge0")
 */
@ApplicationScoped
public class RateLimiterService {

    private final ConcurrentHashMap<String, ArrayDeque<Instant>> windows = new ConcurrentHashMap<>();

    /**
     * Tenta registrar uma requisição. Retorna true se permitido, false se limite atingido.
     *
     * @param userId      identificador do usuário
     * @param key         nome do recurso limitado (ex: "judge0", "groq")
     * @param maxRequests máximo de requisições na janela
     * @param window      duração da janela deslizante
     */
    public boolean tryAcquire(UUID userId, String key, int maxRequests, Duration window) {
        String bucketKey = userId + ":" + key;
        Instant now = Instant.now();
        Instant windowStart = now.minus(window);

        ArrayDeque<Instant> deque = windows.computeIfAbsent(bucketKey, k -> new ArrayDeque<>());

        synchronized (deque) {
            // Remove timestamps fora da janela
            while (!deque.isEmpty() && deque.peekFirst().isBefore(windowStart)) {
                deque.pollFirst();
            }

            if (deque.size() >= maxRequests) {
                return false;
            }

            deque.addLast(now);
            return true;
        }
    }

    /**
     * Retorna quantos segundos o usuário deve aguardar antes da próxima requisição ser aceita.
     */
    public long retryAfterSeconds(UUID userId, String key, Duration window) {
        String bucketKey = userId + ":" + key;
        ArrayDeque<Instant> deque = windows.get(bucketKey);
        if (deque == null) return 1;

        synchronized (deque) {
            if (deque.isEmpty()) return 1;
            Instant oldest = deque.peekFirst();
            long remaining = Duration.between(Instant.now(), oldest.plus(window)).getSeconds();
            return Math.max(1, remaining);
        }
    }
}
