package com.studyquest.gamificacao;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyquest.gamificacao.dto.RankingResponse;
import com.studyquest.offline.RankingCache;
import com.studyquest.shared.db.LocalDb;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Persiste e lê o cache local (SQLite) do ranking semanal.
 * Usado como fallback quando o ranking remoto não está disponível.
 */
@ApplicationScoped
public class RankingCacheStore {

    @Inject
    LocalDb localDb;

    @Inject
    ObjectMapper objectMapper;

    public void salvar(LocalDate semana, List<RankingEntry> entries) {
        try {
            List<Map<String, Object>> data = entries.stream().map(e -> {
                Map<String, Object> m = new HashMap<>();
                m.put("userId", e.getUserId().toString());
                m.put("userName", e.getUserName() != null ? e.getUserName() : "");
                m.put("avatarUrl", e.getUserAvatarUrl());
                m.put("xpSemana", e.getXpSemana());
                return m;
            }).toList();
            persist(semana, data);
        } catch (Exception ignored) {}
    }

    public RankingResponse carregar(LocalDate semana, UUID userId) {
        String semanaStr = semana.toString();

        RankingCache cache = localDb.read(em ->
                em.createQuery("SELECT rc FROM RankingCache rc WHERE rc.semana = :s", RankingCache.class)
                        .setParameter("s", semanaStr)
                        .setMaxResults(1)
                        .getResultStream().findFirst().orElse(null));

        if (cache == null) return new RankingResponse(List.of(), null, true, null);

        try {
            @SuppressWarnings("unchecked")
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

    private void persist(LocalDate semana, List<Map<String, Object>> data) {
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
}
