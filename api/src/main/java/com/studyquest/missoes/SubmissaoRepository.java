package com.studyquest.missoes;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class SubmissaoRepository implements PanacheRepository<Submissao> {

    public List<Submissao> findByMissaoAndUser(Long missaoId, UUID userId) {
        return list("missaoId = ?1 AND userId = ?2 ORDER BY submetidaEm DESC", missaoId, userId);
    }

    public boolean jaAprovouNaPrimeiraTentativa(Long missaoId, UUID userId) {
        return find("missaoId = ?1 AND userId = ?2 AND primeiraAprovacao = true", missaoId, userId)
                .firstResultOptional()
                .isPresent();
    }

    public long countConcluidas(UUID userId) {
        return count("userId = ?1 AND primeiraAprovacao = true", userId);
    }

    public long countConcluidasDesde(UUID userId, LocalDateTime desde) {
        return count("userId = ?1 AND primeiraAprovacao = true AND submetidaEm >= ?2", userId, desde);
    }
}
