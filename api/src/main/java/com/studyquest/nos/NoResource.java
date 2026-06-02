package com.studyquest.nos;

import com.studyquest.nos.dto.NoResponse;
import com.studyquest.shared.response.ApiResponse;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.UUID;

@Path("/api/nos")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed("user")
public class NoResource {

    @Inject
    NoService noService;

    @Inject
    JsonWebToken jwt;

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

    private UUID userId() {
        return UUID.fromString(jwt.getSubject());
    }
}
