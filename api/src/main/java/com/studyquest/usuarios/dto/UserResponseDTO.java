package com.studyquest.usuarios.dto;

import com.studyquest.usuarios.User;

public record UserResponseDTO(
        Long id,
        String name,
        String email,
        String avatarUrl,
        Integer lvl,
        Integer totalXp
) {
    public UserResponseDTO(User user) {
        this(user.getId(), user.getName(), user.getEmail(), user.getAvatarUrl(), user.getLvl(), user.getTotalXp());
    }
}
