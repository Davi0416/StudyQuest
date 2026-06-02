package com.studyquest.trilhas.seed;

import java.util.List;

public record TrilhaSeedDto(
        String titulo,
        String descricao,
        String cor,
        Integer xpTotal,
        List<NoSeedDto> nos
) {}
