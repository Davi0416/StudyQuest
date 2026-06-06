package com.studyquest.missoes;

import com.studyquest.missoes.dto.MissaoResponse;
import com.studyquest.missoes.dto.SubmeterCodigoRequest;
import com.studyquest.missoes.dto.SubmissaoResponse;
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
import java.util.List;
import java.util.UUID;

@Path("/api/missoes")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed("user")
public class MissaoResource {

    private static final int JUDGE0_MAX_RPM = 10;
    private static final Duration JUDGE0_WINDOW = Duration.ofMinutes(1);

    @Inject MissaoService missaoService;
    @Inject JsonWebToken jwt;
    @Inject RateLimiterService rateLimiter;

    @GET
    @Path("/por-no/{noId}")
    public ApiResponse<MissaoResponse> porNo(@PathParam("noId") Long noId) {
        return ApiResponse.ok(missaoService.porNoId(noId));
    }

    @GET
    @Path("/{id}")
    public ApiResponse<MissaoResponse> detalhe(@PathParam("id") Long id) {
        return ApiResponse.ok(missaoService.detalhe(id));
    }

    @POST
    @Path("/{id}/submeter")
    public ApiResponse<SubmissaoResponse> submeter(@PathParam("id") Long id,
                                                    @Valid SubmeterCodigoRequest req) {
        UUID uid = userId();
        if (!rateLimiter.tryAcquire(uid, "judge0", JUDGE0_MAX_RPM, JUDGE0_WINDOW)) {
            throw new TooManyRequestsException(rateLimiter.retryAfterSeconds(uid, "judge0", JUDGE0_WINDOW));
        }
        return ApiResponse.ok(missaoService.submeter(id, uid, req));
    }

    @GET
    @Path("/{id}/submissoes")
    public ApiResponse<List<SubmissaoResponse>> historico(@PathParam("id") Long id) {
        return ApiResponse.ok(missaoService.historico(id, userId()));
    }

    private UUID userId() {
        return UUID.fromString(jwt.getSubject());
    }
}
