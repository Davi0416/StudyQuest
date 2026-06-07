package com.studyquest.auth;

import com.studyquest.auth.dto.*;
import com.studyquest.shared.response.ApiResponse;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.Context;
import io.vertx.core.http.HttpServerRequest;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Path("/api/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@PermitAll
public class AuthResource {

    @Inject
    AuthService authService;

    @ConfigProperty(name = "app.trusted-proxies", defaultValue = "")
    String trustedProxiesRaw;

    @POST
    @Path("/register")
    public Response register(@Valid RegisterRequest req, @Context HttpServerRequest request) {
        String ip = getClientIp(request);
        TokenResponse tokens = authService.register(req, ip);
        return Response.status(Response.Status.CREATED)
                .entity(ApiResponse.ok(tokens, "Conta criada com sucesso!"))
                .build();
    }

    // verificação de e-mail desabilitada temporariamente — endpoints /verify e /verify/resend removidos

    @POST
    @Path("/login")
    public ApiResponse<TokenResponse> login(@Valid LoginRequest req) {
        return ApiResponse.ok(authService.login(req));
    }

    @POST
    @Path("/refresh")
    public ApiResponse<TokenResponse> refresh(@Valid RefreshTokenRequest req) {
        return ApiResponse.ok(authService.refresh(req.refreshToken()));
    }

    @POST
    @Path("/logout")
    public ApiResponse<Void> logout(@Valid RefreshTokenRequest req) {
        authService.logout(req.refreshToken());
        return ApiResponse.ok(null, "Logout realizado");
    }

    private String getClientIp(HttpServerRequest request) {
        String remoteIp = request.remoteAddress() != null
                ? request.remoteAddress().hostAddress()
                : null;

        if (remoteIp != null && isTrustedProxy(remoteIp)) {
            String xForwardedFor = request.getHeader("X-Forwarded-For");
            if (xForwardedFor != null && !xForwardedFor.isBlank()) {
                return xForwardedFor.split(",")[0].trim();
            }
        }

        if (request.remoteAddress() != null) {
            return request.remoteAddress().host();
        }
        return "unknown";
    }

    private boolean isTrustedProxy(String remoteIp) {
        if (trustedProxiesRaw == null || trustedProxiesRaw.isBlank()) return false;
        Set<String> trusted = Arrays.stream(trustedProxiesRaw.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .collect(Collectors.toSet());
        return trusted.contains(remoteIp);
    }
}
