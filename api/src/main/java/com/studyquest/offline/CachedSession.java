package com.studyquest.offline;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "cached_session")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CachedSession {

    @Id
    private UUID userId;

    @Column(nullable = false)
    private String email;

    private String name;

    private String avatarUrl;

    // Último refresh token válido — usado para renovação offline
    @Column(columnDefinition = "TEXT")
    private String lastRefreshToken;

    @Builder.Default
    private LocalDateTime cachedAt = LocalDateTime.now();
}
