package com.studyquest.shared.sync;

import com.studyquest.offline.SyncEvent;
import com.studyquest.shared.db.LocalDb;
import io.quarkus.runtime.StartupEvent;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;

import java.time.LocalDateTime;
import java.util.List;

@ApplicationScoped
public class SyncJob {

    private static final int MAX_RETRIES = 5;
    private static final int BATCH_SIZE = 100;

    @Inject
    LocalDb localDb;

    /**
     * Na inicialização: reseta eventos travados em PROCESSING (crash recovery)
     * e migra eventos legados (status null) para PENDING/DONE.
     */
    void onStart(@Observes StartupEvent ev) {
        recoverStuckEvents();
        migrateLegacyEvents();
    }

    @Scheduled(every = "5m")
    public void sync() {
        List<SyncEvent> pending = localDb.read(em -> em
                .createQuery(
                        "SELECT e FROM SyncEvent e WHERE e.status = :s OR e.status IS NULL ORDER BY e.createdAt",
                        SyncEvent.class)
                .setParameter("s", SyncStatus.PENDING)
                .setMaxResults(BATCH_SIZE)
                .getResultList());

        if (pending.isEmpty()) return;

        for (SyncEvent event : pending) {
            markProcessing(event.getId());
            try {
                processSyncEvent(event);
                markDone(event.getId());
            } catch (Exception e) {
                markFailed(event.getId());
            }
        }
    }

    // ---- Máquina de estados ----

    private void markProcessing(Long id) {
        localDb.write(em -> {
            SyncEvent e = em.find(SyncEvent.class, id);
            if (e != null) {
                e.setStatus(SyncStatus.PROCESSING);
                e.setLastAttemptAt(LocalDateTime.now());
            }
        });
    }

    private void markDone(Long id) {
        localDb.write(em -> {
            SyncEvent e = em.find(SyncEvent.class, id);
            if (e != null) {
                e.setStatus(SyncStatus.DONE);
                e.setProcessed(true); // backward compat
                e.setProcessedAt(LocalDateTime.now());
            }
        });
    }

    private void markFailed(Long id) {
        localDb.write(em -> {
            SyncEvent e = em.find(SyncEvent.class, id);
            if (e == null) return;
            int retries = e.getRetryCount() + 1;
            e.setRetryCount(retries);
            e.setStatus(retries >= MAX_RETRIES ? SyncStatus.FAILED : SyncStatus.PENDING);
        });
    }

    // ---- Recuperação e migração ----

    private void recoverStuckEvents() {
        localDb.write(em ->
                em.createQuery(
                                "UPDATE SyncEvent e SET e.status = :pending WHERE e.status = :processing")
                        .setParameter("pending", SyncStatus.PENDING)
                        .setParameter("processing", SyncStatus.PROCESSING)
                        .executeUpdate());
    }

    private void migrateLegacyEvents() {
        localDb.write(em ->
                em.createQuery(
                                "UPDATE SyncEvent e SET e.status = :pending WHERE e.status IS NULL AND e.processed = false")
                        .setParameter("pending", SyncStatus.PENDING)
                        .executeUpdate());
        localDb.write(em ->
                em.createQuery(
                                "UPDATE SyncEvent e SET e.status = :done WHERE e.status IS NULL AND e.processed = true")
                        .setParameter("done", SyncStatus.DONE)
                        .executeUpdate());
    }

    // ---- Processamento ----

    private void processSyncEvent(SyncEvent event) {
        // Stub: quando implementado, chama o endpoint remoto do Neon passando
        // idempotencyKey. O Neon insere em processed_sync_events (unique em
        // idempotency_key) e rejeita silenciosamente se já processado.
        // Ver: db/migrations/postgres/V1__sync_idempotency.sql
        //
        // neonSyncClient.ingest(SyncEventDto.from(event));
        //
        // Em %desktop (sem Neon), lança exceção → evento retorna PENDING até MAX_RETRIES.
        throw new UnsupportedOperationException("Neon sync não configurado neste perfil");
    }
}
