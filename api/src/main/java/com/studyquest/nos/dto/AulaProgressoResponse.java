package com.studyquest.nos.dto;

import java.util.List;

public record AulaProgressoResponse(
        int passo,
        List<ExercicioProgressoDto> exercicios
) {}
