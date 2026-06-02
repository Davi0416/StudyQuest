package com.studyquest.auth.dto;

public record TokenResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn
) {
    public TokenResponse(String accessToken, String refreshToken) {
        this(accessToken, refreshToken, "Bearer", 900);
    }
}
