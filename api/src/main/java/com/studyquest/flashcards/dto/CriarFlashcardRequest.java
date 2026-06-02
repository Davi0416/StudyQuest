package com.studyquest.flashcards.dto;

import jakarta.validation.constraints.NotBlank;

public record CriarFlashcardRequest(
        Long trilhaId,
        Long noId,
        @NotBlank String frente,
        @NotBlank String verso
) {}
