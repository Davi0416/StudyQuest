package com.studyquest.trilhas.seed;

import com.fasterxml.jackson.annotation.JsonProperty;

public record TesteSeedDto(
        String stdin,
        @JsonProperty("expected_output") String expectedOutput
) {}
