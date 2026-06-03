package com.studyquest.trilhas.seed;

import java.util.List;
import java.util.Map;

public record AulaBlocoSeedDto(
        String tipo,
        String titulo,
        String conteudo,
        String url,
        String linkAssistir,
        String id,
        Integer nivel,
        String icone,
        Boolean boss,
        String enunciado,
        String codigoInicial,
        String linguagem,
        List<Map<String, String>> testes
) {}
