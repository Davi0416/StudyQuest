package com.studyquest.missoes;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "submissoes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Submissao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long missaoId;

    private UUID userId;

    @Column(columnDefinition = "TEXT")
    private String codigo;

    private String linguagem;

    private String status; // APROVADO, REPROVADO, ERRO

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Builder.Default
    private boolean primeiraAprovacao = false;

    @Builder.Default
    private LocalDateTime submetidaEm = LocalDateTime.now();
}
