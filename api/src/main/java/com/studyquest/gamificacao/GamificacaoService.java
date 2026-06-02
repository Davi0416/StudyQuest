package com.studyquest.gamificacao;

import com.studyquest.gamificacao.dto.ConquistaResponse;
import com.studyquest.gamificacao.dto.RankingResponse;
import com.studyquest.shared.sync.SyncService;
import com.studyquest.usuarios.User;
import com.studyquest.usuarios.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.IntStream;

@ApplicationScoped
public class GamificacaoService {

    private static final int XP_POR_NIVEL = 500;

    @Inject
    UserRepository userRepository;

    @Inject
    ConquistaRepository conquistaRepository;

    @Inject
    ConquistaUsuarioRepository conquistaUsuarioRepository;

    @Inject
    RankingRepository rankingRepository;

    @Inject
    SyncService syncService;

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
        // se ultima == hoje, não faz nada

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
            RankingEntry novo = RankingEntry.builder()
                    .userId(user.getId())
                    .userName(user.getName())
                    .userAvatarUrl(user.getAvatarUrl())
                    .xpSemana(xp)
                    .semana(semana)
                    .build();
            rankingRepository.persist(novo);
        }
    }

    private void verificarConquistas(User user) {
        List<Conquista> todas = conquistaRepository.listAll();
        for (Conquista c : todas) {
            if (!conquistaUsuarioRepository.jaDesbloqueou(user.getId(), c.getId())) {
                if (avaliarCriterio(c.getCriterio(), user)) {
                    ConquistaUsuario cu = ConquistaUsuario.builder()
                            .userId(user.getId())
                            .conquistaId(c.getId())
                            .build();
                    conquistaUsuarioRepository.persist(cu);
                    syncService.enqueue(user.getId(), "BADGE_UNLOCKED", Map.of("conquistaId", c.getId()));
                }
            }
        }
    }

    private boolean avaliarCriterio(String criterio, User user) {
        if (criterio == null) return false;
        // avaliação simples de critérios pré-definidos
        return switch (criterio) {
            case "xp_total >= 500" -> user.getTotalXp() >= 500;
            case "xp_total >= 1000" -> user.getTotalXp() >= 1000;
            case "streak >= 7" -> user.getCurrentStreak() >= 7;
            case "streak >= 30" -> user.getCurrentStreak() >= 30;
            default -> false;
        };
    }

    public List<ConquistaResponse> conquistas(UUID userId) {
        List<Conquista> todas = conquistaRepository.listAll();
        List<ConquistaUsuario> desbloqueadas = conquistaUsuarioRepository.findByUser(userId);

        Map<Long, ConquistaUsuario> desbloqueadasMap = new java.util.HashMap<>();
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
                .findFirst()
                .orElse(null);

        return new RankingResponse(items, posicaoAtual);
    }
}
