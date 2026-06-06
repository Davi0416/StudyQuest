package com.studyquest.usuarios.dto;

public record UserStatsDTO(
        long missoesConcluidas,
        long missoesConcluidasSemana,
        long missoesPendentes,
        long flashcardsDominados,
        long flashcardsDominadosHoje,
        int xpHoje
) {}
