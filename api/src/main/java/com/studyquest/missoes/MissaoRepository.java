package com.studyquest.missoes;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class MissaoRepository implements PanacheRepository<Missao> {}
