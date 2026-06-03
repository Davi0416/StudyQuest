package com.studyquest.flashcards.dto;

import com.studyquest.flashcards.Flashcard;

public record FlashcardResponse(Long id, Long trilhaId, Long noId, String frente, String verso) {
    public FlashcardResponse(Flashcard f) {
        this(f.getId(), f.getTrilhaId(), f.getNoId(), f.getFrente(), f.getVerso());
    }
}
