package com.studyquest.shared.sync;

import com.studyquest.offline.SyncEvent;
import com.studyquest.shared.db.LocalDb;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.LocalDateTime;
import java.util.List;

@ApplicationScoped
public class SyncJob {

    @Inject
    LocalDb localDb;

    @Scheduled(every = "5m")
    public void sync() {
        List<SyncEvent> pending = localDb.read(em -> em
                .createQuery("SELECT e FROM SyncEvent e WHERE e.processed = false ORDER BY e.createdAt", SyncEvent.class)
                .setMaxResults(100)
                .getResultList());

        for (SyncEvent event : pending) {
            try {
                processSyncEvent(event);
                localDb.write(em -> {
                    SyncEvent managed = em.find(SyncEvent.class, event.getId());
                    if (managed != null) {
                        managed.setProcessed(true);
                        managed.setProcessedAt(LocalDateTime.now());
                    }
                });
            } catch (Exception ignored) {
                // será retentado no próximo ciclo
            }
        }
    }

    private void processSyncEvent(SyncEvent event) {
        // implementação futura: sincronizar com PostgreSQL remoto
    }
}
