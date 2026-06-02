package com.studyquest.nos;

import com.studyquest.local.UserNo;
import com.studyquest.nos.dto.NoResponse;
import com.studyquest.shared.exception.NoBloqueadoException;
import com.studyquest.shared.exception.RecursoNaoEncontradoException;
import com.studyquest.shared.sync.SyncService;
import io.quarkus.hibernate.orm.PersistenceUnit;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class NoService {

    @Inject
    NoRepository noRepository;

    @Inject
    @PersistenceUnit("local")
    EntityManager localEm;

    @Inject
    SyncService syncService;

    public NoResponse detalhe(Long noId, UUID userId) {
        No no = noRepository.findById(noId);
        if (no == null) throw new RecursoNaoEncontradoException("Nó não encontrado");

        String status = findUserNo(userId, noId)
                .map(UserNo::getStatus)
                .orElse("BLOQUEADO");

        return NoResponse.of(no, status);
    }

    @Transactional
    public NoResponse iniciar(Long noId, UUID userId) {
        No no = noRepository.findById(noId);
        if (no == null) throw new RecursoNaoEncontradoException("Nó não encontrado");

        validarPrerequisitos(no, userId);

        UserNo userNo = findUserNo(userId, noId).orElse(
                UserNo.builder().userId(userId).noId(noId).build()
        );

        if ("CONCLUIDO".equals(userNo.getStatus())) {
            return NoResponse.of(no, "CONCLUIDO");
        }

        userNo.setStatus("EM_PROGRESSO");
        userNo.setIniciadoEm(LocalDateTime.now());

        if (userNo.getId() == null) localEm.persist(userNo);

        return NoResponse.of(no, "EM_PROGRESSO");
    }

    @Transactional
    public NoResponse concluir(Long noId, UUID userId) {
        No no = noRepository.findById(noId);
        if (no == null) throw new RecursoNaoEncontradoException("Nó não encontrado");

        UserNo userNo = findUserNo(userId, noId)
                .orElseThrow(() -> new NoBloqueadoException("Inicie o nó antes de concluir"));

        if (!"EM_PROGRESSO".equals(userNo.getStatus())) {
            throw new NoBloqueadoException("Nó não está em progresso");
        }

        userNo.setStatus("CONCLUIDO");
        userNo.setConcluidoEm(LocalDateTime.now());

        syncService.enqueue(userId, "NODE_COMPLETED", Map.of(
                "noId", noId,
                "xp", no.getXpRecompensa()
        ));

        return NoResponse.of(no, "CONCLUIDO");
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
        return localEm.createQuery(
                        "SELECT un FROM UserNo un WHERE un.userId = :uid AND un.noId = :nid",
                        UserNo.class)
                .setParameter("uid", userId)
                .setParameter("nid", noId)
                .getResultStream()
                .findFirst();
    }
}
