package com.studyquest.missoes.judge0;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record Judge0SubmissionResponse(
        String token,
        String stdout,
        String stderr,
        @JsonProperty("compile_output") String compileOutput,
        String message,
        Judge0Status status
) {
    public boolean isAccepted() {
        return status != null && status.id() == 3; // 3 = Accepted
    }

    public String output() {
        if (stdout != null) return stdout.trim();
        if (compileOutput != null) return compileOutput.trim();
        if (stderr != null) return stderr.trim();
        return "";
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Judge0Status(int id, String description) {}
}
