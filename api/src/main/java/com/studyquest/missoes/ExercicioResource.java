package com.studyquest.missoes;

import com.studyquest.missoes.dto.ValidarCodigoRequest;
import com.studyquest.missoes.dto.ValidarCodigoResponse;
import com.studyquest.shared.response.ApiResponse;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/api/exercicios")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed("user")
public class ExercicioResource {

    @Inject
    CodigoValidatorService codigoValidatorService;

    @POST
    @Path("/validar")
    public ApiResponse<ValidarCodigoResponse> validar(@Valid ValidarCodigoRequest req) {
        return ApiResponse.ok(codigoValidatorService.validar(req));
    }
}
