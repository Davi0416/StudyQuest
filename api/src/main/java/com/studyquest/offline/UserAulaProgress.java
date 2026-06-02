package com.studyquest.offline;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_aula_progress", uniqueConstraints = @UniqueConstraint(columnNames = {"userId", "noId"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAulaProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private UUID userId;

    private Long noId;

    @Builder.Default
    private Integer passoAtual = 0;

    @Builder.Default
    private LocalDateTime atualizadoEm = LocalDateTime.now();
}
