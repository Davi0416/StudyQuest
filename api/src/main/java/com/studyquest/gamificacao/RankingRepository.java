package com.studyquest.gamificacao;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class RankingRepository implements PanacheRepository<RankingEntry> {

    public List<RankingEntry> top10Semana(LocalDate semana) {
        return find("semana = ?1", Sort.by("xpSemana").descending(), semana)
                .page(Page.ofSize(10))
                .list();
    }

    public Optional<RankingEntry> findByUserAndSemana(UUID userId, LocalDate semana) {
        return find("userId = ?1 AND semana = ?2", userId, semana).firstResultOptional();
    }
}
