package com.studyquest.usuarios;

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

import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class UserService {

    private final UserRepository userRepository;

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

        String uidStr = userId.toString();

        // Nós concluídos (SQLite local) — métrica principal de progresso
        long missoesConcluidas = ((Number) localDb.read(em ->
            em.createNativeQuery("SELECT COUNT(*) FROM user_nos WHERE userId = :userId AND status = 'CONCLUIDO'")
            .setParameter("userId", uidStr)
            .getSingleResult())).longValue();

        long missoesConcluidasSemana = ((Number) localDb.read(em ->
            em.createNativeQuery("SELECT COUNT(*) FROM user_nos WHERE userId = :userId AND status = 'CONCLUIDO' AND concluidoEm >= :inicio")
            .setParameter("userId", uidStr)
            .setParameter("inicio", Timestamp.valueOf(inicioSemana))
            .getSingleResult())).longValue();

        long totalNos = noRepository.count();
        long missoesPendentes = Math.max(0, totalNos - missoesConcluidas);

        // Flashcards dominados (caixa 5 no Leitner — SQLite local)
        long flashcardsDominados = ((Number) localDb.read(em ->
            em.createNativeQuery("SELECT COUNT(*) FROM leitner_cards WHERE userId = :userId AND caixa = 5")
            .setParameter("userId", uidStr)
            .getSingleResult())).longValue();

        long flashcardsDominadosHoje = ((Number) localDb.read(em ->
            em.createNativeQuery("SELECT COUNT(*) FROM leitner_cards WHERE userId = :userId AND caixa = 5 AND ultimaRevisao = :hoje")
            .setParameter("userId", uidStr)
            .setParameter("hoje", hoje.toString())
            .getSingleResult())).longValue();

        // XP hoje: nós concluídos hoje no SQLite local → busca xpRecompensa no datasource principal
        int xpHoje = 0;
        try {
            @SuppressWarnings("unchecked")
            List<Object> nosHoje = (List<Object>) localDb.read(em ->
                em.createNativeQuery("SELECT noId FROM user_nos WHERE userId = :userId AND status = 'CONCLUIDO' AND concluidoEm >= :inicio")
                .setParameter("userId", uidStr)
                .setParameter("inicio", Timestamp.valueOf(inicioDia))
                .getResultList());

            if (!nosHoje.isEmpty()) {
                List<Long> noIds = nosHoje.stream().map(o -> ((Number) o).longValue()).toList();
                Long xp = noRepository.getEntityManager()
                    .createQuery("SELECT SUM(n.xpRecompensa) FROM No n WHERE n.id IN :ids", Long.class)
                    .setParameter("ids", noIds)
                    .getSingleResult();
                xpHoje = xp != null ? xp.intValue() : 0;
            }
        } catch (Exception ignored) {}

        return new UserStatsDTO(missoesConcluidas, missoesConcluidasSemana, missoesPendentes,
                flashcardsDominados, flashcardsDominadosHoje, xpHoje);
    }
}
