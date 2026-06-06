package com.studyquest.nos;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "nos",
        indexes = @Index(name = "idx_nos_trilha_ordem", columnList = "trilhaId, ordem"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class No {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String titulo;

    @Column(columnDefinition = "TEXT")
    private String conteudo;

    @Column(columnDefinition = "TEXT")
    private String aulaJson;

    private Long trilhaId;

    @Builder.Default
    private Integer ordem = 0;

    @Builder.Default
    private Integer xpRecompensa = 50;

    @ManyToMany
    @JoinTable(
            name = "no_prereqs",
            joinColumns = @JoinColumn(name = "no_id"),
            inverseJoinColumns = @JoinColumn(name = "prereq_id")
    )
    @Builder.Default
    private List<No> prerequisitos = new ArrayList<>();
}
