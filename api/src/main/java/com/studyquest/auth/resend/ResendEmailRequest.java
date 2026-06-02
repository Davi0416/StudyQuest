package com.studyquest.auth.resend;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record ResendEmailRequest(
        String from,
        List<String> to,
        String subject,
        String text
) {}
