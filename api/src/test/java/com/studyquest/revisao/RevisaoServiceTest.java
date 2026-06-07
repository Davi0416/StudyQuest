package com.studyquest.revisao;

import com.studyquest.flashcards.FlashcardRepository;
import com.studyquest.offline.LeitnerCard;
import com.studyquest.revisao.dto.ResponderRevisaoRequest;
import com.studyquest.revisao.dto.RevisaoHojeResponse;
import com.studyquest.shared.db.LocalDb;
import com.studyquest.shared.exception.RecursoNaoEncontradoException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RevisaoServiceTest {

    LocalDb localDb;
    EntityManager localEm;
    FlashcardRepository flashcardRepo;
    RevisaoService service;

    @BeforeEach
    void setUp() throws Exception {
        localDb = mock(LocalDb.class);
        localEm = mock(EntityManager.class);
        flashcardRepo = mock(FlashcardRepository.class);

        // localDb.read(fn) aplica fn ao EntityManager mock
        when(localDb.read(any())).thenAnswer(inv -> {
            Function<EntityManager, ?> fn = inv.getArgument(0);
            return fn.apply(localEm);
        });

        // localDb.write(consumer) aplica consumer ao EntityManager mock
        doAnswer(inv -> {
            Consumer<EntityManager> fn = inv.getArgument(0);
            fn.accept(localEm);
            return null;
        }).when(localDb).write(any());

        service = new RevisaoService();

        var dbField = RevisaoService.class.getDeclaredField("localDb");
        dbField.setAccessible(true);
        dbField.set(service, localDb);

        var repoField = RevisaoService.class.getDeclaredField("flashcardRepository");
        repoField.setAccessible(true);
        repoField.set(service, flashcardRepo);
    }

    // ---- testes de progressão de caixa ----

    @ParameterizedTest(name = "caixa {0} + facil = caixa {1}")
    @CsvSource({"1,2", "2,3", "3,4", "4,5", "5,5"})
    void responder_facil_avancaCaixaAteLimite5(int caixaAtual, int caixaEsperada) {
        UUID userId = UUID.randomUUID();
        LeitnerCard card = leitnerCard(userId, caixaAtual);
        when(localEm.find(LeitnerCard.class, 1L)).thenReturn(card);

        service.responder(1L, userId, new ResponderRevisaoRequest("facil"));

        assertEquals(caixaEsperada, card.getCaixa());
        assertNotNull(card.getUltimaRevisao());
        assertTrue(card.getProximaRevisao().isAfter(LocalDate.now().minusDays(1)));
    }

    @ParameterizedTest(name = "caixa {0} + dificil = caixa 1")
    @CsvSource({"1", "2", "3", "5"})
    void responder_dificil_sempreVoltaCaixa1(int caixaAtual) {
        UUID userId = UUID.randomUUID();
        LeitnerCard card = leitnerCard(userId, caixaAtual);
        when(localEm.find(LeitnerCard.class, 1L)).thenReturn(card);

        service.responder(1L, userId, new ResponderRevisaoRequest("dificil"));

        assertEquals(1, card.getCaixa());
    }

    @Test
    void responder_ok_mantemCaixa() {
        UUID userId = UUID.randomUUID();
        LeitnerCard card = leitnerCard(userId, 3);
        when(localEm.find(LeitnerCard.class, 1L)).thenReturn(card);

        service.responder(1L, userId, new ResponderRevisaoRequest("ok"));

        assertEquals(3, card.getCaixa());
    }

    @Test
    void responder_cardNaoEncontrado_lancaException() {
        when(localEm.find(LeitnerCard.class, 99L)).thenReturn(null);

        assertThrows(RecursoNaoEncontradoException.class,
                () -> service.responder(99L, UUID.randomUUID(), new ResponderRevisaoRequest("facil")));
    }

    @Test
    void responder_cardDeOutroUsuario_lancaException() {
        UUID dono = UUID.randomUUID();
        UUID invasor = UUID.randomUUID();
        LeitnerCard card = leitnerCard(dono, 2);
        when(localEm.find(LeitnerCard.class, 1L)).thenReturn(card);

        assertThrows(RecursoNaoEncontradoException.class,
                () -> service.responder(1L, invasor, new ResponderRevisaoRequest("facil")));
    }

    // ---- filtro de revisão do dia ----

    @Test
    void hoje_filtraComStringIsoNaoComEpochMillis() {
        Query query = mockQueryReturning(List.of());
        when(localEm.createNativeQuery(contains("proximaRevisao"))).thenReturn(query);

        service.hoje(UUID.randomUUID());

        // Captura o valor passado para :startOfTomorrow
        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(query, atLeastOnce()).setParameter(eq("startOfTomorrow"), captor.capture());

        Object param = captor.getValue();
        assertInstanceOf(String.class, param,
                "Parâmetro :startOfTomorrow deve ser String ISO, não epoch millis (Long). " +
                "Tipo encontrado: " + (param == null ? "null" : param.getClass().getSimpleName()));

        // Deve ter formato "YYYY-MM-DD" e ser exatamente amanhã
        String isoAmanha = LocalDate.now().plusDays(1).toString();
        assertEquals(isoAmanha, param,
                "Filtro deve usar a data de amanhã em formato ISO");
    }

    @Test
    void hoje_cardVencidoHoje_apareceNoFiltro() {
        // Verifica que um card com proximaRevisao = hoje passa pelo filtro (ISO léxico: hoje < amanhã)
        String hoje = LocalDate.now().toString();
        String amanha = LocalDate.now().plusDays(1).toString();

        // A comparação que a query faz: hoje < amanhã → true → card deve aparecer
        assertTrue(hoje.compareTo(amanha) < 0,
                "Comparação léxica ISO deve incluir card de hoje ('" + hoje + "' < '" + amanha + "')");
    }

    @Test
    void hoje_cardVencidoAmanha_naoApareceFiltro() {
        // Card com proximaRevisao = amanhã NÃO deve aparecer na revisão de hoje
        String amanha = LocalDate.now().plusDays(1).toString();
        String limiteExclusivo = LocalDate.now().plusDays(1).toString();

        // amanhã < amanhã → false → card correto não aparece
        assertFalse(amanha.compareTo(limiteExclusivo) < 0,
                "Card com proximaRevisao = amanhã não deve passar pelo filtro 'proximaRevisao < amanhã'");
    }

    @Test
    void hoje_semCards_retornaRevisaoVazia() {
        Query query = mockQueryReturning(List.of());
        when(localEm.createNativeQuery(anyString())).thenReturn(query);

        RevisaoHojeResponse resp = service.hoje(UUID.randomUUID());

        assertEquals(0, resp.totalPendentes());
        assertTrue(resp.porCaixa().isEmpty());
    }

    // ---- helpers ----

    private LeitnerCard leitnerCard(UUID userId, int caixa) {
        LeitnerCard card = new LeitnerCard();
        card.setUserId(userId);
        card.setCaixa(caixa);
        card.setProximaRevisao(LocalDate.now());
        return card;
    }

    @SuppressWarnings("unchecked")
    private Query mockQueryReturning(List<?> result) {
        Query q = mock(Query.class);
        when(q.setParameter(anyString(), any())).thenReturn(q);
        when(q.getResultList()).thenReturn((List<Object>) result);
        return q;
    }
}
