package com.studyquest.flashcards;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class FlashcardRepository implements PanacheRepository<Flashcard> {

    public List<Flashcard> findByFiltros(Long trilhaId, Long noId) {
        if (trilhaId != null && noId != null) {
            return list("trilhaId = ?1 AND noId = ?2", trilhaId, noId);
        } else if (trilhaId != null) {
            return list("trilhaId", trilhaId);
        } else if (noId != null) {
            return list("noId", noId);
        }
        return listAll();
    }

    public void deleteByIdAndUser(Long id, UUID userId) {
        Flashcard f = findById(id);
        if (f != null && userId.equals(f.getCriadoPorUserId())) {
            delete(f);
        }
    }
}
