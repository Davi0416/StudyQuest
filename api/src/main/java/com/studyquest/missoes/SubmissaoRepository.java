package com.studyquest.missoes;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

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
}
