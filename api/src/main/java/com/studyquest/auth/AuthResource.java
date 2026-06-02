package com.studyquest.auth;

import com.studyquest.auth.dto.LoginRequest;
import com.studyquest.auth.dto.RegisterRequest;
import com.studyquest.auth.dto.TokenResponse;
import com.studyquest.shared.response.ApiResponse;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@PermitAll
public class AuthResource {

    @Inject
    AuthService authService;

    @POST
    @Path("/register")
    public Response register(@Valid RegisterRequest req) {
        TokenResponse tokens = authService.register(req);
        return Response.status(Response.Status.CREATED)
                .entity(ApiResponse.ok(tokens, "Conta criada com sucesso"))
                .build();
    }

    @POST
    @Path("/login")
    public ApiResponse<TokenResponse> login(@Valid LoginRequest req) {
        return ApiResponse.ok(authService.login(req));
    }

    @POST
    @Path("/refresh")
    public ApiResponse<TokenResponse> refresh(@QueryParam("token") String refreshToken) {
        return ApiResponse.ok(authService.refresh(refreshToken));
    }

    @POST
    @Path("/logout")
    public ApiResponse<Void> logout() {
        // JWT é stateless — client descarta o token
        return ApiResponse.ok(null, "Logout realizado");
    }
}
