package com.studyquest.ia;

import com.studyquest.ia.dto.ChatRequest;
import com.studyquest.ia.dto.ChatResponse;
import com.studyquest.shared.exception.TooManyRequestsException;
import com.studyquest.shared.ratelimit.RateLimiterService;
import com.studyquest.shared.response.ApiResponse;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.time.Duration;
import java.util.UUID;

@Path("/api/ia")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed("user")
public class IaResource {

    private static final int GROQ_MAX_RPM = 20;
    private static final Duration GROQ_WINDOW = Duration.ofMinutes(1);

    @Inject IaService iaService;
    @Inject JsonWebToken jwt;
    @Inject RateLimiterService rateLimiter;

    @POST
    @Path("/chat")
    public ApiResponse<ChatResponse> chat(@Valid ChatRequest req) {
        UUID uid = UUID.fromString(jwt.getSubject());
        if (!rateLimiter.tryAcquire(uid, "groq", GROQ_MAX_RPM, GROQ_WINDOW)) {
            throw new TooManyRequestsException(rateLimiter.retryAfterSeconds(uid, "groq", GROQ_WINDOW));
        }
        return ApiResponse.ok(iaService.chat(req));
    }
}
