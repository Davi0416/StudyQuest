package com.studyquest.missoes.dto;

import com.studyquest.missoes.Missao;

public record MissaoResponse(
        Long id,
        Long noId,
        String titulo,
        String enunciado,
        String codigoInicial,
        String linguagem,
        Integer xpRecompensa
) {
    public MissaoResponse(Missao m) {
        this(m.getId(), m.getNoId(), m.getTitulo(), m.getEnunciado(),
                m.getCodigoInicial(), m.getLinguagem(), m.getXpRecompensa());
    }
}
