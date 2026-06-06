package com.studyquest.usuarios;

import com.studyquest.missoes.SubmissaoRepository;
import com.studyquest.missoes.MissaoRepository;
import com.studyquest.nos.NoRepository;
import com.studyquest.shared.db.LocalDb;
import com.studyquest.shared.exception.RecursoNaoEncontradoException;
import com.studyquest.usuarios.dto.UserRequestDTO;
import com.studyquest.usuarios.dto.UserResponseDTO;
import com.studyquest.usuarios.dto.UserStatsDTO;
import com.studyquest.usuarios.dto.UpdateProfileRequest;
import io.quarkus.elytron.security.common.BcryptUtil;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class UserService {

    private final UserRepository userRepository;

    @Inject SubmissaoRepository submissaoRepository;
    @Inject MissaoRepository missaoRepository;
    @Inject NoRepository noRepository;
    @Inject LocalDb localDb;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public UserResponseDTO createUser(UserRequestDTO dto) {
        userRepository.findByEmail(dto.email()).ifPresent(u -> {
            throw new WebApplicationException("Email já cadastrado", Response.Status.CONFLICT);
        });

        User user = User.builder()
                .name(dto.name())
                .email(dto.email())
                .passwordHash(BcryptUtil.bcryptHash(dto.password()))
                .avatarUrl(dto.avatarUrl())
                .build();

        userRepository.persist(user);
        return new UserResponseDTO(user);
    }

    public List<UserResponseDTO> listAll() {
        return userRepository.listAll().stream()
                .map(UserResponseDTO::new)
                .toList();
    }

    public UserResponseDTO findById(UUID id) {
        User user = userRepository.findById(id);
        if (user == null) throw new RecursoNaoEncontradoException("Usuário não encontrado");
        return new UserResponseDTO(user);
    }

    public UserResponseDTO me(UUID userId) {
        return findById(userId);
    }

    @Transactional
    public UserResponseDTO updateProfile(UUID userId, UpdateProfileRequest req) {
        User user = userRepository.findById(userId);
        if (user == null) throw new RecursoNaoEncontradoException("Usuário não encontrado");

        if (req.name() != null) user.setName(req.name());
        if (req.avatarUrl() != null) user.setAvatarUrl(req.avatarUrl());

        return new UserResponseDTO(user);
    }

    public UserStatsDTO stats(UUID userId) {
        userRepository.findById(userId); // valida existência

        LocalDate hoje = LocalDate.now();
        LocalDateTime inicioDia = hoje.atStartOfDay();
        LocalDateTime inicioSemana = hoje.with(DayOfWeek.MONDAY).atStartOfDay();

        // Missões concluídas (datasource principal)
        long missoesConcluidas = submissaoRepository.countConcluidas(userId);
        long missoesConcluidasSemana = submissaoRepository.countConcluidasDesde(userId, inicioSemana);
        long totalMissoes = missaoRepository.count();
        long missoesPendentes = Math.max(0, totalMissoes - missoesConcluidas);

        // Flashcards dominados (caixa 5 no Leitner — SQLite local)
        long flashcardsDominados = localDb.read(em ->
            em.createQuery("SELECT COUNT(l) FROM LeitnerCard l WHERE l.userId = :uid AND l.caixa = 5", Long.class)
            .setParameter("uid", userId)
            .getSingleResult());

        long flashcardsDominadosHoje = localDb.read(em ->
            em.createQuery("SELECT COUNT(l) FROM LeitnerCard l WHERE l.userId = :uid AND l.caixa = 5 AND l.ultimaRevisao = :hoje", Long.class)
            .setParameter("uid", userId)
            .setParameter("hoje", hoje)
            .getSingleResult());

        // XP hoje: nós concluídos hoje no SQLite local → busca xpRecompensa no datasource principal
        int xpHoje = 0;
        try {
            List<Long> nosHoje = localDb.read(em ->
                em.createQuery("SELECT un.noId FROM UserNo un WHERE un.userId = :uid AND un.status = 'CONCLUIDO' AND un.concluidoEm >= :inicio", Long.class)
                .setParameter("uid", userId)
                .setParameter("inicio", inicioDia)
                .getResultList());

            if (!nosHoje.isEmpty()) {
                Long xp = noRepository.getEntityManager()
                    .createQuery("SELECT SUM(n.xpRecompensa) FROM No n WHERE n.id IN :ids", Long.class)
                    .setParameter("ids", nosHoje)
                    .getSingleResult();
                xpHoje = xp != null ? xp.intValue() : 0;
            }
        } catch (Exception ignored) {}

        return new UserStatsDTO(missoesConcluidas, missoesConcluidasSemana, missoesPendentes,
                flashcardsDominados, flashcardsDominadosHoje, xpHoje);
    }
}
