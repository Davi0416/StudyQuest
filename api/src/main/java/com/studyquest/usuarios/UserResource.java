package com.studyquest.usuarios;

import com.studyquest.shared.response.ApiResponse;
import com.studyquest.usuarios.dto.UpdateProfileRequest;
import com.studyquest.usuarios.dto.UserResponseDTO;
import com.studyquest.usuarios.dto.UserStatsDTO;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.UUID;

@Path("/api/users")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed("user")
public class UserResource {

    @Inject
    UserService userService;

    @Inject
    JsonWebToken jwt;

    @GET
    @Path("/me")
    public ApiResponse<UserResponseDTO> me() {
        return ApiResponse.ok(userService.me(currentUserId()));
    }

    @PUT
    @Path("/me")
    public ApiResponse<UserResponseDTO> updateProfile(@Valid UpdateProfileRequest req) {
        return ApiResponse.ok(userService.updateProfile(currentUserId(), req));
    }

    @GET
    @Path("/me/stats")
    public ApiResponse<UserStatsDTO> stats() {
        return ApiResponse.ok(userService.stats(currentUserId()));
    }

    private UUID currentUserId() {
        return UUID.fromString(jwt.getSubject());
    }
}
