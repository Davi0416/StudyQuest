package com.studyquest.ia.dto;

import jakarta.validation.constraints.NotBlank;

public record ChatRequest(
        @NotBlank String mensagem,
        ChatContexto contexto
) {
    public record ChatContexto(Long trilhaId, Long noId, String tituloTrilha, String tituloNo) {}
}
