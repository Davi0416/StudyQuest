package com.studyquest.shared.sync;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SyncServiceTest {

    EntityManager localEm;
    SyncService service;

    @BeforeEach
    void setUp() throws Exception {
        localEm = mock(EntityManager.class);
        ObjectMapper mapper = new ObjectMapper();

        service = new SyncService();
        var emField = SyncService.class.getDeclaredField("localEm");
        emField.setAccessible(true);
        emField.set(service, localEm);

        var mapperField = SyncService.class.getDeclaredField("objectMapper");
        mapperField.setAccessible(true);
        mapperField.set(service, mapper);
    }

    @Test
    void enqueue_persisteEvento() {
        service.enqueue(UUID.randomUUID(), "NO_CONCLUIDO", Map.of("noId", 1));
        verify(localEm, times(1)).persist(any());
    }

    @Test
    void enqueue_falhaNoMapper_naoLancaException() {
        // garante que falha silenciosa não propaga
        ObjectMapper mapperQuebrado = mock(ObjectMapper.class, invocation -> {
            throw new RuntimeException("erro de serialização");
        });

        assertDoesNotThrow(() -> {
            var mapperField = SyncService.class.getDeclaredField("objectMapper");
            mapperField.setAccessible(true);
            mapperField.set(service, mapperQuebrado);
            service.enqueue(UUID.randomUUID(), "TIPO", Map.of());
        });
    }
}
