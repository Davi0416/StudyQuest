package com.studyquest.revisao.dto;

import java.util.List;
import java.util.Map;

public record TodosCardsResponse(
        int total,
        Map<Integer, List<CardDetalhe>> porCaixa
) {
    public record CardDetalhe(
            Long leitnerCardId,
            Long flashcardId,
            String frente,
            String verso,
            int caixa,
            long proximaRevisao,
            long ultimaRevisao
    ) {}
}
