package com.studyquest.usuarios.dto;

import com.studyquest.usuarios.User;

import java.time.LocalDate;
import java.util.UUID;

public record UserStatsDTO(
        UUID id,
        String name,
        Integer lvl,
        Integer totalXp,
        Integer currentStreak,
        Integer maxStreak,
        LocalDate lastActivityDate
) {
    public UserStatsDTO(User user) {
        this(
                user.getId(),
                user.getName(),
                user.getLvl(),
                user.getTotalXp(),
                user.getCurrentStreak(),
                user.getMaxStreak(),
                user.getLastActivityDate()
        );
    }
}
