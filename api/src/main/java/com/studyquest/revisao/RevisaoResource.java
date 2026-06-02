package com.studyquest.revisao;

import com.studyquest.revisao.dto.ResponderRevisaoRequest;
import com.studyquest.revisao.dto.RevisaoHojeResponse;
import com.studyquest.shared.response.ApiResponse;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.Map;
import java.util.UUID;

@Path("/api/revisao")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed("user")
public class RevisaoResource {

    @Inject
    RevisaoService revisaoService;

    @Inject
    JsonWebToken jwt;

    @GET
    @Path("/hoje")
    public ApiResponse<RevisaoHojeResponse> hoje() {
        return ApiResponse.ok(revisaoService.hoje(userId()));
    }

    @POST
    @Path("/{id}/responder")
    public ApiResponse<Void> responder(@PathParam("id") Long id,
                                        @Valid ResponderRevisaoRequest req) {
        revisaoService.responder(id, userId(), req);
        return ApiResponse.ok(null, "Resposta registrada");
    }

    @GET
    @Path("/stats")
    public ApiResponse<Map<Integer, Long>> stats() {
        return ApiResponse.ok(revisaoService.stats(userId()));
    }

    private UUID userId() {
        return UUID.fromString(jwt.getSubject());
    }
}
