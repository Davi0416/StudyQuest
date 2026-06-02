package com.studyquest.missoes.dto;

import jakarta.validation.constraints.NotBlank;

public record SubmeterCodigoRequest(
        @NotBlank String codigo,
        @NotBlank String linguagem
) {}
