package com.studyquest.trilhas.dto;

import com.studyquest.trilhas.Trilha;

public record TrilhaResponse(
        Long id,
        String titulo,
        String descricao,
        String iconUrl,
        String cor,
        Integer xpTotal,
        boolean ativo,
        // campos de progresso do usuário (nullable)
        Integer xpGanho,
        Integer nosConcluidosCount,
        boolean matriculado
) {
    public static TrilhaResponse of(Trilha t) {
        return new TrilhaResponse(t.getId(), t.getTitulo(), t.getDescricao(),
                t.getIconUrl(), t.getCor(), t.getXpTotal(), t.isAtivo(),
                null, null, false);
    }

    public static TrilhaResponse of(Trilha t, int xpGanho, int nosConcluidosCount) {
        return new TrilhaResponse(t.getId(), t.getTitulo(), t.getDescricao(),
                t.getIconUrl(), t.getCor(), t.getXpTotal(), t.isAtivo(),
                xpGanho, nosConcluidosCount, true);
    }
}
