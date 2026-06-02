package com.studyquest.auth;

import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class EmailVerificationCleanupJob {

    @Inject
    EmailVerificationCodeRepository codeRepository;

    @Scheduled(every = "1h")
    @Transactional
    public void cleanup() {
        codeRepository.deleteExpired();
    }
}
