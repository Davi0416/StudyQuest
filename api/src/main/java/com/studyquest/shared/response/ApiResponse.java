package com.studyquest.shared.response;

import java.time.Instant;

public record ApiResponse<T>(
        boolean success,
        T data,
        String error,
        String message,
        Instant timestamp
) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null, null, Instant.now());
    }

    public static <T> ApiResponse<T> ok(T data, String message) {
        return new ApiResponse<>(true, data, null, message, Instant.now());
    }

    public static <T> ApiResponse<T> error(String error, String message) {
        return new ApiResponse<>(false, null, error, message, Instant.now());
    }
}
