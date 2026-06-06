package com.studyquest.auth;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "revoked_tokens",
        indexes = @Index(name = "idx_revoked_jti", columnList = "jti"),
        uniqueConstraints = @UniqueConstraint(name = "uc_revoked_jti", columnNames = {"jti"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RevokedToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // JWT ID do refresh token revogado
    @Column(nullable = false)
    private String jti;

    private UUID userId;

    @Builder.Default
    private LocalDateTime revokedAt = LocalDateTime.now();

    // Quando o refresh token expiraria — usado pelo cleanup job
    @Column(nullable = false)
    private LocalDateTime expiresAt;
}
