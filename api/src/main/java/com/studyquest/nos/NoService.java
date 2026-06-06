package com.studyquest.nos;

import com.studyquest.flashcards.FlashcardRepository;
import com.studyquest.gamificacao.GamificacaoService;
import com.studyquest.missoes.MissaoRepository;
import com.studyquest.offline.UserNo;
import com.studyquest.nos.dto.NoResponse;
import com.studyquest.revisao.RevisaoService;
import com.studyquest.shared.db.LocalDb;
import com.studyquest.shared.exception.NoBloqueadoException;
import com.studyquest.shared.exception.RecursoNaoEncontradoException;
import com.studyquest.shared.sync.SyncService;
import com.studyquest.usuarios.User;
import com.studyquest.usuarios.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.jboss.logging.Logger;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class NoService {

    private static final Logger LOG = Logger.getLogger(NoService.class);

    @Inject
    NoRepository noRepository;

    @Inject
    MissaoRepository missaoRepository;

    @Inject
    FlashcardRepository flashcardRepository;

    @Inject
    RevisaoService revisaoService;

    @Inject
    LocalDb localDb;

    @Inject
    SyncService syncService;

    @Inject
    GamificacaoService gamificacaoService;

    @Inject
    UserRepository userRepository;

    public List<NoResponse> listarPorTrilha(Long trilhaId, UUID userId) {
        return noRepository.findByTrilha(trilhaId).stream()
                .map(no -> NoResponse.of(no, calcularStatus(no, userId), temMissao(no.getId())))
                .toList();
    }

    public NoResponse detalhe(Long noId, UUID userId) {
        No no = noRepository.findById(noId);
        if (no == null) throw new RecursoNaoEncontradoException("Nó não encontrado");

        return NoResponse.of(no, calcularStatus(no, userId), temMissao(noId));
    }

    public NoResponse iniciar(Long noId, UUID userId) {
        No no = noRepository.findById(noId);
        if (no == null) throw new RecursoNaoEncontradoException("Nó não encontrado");

        validarPrerequisitos(no, userId);

        localDb.write(em -> {
            UserNo userNo = findUserNo(em, userId, noId).orElse(
                    UserNo.builder().userId(userId).noId(noId).build()
            );

            if (!"CONCLUIDO".equals(userNo.getStatus())) {
                userNo.setStatus("EM_PROGRESSO");
                userNo.setIniciadoEm(LocalDateTime.now());
                if (userNo.getId() == null) em.persist(userNo);
            }
        });

        return NoResponse.of(no, calcularStatus(no, userId), temMissao(noId));
    }

    public NoResponse concluir(Long noId, UUID userId) {
        No no = noRepository.findById(noId);
        if (no == null) throw new RecursoNaoEncontradoException("Nó não encontrado");

        localDb.write(em -> {
            UserNo userNo = findUserNo(em, userId, noId)
                    .orElseThrow(() -> new NoBloqueadoException("Inicie o nó antes de concluir"));

            if (!"EM_PROGRESSO".equals(userNo.getStatus())) {
                throw new NoBloqueadoException("Nó não está em progresso");
            }

            userNo.setStatus("CONCLUIDO");
            userNo.setConcluidoEm(LocalDateTime.now());

            String uidHexC = userId.toString().replace("-", "").toUpperCase();
            @SuppressWarnings("unchecked")
            java.util.List<com.studyquest.offline.UserTrilha> uts = em.createNativeQuery(
                    "SELECT * FROM user_trilhas WHERE hex(userId) = :uid AND trilhaId = :tid",
                    com.studyquest.offline.UserTrilha.class)
                .setParameter("uid", uidHexC)
                .setParameter("tid", no.getTrilhaId())
                .setMaxResults(1)
                .getResultList();
            if (!uts.isEmpty()) {
                com.studyquest.offline.UserTrilha ut = uts.get(0);
                ut.setNosConcluidosCount(ut.getNosConcluidosCount() + 1);
                ut.setXpGanho(ut.getXpGanho() + no.getXpRecompensa());
            }
        });

        // Concede XP, atualiza streak e ranking imediatamente (datasource PostgreSQL).
        // Envolto em try/catch: se o XP falhar (ex: DB indisponível), o nó permanece
        // CONCLUIDO no SQLite e o endpoint não retorna 500 para o frontend.
        try {
            gamificacaoService.concederXp(userId, no.getXpRecompensa());
        } catch (Exception e) {
            LOG.errorf(e, "Falha ao conceder XP para userId=%s noId=%d", userId, noId);
        }

        syncService.enqueue(userId, "NODE_COMPLETED", Map.of(
                "noId", noId,
                "xp", no.getXpRecompensa()
        ));

        flashcardRepository.findByFiltros(no.getTrilhaId(), noId).forEach(f ->
                revisaoService.adicionarCard(userId, f.getId())
        );

        User updatedUser = userRepository.findById(userId);
        int novoTotalXp = updatedUser != null ? updatedUser.getTotalXp() : 0;
        int novoStreak  = updatedUser != null ? updatedUser.getCurrentStreak() : 0;

        return NoResponse.ofConcluido(no, temMissao(noId), no.getXpRecompensa(), novoTotalXp, novoStreak);
    }

    private boolean temMissao(Long noId) {
        return missaoRepository.findByNoId(noId).isPresent();
    }

    private String calcularStatus(No no, UUID userId) {
        Optional<UserNo> userNo = findUserNo(userId, no.getId());
        if (userNo.isPresent()) {
            return userNo.get().getStatus();
        }
        return prerequisitosConcluidos(no, userId) ? "DISPONIVEL" : "BLOQUEADO";
    }

    private boolean prerequisitosConcluidos(No no, UUID userId) {
        for (No prereq : no.getPrerequisitos()) {
            boolean concluido = findUserNo(userId, prereq.getId())
                    .map(un -> "CONCLUIDO".equals(un.getStatus()))
                    .orElse(false);
            if (!concluido) return false;
        }
        return true;
    }

    private void validarPrerequisitos(No no, UUID userId) {
        for (No prereq : no.getPrerequisitos()) {
            boolean concluido = findUserNo(userId, prereq.getId())
                    .map(un -> "CONCLUIDO".equals(un.getStatus()))
                    .orElse(false);

            if (!concluido) {
                throw new NoBloqueadoException("Pré-requisitos não concluídos: " + prereq.getTitulo());
            }
        }
    }

    private Optional<UserNo> findUserNo(UUID userId, Long noId) {
        return localDb.read(em -> findUserNo(em, userId, noId));
    }

    @SuppressWarnings("unchecked")
    private Optional<UserNo> findUserNo(EntityManager em, UUID userId, Long noId) {
        String uidHex = userId.toString().replace("-", "").toUpperCase();
        List<UserNo> results = (List<UserNo>) em.createNativeQuery(
                        "SELECT * FROM user_nos WHERE hex(userId) = :uid AND noId = :nid",
                        UserNo.class)
                .setParameter("uid", uidHex)
                .setParameter("nid", noId)
                .setMaxResults(1)
                .getResultList();
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }
}
