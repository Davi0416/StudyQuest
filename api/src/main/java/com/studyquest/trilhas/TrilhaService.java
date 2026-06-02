package com.studyquest.trilhas;

import com.studyquest.offline.UserTrilha;
import com.studyquest.shared.exception.RecursoNaoEncontradoException;
import com.studyquest.trilhas.dto.TrilhaResponse;
import io.quarkus.hibernate.orm.PersistenceUnit;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class TrilhaService {

    @Inject
    TrilhaRepository trilhaRepository;

    @Inject
    @PersistenceUnit("local")
    EntityManager localEm;

    public List<TrilhaResponse> listarTodas() {
        return trilhaRepository.findAtivas().stream()
                .map(TrilhaResponse::of)
                .toList();
    }

    public TrilhaResponse detalhe(Long trilhaId, UUID userId) {
        Trilha trilha = trilhaRepository.findById(trilhaId);
        if (trilha == null) throw new RecursoNaoEncontradoException("Trilha não encontrada");

        Optional<UserTrilha> ut = findUserTrilha(userId, trilhaId);
        return ut.map(u -> TrilhaResponse.of(trilha, u.getXpGanho(), u.getNosConcluidosCount()))
                .orElse(TrilhaResponse.of(trilha));
    }

    public List<TrilhaResponse> ativas(UUID userId) {
        List<UserTrilha> userTrilhas = localEm
                .createQuery("SELECT ut FROM UserTrilha ut WHERE ut.userId = :uid", UserTrilha.class)
                .setParameter("uid", userId)
                .getResultList();

        return userTrilhas.stream().map(ut -> {
            Trilha t = trilhaRepository.findById(ut.getTrilhaId());
            if (t == null) return null;
            return TrilhaResponse.of(t, ut.getXpGanho(), ut.getNosConcluidosCount());
        }).filter(t -> t != null).toList();
    }

    @Transactional
    public TrilhaResponse matricular(Long trilhaId, UUID userId) {
        Trilha trilha = trilhaRepository.findById(trilhaId);
        if (trilha == null) throw new RecursoNaoEncontradoException("Trilha não encontrada");

        if (findUserTrilha(userId, trilhaId).isPresent()) {
            throw new WebApplicationException("Já matriculado nessa trilha", Response.Status.CONFLICT);
        }

        UserTrilha ut = UserTrilha.builder()
                .userId(userId)
                .trilhaId(trilhaId)
                .build();
        localEm.persist(ut);

        return TrilhaResponse.of(trilha, 0, 0);
    }

    private Optional<UserTrilha> findUserTrilha(UUID userId, Long trilhaId) {
        return localEm.createQuery(
                        "SELECT ut FROM UserTrilha ut WHERE ut.userId = :uid AND ut.trilhaId = :tid",
                        UserTrilha.class)
                .setParameter("uid", userId)
                .setParameter("tid", trilhaId)
                .getResultStream()
                .findFirst();
    }
}
