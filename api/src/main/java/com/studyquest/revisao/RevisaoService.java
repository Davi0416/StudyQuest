package com.studyquest.revisao;

import com.studyquest.flashcards.Flashcard;
import com.studyquest.flashcards.FlashcardRepository;
import com.studyquest.offline.LeitnerCard;
import com.studyquest.revisao.dto.ResponderRevisaoRequest;
import com.studyquest.revisao.dto.RevisaoHojeResponse;
import com.studyquest.shared.exception.RecursoNaoEncontradoException;
import io.quarkus.hibernate.orm.PersistenceUnit;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class RevisaoService {

    private static final int[] INTERVALOS = {0, 1, 2, 4, 7, 14}; // índice = caixa

    @Inject
    @PersistenceUnit("local")
    EntityManager localEm;

    @Inject
    FlashcardRepository flashcardRepository;

    public RevisaoHojeResponse hoje(UUID userId) {
        List<LeitnerCard> pendentes = localEm.createQuery(
                        "SELECT lc FROM LeitnerCard lc WHERE lc.userId = :uid AND lc.proximaRevisao <= :hoje",
                        LeitnerCard.class)
                .setParameter("uid", userId)
                .setParameter("hoje", LocalDate.now())
                .getResultList();

        Map<Integer, List<RevisaoHojeResponse.CardRevisao>> porCaixa = pendentes.stream()
                .map(lc -> {
                    Flashcard f = flashcardRepository.findById(lc.getFlashcardId());
                    if (f == null) return null;
                    return new RevisaoHojeResponse.CardRevisao(
                            lc.getId(), f.getId(), f.getFrente(), f.getVerso(), lc.getCaixa());
                })
                .filter(c -> c != null)
                .collect(Collectors.groupingBy(RevisaoHojeResponse.CardRevisao::caixa));

        return new RevisaoHojeResponse(pendentes.size(), porCaixa);
    }

    @Transactional
    public void responder(Long leitnerCardId, UUID userId, ResponderRevisaoRequest req) {
        LeitnerCard lc = localEm.find(LeitnerCard.class, leitnerCardId);
        if (lc == null || !lc.getUserId().equals(userId)) {
            throw new RecursoNaoEncontradoException("Card não encontrado");
        }

        switch (req.resultado()) {
            case "facil" -> lc.setCaixa(Math.min(5, lc.getCaixa() + 1));
            case "dificil" -> lc.setCaixa(1);
            // "ok" permanece na mesma caixa
        }

        lc.setUltimaRevisao(LocalDate.now());
        lc.setProximaRevisao(LocalDate.now().plusDays(INTERVALOS[lc.getCaixa()]));
    }

    public Map<Integer, Long> stats(UUID userId) {
        List<Object[]> rows = localEm.createQuery(
                        "SELECT lc.caixa, COUNT(lc) FROM LeitnerCard lc WHERE lc.userId = :uid GROUP BY lc.caixa",
                        Object[].class)
                .setParameter("uid", userId)
                .getResultList();

        return rows.stream().collect(Collectors.toMap(
                r -> (Integer) r[0],
                r -> (Long) r[1]
        ));
    }

    @Transactional
    public void adicionarCard(UUID userId, Long flashcardId) {
        boolean existe = !localEm.createQuery(
                        "SELECT lc FROM LeitnerCard lc WHERE lc.userId = :uid AND lc.flashcardId = :fid",
                        LeitnerCard.class)
                .setParameter("uid", userId)
                .setParameter("fid", flashcardId)
                .getResultList().isEmpty();

        if (!existe) {
            LeitnerCard lc = LeitnerCard.builder()
                    .userId(userId)
                    .flashcardId(flashcardId)
                    .build();
            localEm.persist(lc);
        }
    }
}
