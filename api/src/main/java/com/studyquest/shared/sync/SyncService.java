package com.studyquest.shared.sync;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyquest.local.SyncEvent;
import io.quarkus.hibernate.orm.PersistenceUnit;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class SyncService {

    @Inject
    @PersistenceUnit("local")
    EntityManager localEm;

    @Inject
    ObjectMapper objectMapper;

    @Transactional
    public void enqueue(UUID userId, String eventType, Map<String, Object> payload) {
        try {
            SyncEvent event = SyncEvent.builder()
                    .userId(userId)
                    .eventType(eventType)
                    .payload(objectMapper.writeValueAsString(payload))
                    .build();
            localEm.persist(event);
        } catch (Exception e) {
            // falha silenciosa — não pode comprometer a operação principal
        }
    }
}
