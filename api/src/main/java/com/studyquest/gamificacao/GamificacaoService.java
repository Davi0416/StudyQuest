package com.studyquest.gamificacao;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyquest.gamificacao.dto.ConquistaResponse;
import com.studyquest.gamificacao.dto.RankingResponse;
import com.studyquest.offline.RankingCache;
import com.studyquest.shared.db.LocalDb;
import com.studyquest.shared.sync.SyncService;
import com.studyquest.usuarios.User;
import com.studyquest.usuarios.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.IntStream;

@ApplicationScoped
public class GamificacaoService {

    private static final Logger LOG = Logger.getLogger(GamificacaoService.class);
    private static final int XP_POR_NIVEL = 500;

    @Inject UserRepository userRepository;
    @Inject ConquistaRepository conquistaRepository;
    @Inject ConquistaUsuarioRepository conquistaUsuarioRepository;
    @Inject RankingRepository rankingRepository;
    @Inject SyncService syncService;
    @Inject LocalDb localDb;
    @Inject ObjectMapper objectMapper;

    @ConfigProperty(name = "studyquest.neon.ranking.url", defaultValue = "")
    String neonRankingUrl;

    @ConfigProperty(name = "studyquest.neon.ranking.user", defaultValue = "")
    String neonRankingUser;

    @ConfigProperty(name = "studyquest.neon.ranking.password", defaultValue = "")
    String neonRankingPassword;

    @Transactional
    public void concederXp(UUID userId, int xp) {
        User user = userRepository.findById(userId);
        if (user == null) return;

        user.setTotalXp(user.getTotalXp() + xp);

        int novoNivel = (user.getTotalXp() / XP_POR_NIVEL) + 1;
        if (novoNivel > user.getLvl()) {
            user.setLvl(novoNivel);
        }

        atualizarStreak(user);
        atualizarRankingSemanal(user, xp);
        verificarConquistas(user);

        syncService.enqueue(userId, "XP_GAINED", Map.of("xp", xp, "totalXp", user.getTotalXp()));
    }

    private void atualizarStreak(User user) {
        LocalDate hoje = LocalDate.now();
        LocalDate ultima = user.getLastActivityDate();

        if (ultima == null || ultima.isBefore(hoje.minusDays(1))) {
            user.setCurrentStreak(1);
        } else if (ultima.equals(hoje.minusDays(1))) {
            user.setCurrentStreak(user.getCurrentStreak() + 1);
        }

        if (user.getCurrentStreak() > user.getMaxStreak()) {
            user.setMaxStreak(user.getCurrentStreak());
        }
        user.setLastActivityDate(hoje);
    }

    private void atualizarRankingSemanal(User user, int xp) {
        try {
            LocalDate semana = LocalDate.now().with(DayOfWeek.MONDAY);
            Optional<RankingEntry> existing = rankingRepository.findByUserAndSemana(user.getId(), semana);
            int novoTotal;
            if (existing.isPresent()) {
                RankingEntry e = existing.get();
                e.setXpSemana(e.getXpSemana() + xp);
                e.setUserName(user.getName());
                e.setUserAvatarUrl(user.getAvatarUrl());
                novoTotal = e.getXpSemana();
            } else {
                rankingRepository.persist(RankingEntry.builder()
                    .userId(user.getId())
                    .userName(user.getName())
                    .userAvatarUrl(user.getAvatarUrl())
                    .xpSemana(xp)
                    .semana(semana)
                    .build());
                novoTotal = xp;
            }
            sincronizarXpNeon(user, semana, novoTotal, user.getTotalXp());
        } catch (Exception e) {
            LOG.warnf(e, "Falha ao atualizar ranking semanal para userId=%s", user.getId());
        }
    }

    /**
     * Faz upsert do XP semanal do usuário no Neon PostgreSQL para que apareça
     * no ranking global visto por todos os usuários desktop.
     */
    private void sincronizarXpNeon(User user, LocalDate semana, int xpSemana, int xpTotal) {
        if (neonRankingUrl.isBlank()) return;
        String sql = """
                INSERT INTO ranking_semanal (userid, username, useravatarurl, xpsemana, semana, xptotal)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (userid, semana)
                DO UPDATE SET xpsemana = EXCLUDED.xpsemana,
                              xptotal = EXCLUDED.xptotal,
                              username = EXCLUDED.username,
                              useravatarurl = EXCLUDED.useravatarurl
                """;
        try (Connection conn = DriverManager.getConnection(neonRankingUrl, neonRankingUser, neonRankingPassword);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setObject(1, user.getId());
            ps.setString(2, user.getName());
            ps.setString(3, user.getAvatarUrl());
            ps.setInt(4, xpSemana);
            ps.setObject(5, semana);
            ps.setInt(6, xpTotal);
            ps.setQueryTimeout(5);
            ps.executeUpdate();
        } catch (Exception ignored) {
            // Falha silenciosa — offline ou Neon indisponível
        }
    }

    private void verificarConquistas(User user) {
        List<Conquista> todas = conquistaRepository.listAll();
        for (Conquista c : todas) {
            if (!conquistaUsuarioRepository.jaDesbloqueou(user.getId(), c.getId())) {
                if (avaliarCriterio(c.getCriterio(), user)) {
                    conquistaUsuarioRepository.persist(ConquistaUsuario.builder()
                            .userId(user.getId())
                            .conquistaId(c.getId())
                            .build());
                    syncService.enqueue(user.getId(), "BADGE_UNLOCKED", Map.of("conquistaId", c.getId()));
                }
            }
        }
    }

    private boolean avaliarCriterio(String criterio, User user) {
        if (criterio == null) return false;
        return switch (criterio) {
            case "xp_total >= 500"  -> user.getTotalXp() >= 500;
            case "xp_total >= 1000" -> user.getTotalXp() >= 1000;
            case "streak >= 7"      -> user.getCurrentStreak() >= 7;
            case "streak >= 30"     -> user.getCurrentStreak() >= 30;
            default -> false;
        };
    }

    public List<ConquistaResponse> conquistas(UUID userId) {
        List<Conquista> todas = conquistaRepository.listAll();
        List<ConquistaUsuario> desbloqueadas = conquistaUsuarioRepository.findByUser(userId);

        Map<Long, ConquistaUsuario> desbloqueadasMap = new HashMap<>();
        for (ConquistaUsuario cu : desbloqueadas) {
            desbloqueadasMap.put(cu.getConquistaId(), cu);
        }

        return todas.stream().map(c -> {
            ConquistaUsuario cu = desbloqueadasMap.get(c.getId());
            return cu != null
                    ? ConquistaResponse.desbloqueada(c, cu.getDesbloqueadaEm())
                    : ConquistaResponse.naoDesbloqueada(c);
        }).toList();
    }

    public RankingResponse rankingSemanal(UUID userId) {
        LocalDate semana = LocalDate.now().with(DayOfWeek.MONDAY);

        // Tenta Neon primeiro — retorna ranking global com todos os jogadores
        if (!neonRankingUrl.isBlank()) {
            // Garante que o XP local do usuário está no Neon antes de ler
            sincronizarXpLocalParaNeon(userId, semana);

            List<Map<String, Object>> neonData = fetchTop10FromNeon(semana);
            if (neonData != null) {
                List<RankingResponse.RankingItem> items = new ArrayList<>();
                for (int i = 0; i < neonData.size(); i++) {
                    Map<String, Object> row = neonData.get(i);
                    String rowUserId = (String) row.get("userId");
                    items.add(new RankingResponse.RankingItem(
                            i + 1,
                            (String) row.get("userName"),
                            (String) row.get("avatarUrl"),
                            ((Number) row.get("xpSemana")).intValue(),
                            userId.toString().equals(rowUserId)));
                }
                RankingResponse.RankingItem posicaoAtual = items.stream()
                        .filter(RankingResponse.RankingItem::isCurrentUser)
                        .findFirst().orElse(null);
                updateRankingCacheRaw(semana, neonData);
                return new RankingResponse(items, posicaoAtual, false, null);
            }
        }

        // Fallback: datasource local (dev/neon direto) ou cache SQLite
        try {
            List<RankingEntry> top10 = rankingRepository.top10Semana(semana);

            List<RankingResponse.RankingItem> items = IntStream.range(0, top10.size())
                    .mapToObj(i -> {
                        RankingEntry e = top10.get(i);
                        return new RankingResponse.RankingItem(
                                i + 1, e.getUserName(), e.getUserAvatarUrl(),
                                e.getXpSemana(), e.getUserId().equals(userId));
                    }).toList();

            RankingResponse.RankingItem posicaoAtual = items.stream()
                    .filter(RankingResponse.RankingItem::isCurrentUser)
                    .findFirst().orElse(null);

            RankingResponse response = new RankingResponse(items, posicaoAtual, false, null);
            updateRankingCache(semana, top10);
            return response;

        } catch (Exception e) {
            return loadRankingFromCache(semana, userId);
        }
    }

    /**
     * Sincroniza o XP semanal do usuário do SQLite local para o Neon.
     * Chamado antes de ler o ranking para garantir que o usuário já aparece.
     */
    private void sincronizarXpLocalParaNeon(UUID userId, LocalDate semana) {
        try {
            Optional<RankingEntry> local = rankingRepository.findByUserAndSemana(userId, semana);
            if (local.isEmpty()) return; // usuário não tem XP esta semana

            RankingEntry e = local.get();
            User user = userRepository.findById(userId);
            if (user == null) return;
            sincronizarXpNeon(user, semana, e.getXpSemana(), user.getTotalXp());
        } catch (Exception ignored) {}
    }

    /**
     * Busca o top-10 diretamente do Neon PostgreSQL via JDBC (sem datasource configurado).
     * Retorna null em caso de falha (sem conexão, timeout, etc.).
     */
    private List<Map<String, Object>> fetchTop10FromNeon(LocalDate semana) {
        String sql = """
                SELECT userid, username, useravatarurl, xpsemana
                FROM ranking_semanal
                WHERE semana = ?
                ORDER BY xpsemana DESC
                LIMIT 10
                """;
        try (Connection conn = DriverManager.getConnection(neonRankingUrl, neonRankingUser, neonRankingPassword);
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setObject(1, semana);
            ps.setQueryTimeout(5); // não trava a UI por mais de 5s

            List<Map<String, Object>> result = new ArrayList<>();
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> row = new HashMap<>();
                    row.put("userId",   rs.getString("userid"));
                    row.put("userName", rs.getString("username"));
                    row.put("avatarUrl", rs.getString("useravatarurl"));
                    row.put("xpSemana", rs.getInt("xpsemana"));
                    result.add(row);
                }
            }
            return result;

        } catch (Exception ex) {
            // Sem internet ou Neon indisponível — silencioso, usa fallback
            return null;
        }
    }

    private void updateRankingCacheRaw(LocalDate semana, List<Map<String, Object>> data) {
        try {
            String json = objectMapper.writeValueAsString(data);
            String semanaStr = semana.toString();
            localDb.write(em -> {
                em.createQuery("DELETE FROM RankingCache rc WHERE rc.semana = :s")
                        .setParameter("s", semanaStr)
                        .executeUpdate();
                em.persist(RankingCache.builder()
                        .semana(semanaStr)
                        .dataJson(json)
                        .build());
            });
        } catch (Exception ignored) {}
    }

    // ---- Cache de ranking no SQLite ----

    private void updateRankingCache(LocalDate semana, List<RankingEntry> entries) {
        try {
            List<Map<String, Object>> data = entries.stream().map(e -> {
                Map<String, Object> m = new HashMap<>();
                m.put("userId", e.getUserId().toString());
                m.put("userName", e.getUserName() != null ? e.getUserName() : "");
                m.put("avatarUrl", e.getUserAvatarUrl());
                m.put("xpSemana", e.getXpSemana());
                return m;
            }).toList();

            String json = objectMapper.writeValueAsString(data);
            String semanaStr = semana.toString();

            localDb.write(em -> {
                em.createQuery("DELETE FROM RankingCache rc WHERE rc.semana = :s")
                        .setParameter("s", semanaStr)
                        .executeUpdate();
                em.persist(RankingCache.builder()
                        .semana(semanaStr)
                        .dataJson(json)
                        .build());
            });
        } catch (Exception ignored) {
            // Silent — cache é best-effort
        }
    }

    @SuppressWarnings("unchecked")
    private RankingResponse loadRankingFromCache(LocalDate semana, UUID userId) {
        String semanaStr = semana.toString();

        RankingCache cache = localDb.read(em ->
                em.createQuery("SELECT rc FROM RankingCache rc WHERE rc.semana = :s", RankingCache.class)
                        .setParameter("s", semanaStr)
                        .setMaxResults(1)
                        .getResultStream().findFirst().orElse(null));

        if (cache == null) {
            return new RankingResponse(List.of(), null, true, null);
        }

        try {
            List<Map<String, Object>> data = objectMapper.readValue(cache.getDataJson(), List.class);

            List<RankingResponse.RankingItem> items = new ArrayList<>();
            for (int i = 0; i < data.size(); i++) {
                Map<String, Object> entry = data.get(i);
                String entryUserId = (String) entry.get("userId");
                boolean isCurrent = entryUserId != null && entryUserId.equals(userId.toString());
                items.add(new RankingResponse.RankingItem(
                        i + 1,
                        (String) entry.get("userName"),
                        (String) entry.get("avatarUrl"),
                        ((Number) entry.get("xpSemana")).intValue(),
                        isCurrent));
            }

            RankingResponse.RankingItem posicaoAtual = items.stream()
                    .filter(RankingResponse.RankingItem::isCurrentUser).findFirst().orElse(null);

            return new RankingResponse(items, posicaoAtual, true,
                    cache.getCachedAt().toInstant(ZoneOffset.UTC));

        } catch (Exception e) {
            return new RankingResponse(List.of(), null, true, null);
        }
    }
}
