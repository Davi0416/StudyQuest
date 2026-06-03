package com.studyquest.revisao.dto;

import java.util.List;
import java.util.Map;

public record RevisaoHojeResponse(
        int totalPendentes,
        Map<Integer, List<CardRevisao>> porCaixa
) {
    public record CardRevisao(Long leitnerCardId, Long flashcardId, String frente, String verso, int caixa) {}
}
