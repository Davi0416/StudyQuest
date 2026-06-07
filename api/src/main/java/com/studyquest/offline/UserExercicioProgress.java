package com.studyquest.offline;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_exercicio_progress", uniqueConstraints = @UniqueConstraint(columnNames = {"userId", "noId", "exercicioId"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserExercicioProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(columnDefinition = "TEXT")
    private UUID userId;

    private Long noId;

    @Column(length = 128)
    private String exercicioId;

    @Lob
    private String codigo;

    @Builder.Default
    private Boolean aprovado = false;

    @Builder.Default
    private LocalDateTime atualizadoEm = LocalDateTime.now();
}
