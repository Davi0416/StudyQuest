package com.studyquest.flashcards;

import com.studyquest.flashcards.dto.CriarFlashcardRequest;
import com.studyquest.flashcards.dto.FlashcardResponse;
import com.studyquest.shared.response.ApiResponse;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.List;
import java.util.UUID;

@Path("/api/flashcards")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed("user")
public class FlashcardResource {

    @Inject
    FlashcardService flashcardService;

    @Inject
    JsonWebToken jwt;

    @GET
    public ApiResponse<List<FlashcardResponse>> listar(
            @QueryParam("trilhaId") Long trilhaId,
            @QueryParam("noId") Long noId) {
        return ApiResponse.ok(flashcardService.listar(trilhaId, noId));
    }

    @POST
    public ApiResponse<FlashcardResponse> criar(@Valid CriarFlashcardRequest req) {
        return ApiResponse.ok(flashcardService.criar(userId(), req));
    }

    @DELETE
    @Path("/{id}")
    public ApiResponse<Void> deletar(@PathParam("id") Long id) {
        flashcardService.deletar(id, userId());
        return ApiResponse.ok(null, "Flashcard removido");
    }

    private UUID userId() {
        return UUID.fromString(jwt.getSubject());
    }
}
