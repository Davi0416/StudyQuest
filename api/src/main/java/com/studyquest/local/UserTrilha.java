package com.studyquest.local;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_trilhas", uniqueConstraints = @UniqueConstraint(columnNames = {"userId", "trilhaId"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserTrilha {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private UUID userId;

    private Long trilhaId;

    @Builder.Default
    private Integer xpGanho = 0;

    @Builder.Default
    private Integer nosConcluidosCount = 0;

    @Builder.Default
    private LocalDateTime matriculadaEm = LocalDateTime.now();

    private LocalDateTime concluidaEm;
}
