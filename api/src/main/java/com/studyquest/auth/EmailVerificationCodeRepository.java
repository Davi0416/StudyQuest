package com.studyquest.auth;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class EmailVerificationCodeRepository implements PanacheRepositoryBase<EmailVerificationCode, UUID> {

    public Optional<EmailVerificationCode> findLatestActive(String email) {
        return find(
                "email = ?1 and consumed = false and expiresAt > ?2 order by createdAt desc",
                email,
                LocalDateTime.now()
        ).firstResultOptional();
    }

    public void invalidateAllForEmail(String email) {
        update("consumed = true where email = ?1 and consumed = false", email);
    }

    public void deleteExpired() {
        delete("expiresAt < ?1", LocalDateTime.now().minusDays(1));
    }
}
