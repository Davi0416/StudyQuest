package com.studyquest.usuarios;

import com.studyquest.shared.exception.RecursoNaoEncontradoException;
import com.studyquest.usuarios.dto.UserRequestDTO;
import com.studyquest.usuarios.dto.UserResponseDTO;
import com.studyquest.usuarios.dto.UserStatsDTO;
import com.studyquest.usuarios.dto.UpdateProfileRequest;
import io.quarkus.elytron.security.common.BcryptUtil;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class UserService {

    private final UserRepository userRepository;

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
        User user = userRepository.findById(userId);
        if (user == null) throw new RecursoNaoEncontradoException("Usuário não encontrado");
        return new UserStatsDTO(user);
    }
}
