package com.studyquest.usuarios;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users",
        uniqueConstraints = @UniqueConstraint(name = "uc_users_provider_id", columnNames = {"provider", "providerId"}))
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    private String passwordHash;

    private String avatarUrl;

    @Builder.Default
    private String provider = "local";

    private String providerId;

    @Builder.Default
    private Integer lvl = 1;

    @Builder.Default
    private Integer totalXp = 0;

    @Builder.Default
    private Integer currentStreak = 0;

    @Builder.Default
    private Integer maxStreak = 0;

    private LocalDate lastActivityDate;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private boolean emailVerified = false;

    private LocalDateTime emailVerifiedAt;

    @Column(name = "register_ip")
    private String registerIp;
}
