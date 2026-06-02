package com.studyquest.flashcards;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "flashcards")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Flashcard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long trilhaId;

    private Long noId;

    private UUID criadoPorUserId; // null = curado pela equipe

    @Column(nullable = false, columnDefinition = "TEXT")
    private String frente;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String verso;

    @Builder.Default
    private LocalDateTime criadoEm = LocalDateTime.now();
}
