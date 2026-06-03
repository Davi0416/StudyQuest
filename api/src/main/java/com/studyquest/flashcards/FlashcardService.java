package com.studyquest.flashcards;

import com.studyquest.flashcards.dto.CriarFlashcardRequest;
import com.studyquest.flashcards.dto.FlashcardResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class FlashcardService {

    @Inject
    FlashcardRepository flashcardRepository;

    public List<FlashcardResponse> listar(Long trilhaId, Long noId) {
        return flashcardRepository.findByFiltros(trilhaId, noId).stream()
                .map(FlashcardResponse::new)
                .toList();
    }

    @Transactional
    public FlashcardResponse criar(UUID userId, CriarFlashcardRequest req) {
        Flashcard f = Flashcard.builder()
                .trilhaId(req.trilhaId())
                .noId(req.noId())
                .criadoPorUserId(userId)
                .frente(req.frente())
                .verso(req.verso())
                .build();

        flashcardRepository.persist(f);
        return new FlashcardResponse(f);
    }

    @Transactional
    public void deletar(Long id, UUID userId) {
        flashcardRepository.deleteByIdAndUser(id, userId);
    }
}
