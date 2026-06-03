package com.studyquest.nos;

import com.studyquest.nos.dto.AulaProgressoResponse;
import com.studyquest.nos.dto.ExercicioProgressoDto;
import com.studyquest.nos.dto.SalvarAulaProgressoRequest;
import com.studyquest.offline.UserAulaProgress;
import com.studyquest.offline.UserExercicioProgress;
import com.studyquest.shared.db.LocalDb;
import com.studyquest.shared.exception.RecursoNaoEncontradoException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class AulaProgressService {

    @Inject
    LocalDb localDb;

    @Inject
    NoRepository noRepository;

    public AulaProgressoResponse obter(Long noId, UUID userId) {
        validarNo(noId);

        return localDb.read(em -> {
            int passo = findAulaProgress(em, userId, noId)
                    .map(UserAulaProgress::getPassoAtual)
                    .orElse(0);

            List<ExercicioProgressoDto> exercicios = em.createQuery(
                            "SELECT ep FROM UserExercicioProgress ep WHERE ep.userId = :uid AND ep.noId = :nid",
                            UserExercicioProgress.class)
                    .setParameter("uid", userId)
                    .setParameter("nid", noId)
                    .getResultStream()
                    .map(ep -> new ExercicioProgressoDto(ep.getExercicioId(), ep.getCodigo(), ep.getAprovado()))
                    .toList();

            return new AulaProgressoResponse(passo, exercicios);
        });
    }

    public AulaProgressoResponse salvar(Long noId, UUID userId, SalvarAulaProgressoRequest req) {
        validarNo(noId);

        localDb.write(em -> {
            if (req.passo() != null) {
                UserAulaProgress progress = findAulaProgress(em, userId, noId)
                        .orElseGet(() -> UserAulaProgress.builder()
                                .userId(userId)
                                .noId(noId)
                                .build());
                progress.setPassoAtual(Math.max(0, req.passo()));
                progress.setAtualizadoEm(LocalDateTime.now());
                if (progress.getId() == null) {
                    em.persist(progress);
                }
            }

            if (req.exercicioId() != null && !req.exercicioId().isBlank()) {
                UserExercicioProgress ep = findExercicioProgress(em, userId, noId, req.exercicioId())
                        .orElseGet(() -> UserExercicioProgress.builder()
                                .userId(userId)
                                .noId(noId)
                                .exercicioId(req.exercicioId())
                                .build());

                if (req.codigo() != null) {
                    ep.setCodigo(req.codigo());
                }
                if (req.aprovado() != null) {
                    ep.setAprovado(req.aprovado());
                }
                ep.setAtualizadoEm(LocalDateTime.now());

                if (ep.getId() == null) {
                    em.persist(ep);
                }
            }
        });

        return obter(noId, userId);
    }

    private void validarNo(Long noId) {
        if (noRepository.findById(noId) == null) {
            throw new RecursoNaoEncontradoException("Nó não encontrado");
        }
    }

    private Optional<UserAulaProgress> findAulaProgress(EntityManager em, UUID userId, Long noId) {
        return em.createQuery(
                        "SELECT p FROM UserAulaProgress p WHERE p.userId = :uid AND p.noId = :nid",
                        UserAulaProgress.class)
                .setParameter("uid", userId)
                .setParameter("nid", noId)
                .getResultStream()
                .findFirst();
    }

    private Optional<UserExercicioProgress> findExercicioProgress(EntityManager em, UUID userId, Long noId, String exercicioId) {
        return em.createQuery(
                        "SELECT ep FROM UserExercicioProgress ep WHERE ep.userId = :uid AND ep.noId = :nid AND ep.exercicioId = :eid",
                        UserExercicioProgress.class)
                .setParameter("uid", userId)
                .setParameter("nid", noId)
                .setParameter("eid", exercicioId)
                .getResultStream()
                .findFirst();
    }
}
