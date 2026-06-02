package com.studyquest.nos.dto;

import com.studyquest.nos.No;

import java.util.List;

public record NoResponse(
        Long id,
        String titulo,
        String conteudo,
        Long trilhaId,
        Integer ordem,
        Integer xpRecompensa,
        List<Long> prerequisitoIds,
        String status // BLOQUEADO, EM_PROGRESSO, CONCLUIDO — nullable se sem contexto de usuário
) {
    public static NoResponse of(No no, String status) {
        return new NoResponse(
                no.getId(),
                no.getTitulo(),
                no.getConteudo(),
                no.getTrilhaId(),
                no.getOrdem(),
                no.getXpRecompensa(),
                no.getPrerequisitos().stream().map(No::getId).toList(),
                status
        );
    }
}
