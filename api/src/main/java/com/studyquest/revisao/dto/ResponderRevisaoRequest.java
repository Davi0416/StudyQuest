package com.studyquest.revisao.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ResponderRevisaoRequest(
        @NotBlank
        @Pattern(regexp = "facil|ok|dificil", message = "resultado deve ser 'facil', 'ok' ou 'dificil'")
        String resultado
) {}
