package com.studyquest.offline;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_nos", uniqueConstraints = @UniqueConstraint(columnNames = {"userId", "noId"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserNo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(columnDefinition = "TEXT")
    private UUID userId;

    private Long noId;

    @Builder.Default
    private String status = "BLOQUEADO"; // BLOQUEADO, EM_PROGRESSO, CONCLUIDO

    private LocalDateTime iniciadoEm;

    private LocalDateTime concluidoEm;
}
