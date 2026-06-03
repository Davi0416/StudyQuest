package com.studyquest.trilhas.seed;

import java.util.List;

public record MissaoSeedDto(
        String enunciado,
        String codigoInicial,
        String linguagem,
        List<TesteSeedDto> testes
) {}
