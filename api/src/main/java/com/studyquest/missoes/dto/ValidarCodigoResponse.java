package com.studyquest.missoes.dto;

public record ValidarCodigoResponse(
        boolean aprovado,
        String feedback,
        int aprovados,
        int total
) {}
