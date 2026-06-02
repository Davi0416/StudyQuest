package com.studyquest.trilhas.seed;

import java.util.List;

public record NoSeedDto(
        int ordem,
        String titulo,
        String conteudo,
        int xpRecompensa,
        List<Integer> prerequisitosOrdem,
        List<FlashcardSeedDto> flashcards,
        AulaSeedDto aula,
        MissaoSeedDto missao
) {}
