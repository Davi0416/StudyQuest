package com.studyquest.gamificacao;

import com.studyquest.gamificacao.dto.ConquistaResponse;
import com.studyquest.gamificacao.dto.RankingResponse;
import com.studyquest.shared.response.ApiResponse;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.List;
import java.util.UUID;

@Path("/api/gamificacao")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed("user")
public class GamificacaoResource {

    @Inject
    GamificacaoService gamificacaoService;

    @Inject
    JsonWebToken jwt;

    @GET
    @Path("/conquistas")
    public ApiResponse<List<ConquistaResponse>> conquistas() {
        return ApiResponse.ok(gamificacaoService.conquistas(userId()));
    }

    @GET
    @Path("/ranking/semanal")
    public ApiResponse<RankingResponse> rankingSemanal() {
        return ApiResponse.ok(gamificacaoService.rankingSemanal(userId()));
    }

    private UUID userId() {
        return UUID.fromString(jwt.getSubject());
    }
}
