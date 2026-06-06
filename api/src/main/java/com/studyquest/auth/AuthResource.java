package com.studyquest.auth;

import com.studyquest.auth.dto.*;
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
        RegisterResponse result = authService.register(req);
        return Response.status(Response.Status.CREATED)
                .entity(ApiResponse.ok(result, result.message()))
                .build();
    }

    @POST
    @Path("/verify")
    public ApiResponse<TokenResponse> verify(@Valid VerifyEmailRequest req) {
        return ApiResponse.ok(authService.verifyEmail(req.email(), req.code()), "E-mail verificado com sucesso");
    }

    @POST
    @Path("/verify/resend")
    public ApiResponse<Void> resendVerification(@Valid ResendVerificationRequest req) {
        authService.resendVerification(req.email());
        return ApiResponse.ok(null, "Novo código enviado para o seu e-mail");
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
    public ApiResponse<Void> logout(@QueryParam("token") String refreshToken) {
        authService.logout(refreshToken);
        return ApiResponse.ok(null, "Logout realizado");
    }
}
