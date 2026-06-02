package com.studyquest.revisao;

import com.studyquest.offline.LeitnerCard;
import com.studyquest.revisao.dto.ResponderRevisaoRequest;
import com.studyquest.shared.exception.RecursoNaoEncontradoException;
import com.studyquest.flashcards.FlashcardRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RevisaoServiceTest {

    EntityManager localEm;
    RevisaoService service;

    @BeforeEach
    void setUp() throws Exception {
        localEm = mock(EntityManager.class);
        FlashcardRepository flashcardRepo = mock(FlashcardRepository.class);

        service = new RevisaoService();
        // injeta via reflection (campos @Inject)
        var emField = RevisaoService.class.getDeclaredField("localEm");
        emField.setAccessible(true);
        emField.set(service, localEm);

        var repoField = RevisaoService.class.getDeclaredField("flashcardRepository");
        repoField.setAccessible(true);
        repoField.set(service, flashcardRepo);
    }

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

    private LeitnerCard leitnerCard(UUID userId, int caixa) {
        LeitnerCard card = new LeitnerCard();
        card.setUserId(userId);
        card.setCaixa(caixa);
        card.setProximaRevisao(LocalDate.now());
        return card;
    }
}
