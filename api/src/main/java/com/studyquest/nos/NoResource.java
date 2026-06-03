package com.studyquest.nos;

import com.studyquest.nos.dto.AulaProgressoResponse;
import com.studyquest.nos.dto.NoResponse;
import com.studyquest.nos.dto.SalvarAulaProgressoRequest;
import com.studyquest.shared.response.ApiResponse;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.List;
import java.util.UUID;

@Path("/api/nos")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed("user")
public class NoResource {

    @Inject
    NoService noService;

    @Inject
    AulaProgressService aulaProgressService;

    @Inject
    JsonWebToken jwt;

    @GET
    public ApiResponse<List<NoResponse>> listar(@QueryParam("trilhaId") Long trilhaId) {
        if (trilhaId == null) {
            throw new BadRequestException("trilhaId é obrigatório");
        }
        return ApiResponse.ok(noService.listarPorTrilha(trilhaId, userId()));
    }

    @GET
    @Path("/{id}")
    public ApiResponse<NoResponse> detalhe(@PathParam("id") Long id) {
        return ApiResponse.ok(noService.detalhe(id, userId()));
    }

    @POST
    @Path("/{id}/iniciar")
    public ApiResponse<NoResponse> iniciar(@PathParam("id") Long id) {
        return ApiResponse.ok(noService.iniciar(id, userId()));
    }

    @POST
    @Path("/{id}/concluir")
    public ApiResponse<NoResponse> concluir(@PathParam("id") Long id) {
        return ApiResponse.ok(noService.concluir(id, userId()), "Nó concluído! XP concedido.");
    }

    @GET
    @Path("/{id}/aula/progresso")
    public ApiResponse<AulaProgressoResponse> progressoAula(@PathParam("id") Long id) {
        return ApiResponse.ok(aulaProgressService.obter(id, userId()));
    }

    @PUT
    @Path("/{id}/aula/progresso")
    public ApiResponse<AulaProgressoResponse> salvarProgressoAula(
            @PathParam("id") Long id,
            SalvarAulaProgressoRequest req) {
        return ApiResponse.ok(aulaProgressService.salvar(id, userId(), req));
    }

    private UUID userId() {
        return UUID.fromString(jwt.getSubject());
    }
}
