package com.studyquest.missoes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;

public record ValidarCodigoRequest(
        @NotBlank String codigo,
        @NotBlank String linguagem,
        @NotNull List<Map<String, String>> testes
) {}
