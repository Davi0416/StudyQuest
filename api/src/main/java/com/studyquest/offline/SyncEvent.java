package com.studyquest.offline;

import com.studyquest.shared.sync.SyncStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "sync_queue",
        indexes = @Index(name = "idx_sync_user_status", columnList = "userId, status"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SyncEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private UUID userId;

    private String eventType; // NODE_COMPLETED, XP_GAINED, BADGE_UNLOCKED

    @Column(columnDefinition = "TEXT")
    private String payload; // JSON

    // Gerado na criação — garante idempotência no lado do Neon
    @Column(unique = true, nullable = false)
    @Builder.Default
    private UUID idempotencyKey = UUID.randomUUID();

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private SyncStatus status = SyncStatus.PENDING;

    @Builder.Default
    private int retryCount = 0;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime lastAttemptAt;

    private LocalDateTime processedAt;

    // Mantido para compatibilidade com registros antigos — não usar em código novo
    @Builder.Default
    @Deprecated
    private boolean processed = false;
}
