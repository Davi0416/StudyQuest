package com.studyquest.offline;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "leitner_cards",
        uniqueConstraints = @UniqueConstraint(name = "uc_leitner_user_flashcard", columnNames = {"userId", "flashcardId"}),
        indexes = @Index(name = "idx_leitner_user_proxima", columnList = "userId, proximaRevisao"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeitnerCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(columnDefinition = "TEXT")
    private UUID userId;

    private Long flashcardId;

    @Builder.Default
    private int caixa = 1; // 1-5

    @Builder.Default
    private LocalDate proximaRevisao = LocalDate.now();

    private LocalDate ultimaRevisao;
}
