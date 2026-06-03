package com.studyquest.offline;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "sync_queue")
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

    @Builder.Default
    private boolean processed = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime processedAt;
}
