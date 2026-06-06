package com.studyquest.auth;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;

@ApplicationScoped
public class RevokedTokenRepository implements PanacheRepository<RevokedToken> {

    public boolean isRevoked(String jti) {
        return find("jti = ?1", jti).firstResultOptional().isPresent();
    }

    @Transactional
    public void deleteExpired() {
        delete("expiresAt < ?1", LocalDateTime.now());
    }
}
