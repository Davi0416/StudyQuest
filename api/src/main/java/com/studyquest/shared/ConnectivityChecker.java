package com.studyquest.shared;

import io.agroal.api.AgroalDataSource;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.sql.Connection;
import java.time.Duration;
import java.time.Instant;

/**
 * Verifica se o datasource principal (PostgreSQL em produção) está acessível.
 * Em modo desktop (SQLite), sempre retorna true — o banco é sempre local.
 * O resultado é cacheado por 15 segundos para não impactar a latência de cada request.
 */
@ApplicationScoped
public class ConnectivityChecker {

    @Inject
    AgroalDataSource dataSource;

    // true = auth via PostgreSQL remoto (perfil neon/prod)
    // false = auth via SQLite local (perfil desktop/dev)
    @ConfigProperty(name = "studyquest.auth.remote", defaultValue = "false")
    boolean authRemote;

    private volatile boolean cachedResult = true;
    private volatile Instant lastCheck = Instant.EPOCH;
    private static final Duration TTL = Duration.ofSeconds(15);

    public boolean isOnline() {
        if (!authRemote) return true; // modo local — sempre "online"

        Instant now = Instant.now();
        if (Duration.between(lastCheck, now).compareTo(TTL) < 0) {
            return cachedResult;
        }

        try (Connection conn = dataSource.getConnection()) {
            cachedResult = conn.isValid(2);
        } catch (Exception e) {
            cachedResult = false;
        }
        lastCheck = Instant.now();
        return cachedResult;
    }
}
