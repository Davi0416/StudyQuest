package com.studyquest.gamificacao.dto;

import java.time.Instant;
import java.util.List;

public record RankingResponse(
        List<RankingItem> top10,
        RankingItem posicaoAtual,
        boolean cached,
        Instant cachedAt
) {
    public RankingResponse(List<RankingItem> top10, RankingItem posicaoAtual) {
        this(top10, posicaoAtual, false, null);
    }

    public record RankingItem(int posicao, String userName, String avatarUrl, int xpSemana, boolean isCurrentUser) {}
}
