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

    private static final int XP_POR_NIVEL = 500;

    @Inject UserRepository userRepository;
    @Inject ConquistaRepository conquistaRepository;
    @Inject ConquistaUsuarioRepository conquistaUsuarioRepository;
    @Inject RankingRepository rankingRepository;
    @Inject SyncService syncService;
    @Inject LocalDb localDb;
    @Inject ObjectMapper objectMapper;

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
        LocalDate semana = LocalDate.now().with(DayOfWeek.MONDAY);
        Optional<RankingEntry> entry = rankingRepository.findByUserAndSemana(user.getId(), semana);

        if (entry.isPresent()) {
            entry.get().setXpSemana(entry.get().getXpSemana() + xp);
        } else {
            rankingRepository.persist(RankingEntry.builder()
                    .userId(user.getId())
                    .userName(user.getName())
                    .userAvatarUrl(user.getAvatarUrl())
                    .xpSemana(xp)
                    .semana(semana)
                    .build());
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
