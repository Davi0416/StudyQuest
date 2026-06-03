package com.studyquest.missoes.judge0;

import com.fasterxml.jackson.annotation.JsonProperty;

public record Judge0SubmissionRequest(
        @JsonProperty("source_code") String sourceCode,
        @JsonProperty("language_id") int languageId,
        String stdin,
        @JsonProperty("expected_output") String expectedOutput
) {}
