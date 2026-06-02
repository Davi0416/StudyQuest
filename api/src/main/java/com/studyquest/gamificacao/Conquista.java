package com.studyquest.gamificacao;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "conquistas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conquista {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String titulo;

    private String descricao;

    private String iconUrl;

    private String criterio; // ex: "xp_total >= 500", "streak >= 7"
}
