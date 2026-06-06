package com.studyquest.trilhas;

import com.studyquest.nos.No;
import com.studyquest.nos.NoRepository;
import com.studyquest.offline.UserTrilha;
import com.studyquest.shared.db.LocalDb;
import com.studyquest.shared.exception.RecursoNaoEncontradoException;
import com.studyquest.trilhas.dto.TrilhaResponse;
import com.studyquest.trilhas.seed.TrilhaSeedLoader;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class TrilhaService {

    @Inject
    TrilhaRepository trilhaRepository;

    @Inject
    NoRepository noRepository;

    @Inject
    TrilhaSeedLoader trilhaSeedLoader;

    @Inject
    LocalDb localDb;

    public List<TrilhaResponse> listarTodas() {
        trilhaSeedLoader.ensureSeeded();
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
        trilhaSeedLoader.ensureSeeded();
        List<UserTrilha> userTrilhas = localDb.read(em ->
                em.createQuery("SELECT ut FROM UserTrilha ut WHERE ut.userId = :uid", UserTrilha.class)
                        .setParameter("uid", userId)
                        .getResultList()
        );

        if (userTrilhas.isEmpty()) return List.of();

        List<Long> trilhaIds = userTrilhas.stream().map(UserTrilha::getTrilhaId).toList();
        Map<Long, Trilha> trilhasMap = trilhaRepository.list("id IN ?1", trilhaIds)
                .stream().collect(Collectors.toMap(Trilha::getId, t -> t));

        return userTrilhas.stream()
                .map(ut -> {
                    Trilha t = trilhasMap.get(ut.getTrilhaId());
                    if (t == null) return null;
                    
                    // Fallback para corrigir estados antigos dessincronizados do BD local:
                    // Calcula dinamicamente o XP e nós baseados no status real dos nós do usuário.
                    // No e UserNo vivem em datasources diferentes (principal vs local SQLite),
                    // por isso a lógica é dividida em duas etapas.

                    // Etapa 1: busca os nós da trilha no datasource principal
                    List<No> nos = noRepository.findByTrilha(t.getId());
                    List<Long> noIds = nos.stream().map(No::getId).toList();

                    int nosConcluidosCount = 0;
                    int xpGanho = 0;

                    if (!noIds.isEmpty()) {
                        // Etapa 2: conta e soma XP dos nós concluídos no SQLite local
                        List<Long> noIdsCopy = noIds; // efetivamente final para lambda
                        List<Long> concluidosIds = localDb.read(em ->
                            em.createQuery(
                                "SELECT un.noId FROM UserNo un WHERE un.userId = :uid AND un.noId IN :noIds AND un.status = 'CONCLUIDO'",
                                Long.class)
                            .setParameter("uid", userId)
                            .setParameter("noIds", noIdsCopy)
                            .getResultList()
                        );

                        nosConcluidosCount = concluidosIds.size();
                        if (!concluidosIds.isEmpty()) {
                            Map<Long, Integer> xpPorNo = nos.stream()
                                .collect(Collectors.toMap(No::getId, No::getXpRecompensa));
                            xpGanho = concluidosIds.stream()
                                .mapToInt(id -> xpPorNo.getOrDefault(id, 0))
                                .sum();
                        }
                    }
                    
                    // Update the local database object with the correct recalculation
                    final int finalNosCount = nosConcluidosCount;
                    final int finalXpGanho = xpGanho;
                    if (ut.getNosConcluidosCount() != finalNosCount || ut.getXpGanho() != finalXpGanho) {
                        localDb.write(em -> {
                            UserTrilha u = em.find(UserTrilha.class, ut.getId());
                            if (u != null) {
                                u.setNosConcluidosCount(finalNosCount);
                                u.setXpGanho(finalXpGanho);
                            }
                        });
                    }

                    return TrilhaResponse.of(t, xpGanho, nosConcluidosCount);
                })
                .filter(t -> t != null)
                .toList();
    }

    public TrilhaResponse matricular(Long trilhaId, UUID userId) {
        Trilha trilha = trilhaRepository.findById(trilhaId);
        if (trilha == null) throw new RecursoNaoEncontradoException("Trilha não encontrada");

        localDb.write(em -> {
            if (findUserTrilha(em, userId, trilhaId).isPresent()) {
                throw new WebApplicationException("Já matriculado nessa trilha", Response.Status.CONFLICT);
            }
            em.persist(UserTrilha.builder()
                    .userId(userId)
                    .trilhaId(trilhaId)
                    .build());
        });

        return TrilhaResponse.of(trilha, 0, 0);
    }

    private Optional<UserTrilha> findUserTrilha(UUID userId, Long trilhaId) {
        return localDb.read(em -> findUserTrilha(em, userId, trilhaId));
    }

    private Optional<UserTrilha> findUserTrilha(EntityManager em, UUID userId, Long trilhaId) {
        return em.createQuery(
                        "SELECT ut FROM UserTrilha ut WHERE ut.userId = :uid AND ut.trilhaId = :tid",
                        UserTrilha.class)
                .setParameter("uid", userId)
                .setParameter("tid", trilhaId)
                .getResultStream()
                .findFirst();
    }
}
