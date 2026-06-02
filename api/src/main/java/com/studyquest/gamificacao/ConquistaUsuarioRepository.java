package com.studyquest.gamificacao;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ConquistaUsuarioRepository implements PanacheRepository<ConquistaUsuario> {

    public List<ConquistaUsuario> findByUser(UUID userId) {
        return list("userId", userId);
    }

    public boolean jaDesbloqueou(UUID userId, Long conquistaId) {
        return find("userId = ?1 AND conquistaId = ?2", userId, conquistaId)
                .firstResultOptional().isPresent();
    }
}
