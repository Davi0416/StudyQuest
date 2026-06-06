package com.studyquest.offline;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ranking_cache")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RankingCache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Primeiro dia da semana (segunda-feira), formato ISO: "YYYY-MM-DD"
    @Column(unique = true, nullable = false)
    private String semana;

    // JSON serializado com a lista de entradas do ranking (sem isCurrentUser — calculado on-the-fly)
    @Column(columnDefinition = "TEXT", nullable = false)
    private String dataJson;

    @Builder.Default
    private LocalDateTime cachedAt = LocalDateTime.now();
}
