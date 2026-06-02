package com.studyquest.gamificacao.dto;

import java.util.List;

public record RankingResponse(
        List<RankingItem> top10,
        RankingItem posicaoAtual
) {
    public record RankingItem(int posicao, String userName, String avatarUrl, int xpSemana, boolean isCurrentUser) {}
}
