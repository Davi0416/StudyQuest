package com.studyquest.revisao;

import com.studyquest.flashcards.Flashcard;
import com.studyquest.flashcards.FlashcardRepository;
import com.studyquest.offline.LeitnerCard;
import com.studyquest.revisao.dto.ResponderRevisaoRequest;
import com.studyquest.revisao.dto.RevisaoHojeResponse;
import com.studyquest.revisao.dto.TodosCardsResponse;
import com.studyquest.shared.db.LocalDb;
import com.studyquest.shared.exception.RecursoNaoEncontradoException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class RevisaoService {

    // índice = número da caixa (0 não usado); caixa 1=1d, 2=3d, 3=7d, 4=14d, 5=30d
    private static final int[] INTERVALOS = {0, 1, 3, 7, 14, 30};

    @Inject
    LocalDb localDb;

    @Inject
    FlashcardRepository flashcardRepository;

    public RevisaoHojeResponse hoje(UUID userId) {
        // SQLite armazena LocalDate como texto ISO ("YYYY-MM-DD"); comparação léxica funciona corretamente
        String amanha = LocalDate.now().plusDays(1).toString();

        @SuppressWarnings("unchecked")
        List<Object[]> rows = localDb.read(em -> (List<Object[]>) em.createNativeQuery(
                        "SELECT id, flashcardId, caixa FROM leitner_cards " +
                        "WHERE userId = :userId AND proximaRevisao < :startOfTomorrow")
                .setParameter("userId", userId.toString())
                .setParameter("startOfTomorrow", amanha)
                .getResultList());

        if (rows.isEmpty()) return new RevisaoHojeResponse(0, Map.of());

        List<Long> flashcardIds = rows.stream().map(r -> ((Number) r[1]).longValue()).distinct().toList();
        Map<Long, Flashcard> flashcardsMap = flashcardRepository.list("id IN ?1", flashcardIds)
                .stream().collect(Collectors.toMap(Flashcard::getId, f -> f));

        Map<Integer, List<RevisaoHojeResponse.CardRevisao>> porCaixa = rows.stream()
                .map(r -> {
                    Long leitnerCardId = ((Number) r[0]).longValue();
                    Long flashcardId = ((Number) r[1]).longValue();
                    int caixa = ((Number) r[2]).intValue();
                    Flashcard f = flashcardsMap.get(flashcardId);
                    if (f == null) return null;
                    return new RevisaoHojeResponse.CardRevisao(leitnerCardId, f.getId(), f.getFrente(), f.getVerso(), caixa);
                })
                .filter(c -> c != null)
                .collect(Collectors.groupingBy(RevisaoHojeResponse.CardRevisao::caixa));

        return new RevisaoHojeResponse(rows.size(), porCaixa);
    }

    public void responder(Long leitnerCardId, UUID userId, ResponderRevisaoRequest req) {
        localDb.write(em -> {
            LeitnerCard lc = em.find(LeitnerCard.class, leitnerCardId);
            if (lc == null || !lc.getUserId().equals(userId)) {
                throw new RecursoNaoEncontradoException("Card não encontrado");
            }

            switch (req.resultado()) {
                case "facil"   -> lc.setCaixa(Math.min(5, lc.getCaixa() + 1));
                case "ok"      -> { /* caixa não muda */ }
                case "dificil" -> lc.setCaixa(1);
            }

            lc.setUltimaRevisao(LocalDate.now());
            int diasAteProxima = req.resultado().equals("dificil") ? 0 : INTERVALOS[lc.getCaixa()];
            lc.setProximaRevisao(LocalDate.now().plusDays(diasAteProxima));
        });
    }

    public Map<Integer, Long> stats(UUID userId) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = localDb.read(em -> (List<Object[]>) em.createNativeQuery(
                        "SELECT caixa, COUNT(*) FROM leitner_cards WHERE userId = :userId GROUP BY caixa")
                .setParameter("userId", userId.toString())
                .getResultList());

        return rows.stream().collect(Collectors.toMap(
                r -> ((Number) r[0]).intValue(),
                r -> ((Number) r[1]).longValue()
        ));
    }

    public TodosCardsResponse todos(UUID userId) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = localDb.read(em -> (List<Object[]>) em.createNativeQuery(
                        "SELECT id, flashcardId, caixa, proximaRevisao, ultimaRevisao FROM leitner_cards " +
                        "WHERE userId = :userId ORDER BY caixa, proximaRevisao")
                .setParameter("userId", userId.toString())
                .getResultList());

        if (rows.isEmpty()) return new TodosCardsResponse(0, Map.of());

        List<Long> flashcardIds = rows.stream().map(r -> ((Number) r[1]).longValue()).distinct().toList();
        Map<Long, Flashcard> flashcardsMap = flashcardRepository.list("id IN ?1", flashcardIds)
                .stream().collect(Collectors.toMap(Flashcard::getId, f -> f));

        Map<Integer, List<TodosCardsResponse.CardDetalhe>> porCaixa = rows.stream()
                .map(r -> {
                    Long leitnerCardId = ((Number) r[0]).longValue();
                    Long flashcardId   = ((Number) r[1]).longValue();
                    int caixa          = ((Number) r[2]).intValue();
                    // SQLite devolve LocalDate como String ISO ("YYYY-MM-DD")
                    long proxRevisao   = isoDateToEpochMillis(r[3]);
                    long ultRevisao    = isoDateToEpochMillis(r[4]);
                    Flashcard f = flashcardsMap.get(flashcardId);
                    if (f == null) return null;
                    return new TodosCardsResponse.CardDetalhe(leitnerCardId, f.getId(), f.getFrente(), f.getVerso(), caixa, proxRevisao, ultRevisao);
                })
                .filter(c -> c != null)
                .collect(Collectors.groupingBy(TodosCardsResponse.CardDetalhe::caixa));

        return new TodosCardsResponse(rows.size(), porCaixa);
    }

    /**
     * Converte o valor de coluna LocalDate devolvido pelo driver SQLite (Xerial) para epoch millis.
     * O Xerial devolve datas como String ISO "YYYY-MM-DD" — nenhum outro tipo é esperado aqui.
     */
    private static long isoDateToEpochMillis(Object val) {
        if (val == null) return 0L;
        if (val instanceof String s && !s.isBlank()) {
            try {
                return LocalDate.parse(s).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli();
            } catch (Exception ignored) {}
        }
        return 0L;
    }

    public void adicionarCard(UUID userId, Long flashcardId) {
        localDb.write(em -> {
            Long count = ((Number) em.createNativeQuery(
                            "SELECT COUNT(*) FROM leitner_cards WHERE userId = :userId AND flashcardId = :fid")
                    .setParameter("userId", userId.toString())
                    .setParameter("fid", flashcardId)
                    .getSingleResult()).longValue();

            if (count == 0) {
                em.persist(LeitnerCard.builder()
                        .userId(userId)
                        .flashcardId(flashcardId)
                        .build());
            }
        });
    }
}
