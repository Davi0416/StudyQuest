package com.studyquest.gamificacao;

import io.vertx.core.Vertx;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Sincroniza o XP semanal do usuário no Neon PostgreSQL (ranking global).
 *
 * O upsert é executado de forma assíncrona e fora da transação principal
 * de gamificação — falhas de rede não afetam a concessão de XP local.
 */
@ApplicationScoped
public class NeonRankingService {

    private static final Logger LOG = Logger.getLogger(NeonRankingService.class);

    @Inject
    Vertx vertx;

    @ConfigProperty(name = "studyquest.neon.ranking.url", defaultValue = "")
    String neonUrl;

    @ConfigProperty(name = "studyquest.neon.ranking.user", defaultValue = "")
    String neonUser;

    @ConfigProperty(name = "studyquest.neon.ranking.password", defaultValue = "")
    String neonPassword;

    /**
     * Envia o upsert de XP ao Neon de forma fire-and-forget.
     * Chamado após a transação local de gamificação ser concluída.
     */
    public void upsertAsync(UUID userId, String userName, String avatarUrl,
                             LocalDate semana, int xpSemana, int xpTotal) {
        if (neonUrl.isBlank() || "disabled".equalsIgnoreCase(neonUrl)) return;
        // executeBlocking roda no worker thread pool do Vert.x — não bloqueia o event loop
        // nem a transação principal de gamificação
        vertx.executeBlocking(() -> {
            upsert(userId, userName, avatarUrl, semana, xpSemana, xpTotal);
            return null;
        });
    }

    private void upsert(UUID userId, String userName, String avatarUrl,
                         LocalDate semana, int xpSemana, int xpTotal) {
        String sql = """
                INSERT INTO ranking_semanal (userid, username, useravatarurl, xpsemana, semana, xptotal)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (userid, semana)
                DO UPDATE SET xpsemana      = EXCLUDED.xpsemana,
                              xptotal       = EXCLUDED.xptotal,
                              username      = EXCLUDED.username,
                              useravatarurl = EXCLUDED.useravatarurl
                """;
        try (Connection conn = DriverManager.getConnection(neonUrl, neonUser, neonPassword);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setObject(1, userId);
            ps.setString(2, userName);
            ps.setString(3, avatarUrl);
            ps.setInt(4, xpSemana);
            ps.setObject(5, semana);
            ps.setInt(6, xpTotal);
            ps.setQueryTimeout(5);
            ps.executeUpdate();
        } catch (Exception ex) {
            LOG.debugf(ex, "Falha ao sincronizar ranking no Neon para userId=%s (offline ou Neon indisponível)", userId);
        }
    }
}
