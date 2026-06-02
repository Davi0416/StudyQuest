package com.studyquest.missoes;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;

@ApplicationScoped
public class MissaoRepository implements PanacheRepository<Missao> {

    public Optional<Missao> findByNoId(Long noId) {
        return find("noId", noId).firstResultOptional();
    }
}
