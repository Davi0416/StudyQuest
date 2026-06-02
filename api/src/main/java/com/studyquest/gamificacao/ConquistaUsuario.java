package com.studyquest.gamificacao;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "conquistas_usuario",
        uniqueConstraints = @UniqueConstraint(columnNames = {"userId", "conquistaId"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConquistaUsuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private UUID userId;

    private Long conquistaId;

    @Builder.Default
    private LocalDateTime desbloqueadaEm = LocalDateTime.now();
}
