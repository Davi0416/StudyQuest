package com.studyquest.auth;

import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/**
 * Remove refresh tokens revogados já expirados da tabela revoked_tokens.
 * Roda diariamente às 3h00 para manter a tabela enxuta.
 */
@ApplicationScoped
public class RevokedTokenCleanupJob {

    @Inject
    RevokedTokenRepository revokedTokenRepository;

    @Scheduled(cron = "0 0 3 * * ?")
    public void cleanup() {
        revokedTokenRepository.deleteExpired();
    }
}
