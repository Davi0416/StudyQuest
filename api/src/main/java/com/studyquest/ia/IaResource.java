package com.studyquest.ia;

import com.studyquest.ia.dto.ChatRequest;
import com.studyquest.ia.dto.ChatResponse;
import com.studyquest.shared.response.ApiResponse;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

@Path("/api/ia")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed("user")
public class IaResource {

    @Inject
    IaService iaService;

    @POST
    @Path("/chat")
    public ApiResponse<ChatResponse> chat(@Valid ChatRequest req) {
        return ApiResponse.ok(iaService.chat(req));
    }
}
