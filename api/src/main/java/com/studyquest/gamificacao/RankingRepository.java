package com.studyquest.gamificacao;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class RankingRepository implements PanacheRepository<RankingEntry> {

    public List<RankingEntry> top10Semana(LocalDate semana) {
        return list("semana = ?1 ORDER BY xpSemana DESC", semana).stream()
                .limit(10).toList();
    }

    public Optional<RankingEntry> findByUserAndSemana(UUID userId, LocalDate semana) {
        return find("userId = ?1 AND semana = ?2", userId, semana).firstResultOptional();
    }
}
