package com.studyquest.shared.sync;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyquest.offline.SyncEvent;
import com.studyquest.shared.db.LocalDb;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class SyncService {

    @Inject
    LocalDb localDb;

    @Inject
    ObjectMapper objectMapper;

    public void enqueue(UUID userId, String eventType, Map<String, Object> payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            localDb.write(em -> em.persist(SyncEvent.builder()
                    .userId(userId)
                    .eventType(eventType)
                    .payload(json)
                    .build()));
        } catch (Exception e) {
            // falha silenciosa — não pode comprometer a operação principal
        }
    }
}
