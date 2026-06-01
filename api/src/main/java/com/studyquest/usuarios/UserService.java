package com.studyquest.usuarios;

import com.studyquest.usuarios.dto.UserRequestDTO;
import com.studyquest.usuarios.dto.UserResponseDTO;
import io.quarkus.elytron.security.common.BcryptUtil;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
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
                .passwordHash(BcryptUtil.bcryptHash(dto.password())) // hash da senha
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
        if (user == null) {
            throw new NotFoundException("Usuário não encontrado");
        }
        return new UserResponseDTO(user);
    }
}
