package com.studyquest.trilhas;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class TrilhaRepository implements PanacheRepository<Trilha> {

    public List<Trilha> findAtivas() {
        return list("ativo", true);
    }
}
