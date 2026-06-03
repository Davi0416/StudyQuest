package com.studyquest.missoes.dto;

import com.studyquest.missoes.Submissao;

import java.time.LocalDateTime;

public record SubmissaoResponse(
        Long id,
        Long missaoId,
        String status,
        String feedback,
        boolean primeiraAprovacao,
        LocalDateTime submetidaEm
) {
    public SubmissaoResponse(Submissao s) {
        this(s.getId(), s.getMissaoId(), s.getStatus(), s.getFeedback(),
                s.isPrimeiraAprovacao(), s.getSubmetidaEm());
    }
}
