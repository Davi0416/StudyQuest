package com.studyquest.nos.dto;

public record SalvarAulaProgressoRequest(
        Integer passo,
        String exercicioId,
        String codigo,
        Boolean aprovado
) {}
