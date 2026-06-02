package com.studyquest.missoes;

import com.studyquest.missoes.dto.MissaoResponse;
import com.studyquest.missoes.dto.SubmeterCodigoRequest;
import com.studyquest.missoes.dto.SubmissaoResponse;
import com.studyquest.shared.response.ApiResponse;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.List;
import java.util.UUID;

@Path("/api/missoes")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed("user")
public class MissaoResource {

    @Inject
    MissaoService missaoService;

    @Inject
    JsonWebToken jwt;

    @GET
    @Path("/{id}")
    public ApiResponse<MissaoResponse> detalhe(@PathParam("id") Long id) {
        return ApiResponse.ok(missaoService.detalhe(id));
    }

    @POST
    @Path("/{id}/submeter")
    public ApiResponse<SubmissaoResponse> submeter(@PathParam("id") Long id,
                                                    @Valid SubmeterCodigoRequest req) {
        return ApiResponse.ok(missaoService.submeter(id, userId(), req));
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
