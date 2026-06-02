package com.studyquest.usuarios.dto;

import com.studyquest.usuarios.User;

import java.util.UUID;

public record UserResponseDTO(
        UUID id,
        String name,
        String email,
        String avatarUrl,
        Integer lvl,
        Integer totalXp,
        Integer currentStreak,
        Integer maxStreak,
        boolean emailVerified
) {
    public UserResponseDTO(User user) {
        this(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getAvatarUrl(),
                user.getLvl(),
                user.getTotalXp(),
                user.getCurrentStreak(),
                user.getMaxStreak(),
                user.isEmailVerified()
        );
    }
}
