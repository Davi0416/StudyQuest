package com.studyquest.trilhas;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "trilhas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Trilha {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String titulo;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    private String iconUrl;

    private String cor;

    @Builder.Default
    private Integer xpTotal = 0;

    @Builder.Default
    private boolean ativo = true;

    @Builder.Default
    private LocalDateTime criadaEm = LocalDateTime.now();
}
