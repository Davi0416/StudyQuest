package com.studyquest.missoes;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "missoes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Missao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long noId;

    @Column(nullable = false)
    private String titulo;

    @Column(columnDefinition = "TEXT")
    private String enunciado;

    @Column(columnDefinition = "TEXT")
    private String codigoInicial;

    @Column(nullable = false)
    private String linguagem; // python, javascript, java, etc.

    @Column(columnDefinition = "TEXT")
    private String testesJson; // JSON com casos de teste

    @Builder.Default
    private Integer xpRecompensa = 100;
}
