package com.studyquest.usuarios;

import com.studyquest.usuarios.dto.UserRequestDTO;
import com.studyquest.usuarios.dto.UserResponseDTO;
import jakarta.enterprise.context.ApplicationScoped; // <- Importação nova!
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.NotFoundException;

import java.util.List;

@ApplicationScoped
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public UserResponseDTO createUser(UserRequestDTO dto) {
        User user = User.builder()
                .name(dto.name())
                .email(dto.email())
                .passwordHash(dto.password())
                .avatarUrl(dto.avatarUrl())
                .lvl(1)
                .totalXp(0)
                .build();

        userRepository.persist(user);
        return new UserResponseDTO(user);
    }

    public List<UserResponseDTO> listAll() {
        return userRepository.listAll().stream()
                .map(UserResponseDTO::new)
                .toList();
    }

    public UserResponseDTO findById(Long id) {
        User user = userRepository.findById(id);
        if (user == null) {
            throw new NotFoundException("User not found");
        }
        return new UserResponseDTO(user);
    }
}
