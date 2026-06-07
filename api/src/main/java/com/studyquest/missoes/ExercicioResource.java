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

/**
 * Endpoint de feedback imediato de código.
 *
 * Os casos de teste são fornecidos pelo cliente e usados exclusivamente para exibir
 * resultado ao usuário. Nenhum XP é concedido e nenhuma missão é marcada como concluída
 * por este endpoint. Progressão de gamificação ocorre somente via
 * POST /api/missoes/{id}/submeter, que carrega os testes do banco de dados.
 */
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
        // testes vêm do cliente — resultado é apenas informativo, sem efeito em gamificação
        return ApiResponse.ok(codigoValidatorService.validar(req));
    }
}
