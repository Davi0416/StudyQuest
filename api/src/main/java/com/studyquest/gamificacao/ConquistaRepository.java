package com.studyquest.gamificacao;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class ConquistaRepository implements PanacheRepository<Conquista> {}
