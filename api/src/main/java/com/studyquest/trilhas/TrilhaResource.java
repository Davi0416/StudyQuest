package com.studyquest.trilhas;

import com.studyquest.shared.response.ApiResponse;
import com.studyquest.trilhas.dto.TrilhaResponse;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.List;
import java.util.UUID;

@Path("/api/trilhas")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed("user")
public class TrilhaResource {

    @Inject
    TrilhaService trilhaService;

    @Inject
    JsonWebToken jwt;

    @GET
    public ApiResponse<List<TrilhaResponse>> listar() {
        return ApiResponse.ok(trilhaService.listarTodas());
    }

    @GET
    @Path("/{id}")
    public ApiResponse<TrilhaResponse> detalhe(@PathParam("id") Long id) {
        return ApiResponse.ok(trilhaService.detalhe(id, userId()));
    }

    @POST
    @Path("/{id}/matricular")
    public ApiResponse<TrilhaResponse> matricular(@PathParam("id") Long id) {
        return ApiResponse.ok(trilhaService.matricular(id, userId()), "Matriculado com sucesso");
    }

    @GET
    @Path("/ativas")
    public ApiResponse<List<TrilhaResponse>> ativas() {
        return ApiResponse.ok(trilhaService.ativas(userId()));
    }

    private UUID userId() {
        return UUID.fromString(jwt.getSubject());
    }
}
