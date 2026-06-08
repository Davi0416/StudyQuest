package com.studyquest.gamificacao;

import com.studyquest.gamificacao.dto.ConquistaResponse;
import com.studyquest.gamificacao.dto.RankingResponse;
import com.studyquest.shared.sync.SyncService;
import com.studyquest.usuarios.User;
import com.studyquest.usuarios.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Responsável apenas por XP, streak e conquistas.
 * Ranking remoto → NeonRankingService. Cache local → RankingCacheStore.
 */
@ApplicationScoped
public class GamificacaoService {

    private static final Logger LOG = Logger.getLogger(GamificacaoService.class);
    private static final int XP_POR_NIVEL = 500;

    @Inject UserRepository userRepository;
    @Inject ConquistaRepository conquistaRepository;
    @Inject ConquistaUsuarioRepository conquistaUsuarioRepository;
    @Inject RankingRepository rankingRepository;
    @Inject SyncService syncService;
    @Inject NeonRankingService neonRankingService;
    @Inject RankingCacheStore rankingCacheStore;

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
        int xpSemana = atualizarRankingSemanal(user, xp);
        verificarConquistas(user);

        syncService.enqueue(userId, "XP_GAINED", Map.of("xp", xp, "totalXp", user.getTotalXp()));

        // Fire-and-forget após commit local — falhas de rede não afetam o XP do usuário
        neonRankingService.upsertAsync(
                userId, user.getName(), user.getAvatarUrl(),
                LocalDate.now().with(DayOfWeek.MONDAY), xpSemana, user.getTotalXp());
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
            List<RankingEntry> top10;
            try {
                top10 = neonRankingService.getTop10Semana(semana);
                if (top10.isEmpty()) {
                    top10 = rankingRepository.top10Semana(semana);
                }
            } catch (Exception e) {
                LOG.warn("Falha ao buscar ranking global, caindo para ranking local", e);
                top10 = rankingRepository.top10Semana(semana);
            }

            final List<RankingEntry> finalTop10 = top10;

            List<RankingResponse.RankingItem> items = IntStream.range(0, finalTop10.size())
                    .mapToObj(i -> {
                        RankingEntry e = finalTop10.get(i);
                        return new RankingResponse.RankingItem(
                                i + 1, e.getUserName(), e.getUserAvatarUrl(),
                                e.getXpSemana(), e.getUserId().equals(userId));
                    }).toList();

            RankingResponse.RankingItem posicaoAtual = items.stream()
                    .filter(RankingResponse.RankingItem::isCurrentUser)
                    .findFirst().orElse(null);

            rankingCacheStore.salvar(semana, top10);
            return new RankingResponse(items, posicaoAtual, false, null);

        } catch (Exception e) {
            return rankingCacheStore.carregar(semana, userId);
        }
    }

    // ---- privados ----

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

    private int atualizarRankingSemanal(User user, int xp) {
        try {
            LocalDate semana = LocalDate.now().with(DayOfWeek.MONDAY);
            Optional<RankingEntry> existing = rankingRepository.findByUserAndSemana(user.getId(), semana);
            if (existing.isPresent()) {
                RankingEntry e = existing.get();
                e.setXpSemana(e.getXpSemana() + xp);
                e.setUserName(user.getName());
                e.setUserAvatarUrl(user.getAvatarUrl());
                return e.getXpSemana();
            } else {
                rankingRepository.persist(RankingEntry.builder()
                        .userId(user.getId())
                        .userName(user.getName())
                        .userAvatarUrl(user.getAvatarUrl())
                        .xpSemana(xp)
                        .semana(semana)
                        .build());
                return xp;
            }
        } catch (Exception e) {
            LOG.warnf(e, "Falha ao atualizar ranking semanal para userId=%s", user.getId());
            return 0;
        }
    }

    private void verificarConquistas(User user) {
        Set<Long> desbloqueadas = conquistaUsuarioRepository.findByUser(user.getId())
                .stream()
                .map(ConquistaUsuario::getConquistaId)
                .collect(Collectors.toCollection(HashSet::new));

        for (Conquista c : conquistaRepository.listAll()) {
            if (!desbloqueadas.contains(c.getId()) && avaliarCriterio(c.getCriterio(), user)) {
                conquistaUsuarioRepository.persist(ConquistaUsuario.builder()
                        .userId(user.getId())
                        .conquistaId(c.getId())
                        .build());
                syncService.enqueue(user.getId(), "BADGE_UNLOCKED", Map.of("conquistaId", c.getId()));
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
}
