package com.studyquest.shared.sync;

import com.studyquest.local.SyncEvent;
import io.quarkus.hibernate.orm.PersistenceUnit;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@ApplicationScoped
public class SyncJob {

    @Inject
    @PersistenceUnit("local")
    EntityManager localEm;

    @Scheduled(every = "5m")
    @Transactional
    public void sync() {
        List<SyncEvent> pending = localEm
                .createQuery("SELECT e FROM SyncEvent e WHERE e.processed = false ORDER BY e.createdAt", SyncEvent.class)
                .setMaxResults(100)
                .getResultList();

        for (SyncEvent event : pending) {
            try {
                processSyncEvent(event);
                event.setProcessed(true);
                event.setProcessedAt(LocalDateTime.now());
            } catch (Exception ignored) {
                // será retentado no próximo ciclo
            }
        }
    }

    private void processSyncEvent(SyncEvent event) {
        // aqui viriam as chamadas ao PostgreSQL remoto (Neon)
        // implementação futura: chamar endpoints remotos via REST client
    }
}
