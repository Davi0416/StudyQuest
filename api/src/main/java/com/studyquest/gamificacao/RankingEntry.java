package com.studyquest.gamificacao;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "ranking_semanal",
        uniqueConstraints = @UniqueConstraint(name = "uc_ranking_user_semana", columnNames = {"userId", "semana"}),
        indexes = @Index(name = "idx_ranking_semana_xp", columnList = "semana, xpSemana"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RankingEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private UUID userId;

    private String userName;

    private String userAvatarUrl;

    @Builder.Default
    private Integer xpSemana = 0;

    private LocalDate semana; // primeiro dia da semana (segunda-feira)
}
