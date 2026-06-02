package com.studyquest.gamificacao.dto;

import com.studyquest.gamificacao.Conquista;

import java.time.LocalDateTime;

public record ConquistaResponse(
        Long id,
        String titulo,
        String descricao,
        String iconUrl,
        boolean desbloqueada,
        LocalDateTime desbloqueadaEm
) {
    public static ConquistaResponse naoDesbloqueada(Conquista c) {
        return new ConquistaResponse(c.getId(), c.getTitulo(), c.getDescricao(), c.getIconUrl(), false, null);
    }

    public static ConquistaResponse desbloqueada(Conquista c, LocalDateTime quando) {
        return new ConquistaResponse(c.getId(), c.getTitulo(), c.getDescricao(), c.getIconUrl(), true, quando);
    }
}
