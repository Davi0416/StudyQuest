package com.studyquest.auth;

import com.studyquest.auth.dto.LoginRequest;
import com.studyquest.auth.dto.RegisterRequest;
import com.studyquest.auth.dto.TokenResponse;
import com.studyquest.shared.exception.RecursoNaoEncontradoException;
import com.studyquest.usuarios.User;
import com.studyquest.usuarios.UserRepository;
import io.quarkus.elytron.security.common.BcryptUtil;
import io.smallrye.jwt.auth.principal.JWTParser;
import io.smallrye.jwt.auth.principal.ParseException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthServiceTest {

    UserRepository userRepo;
    JWTParser jwtParser;
    AuthService service;

    @BeforeEach
    void setUp() {
        userRepo = mock(UserRepository.class);
        jwtParser = mock(JWTParser.class);
        service = new AuthService(userRepo, jwtParser);
    }

    @Test
    void register_emailJaCadastrado_lancaConflict() {
        when(userRepo.findByEmail("x@x.com")).thenReturn(Optional.of(new User()));

        var req = new RegisterRequest("João", "x@x.com", "senha123", null);
        WebApplicationException ex = assertThrows(WebApplicationException.class, () -> service.register(req));
        assertEquals(Response.Status.CONFLICT.getStatusCode(), ex.getResponse().getStatus());
    }

    @Test
    void login_senhaErrada_lancaUnauthorized() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("a@a.com")
                .passwordHash(BcryptUtil.bcryptHash("certa"))
                .build();
        when(userRepo.findByEmail("a@a.com")).thenReturn(Optional.of(user));

        var req = new LoginRequest("a@a.com", "errada");
        WebApplicationException ex = assertThrows(WebApplicationException.class, () -> service.login(req));
        assertEquals(Response.Status.UNAUTHORIZED.getStatusCode(), ex.getResponse().getStatus());
    }

    @Test
    void login_usuarioNaoEncontrado_lancaNotFound() {
        when(userRepo.findByEmail("nao@existe.com")).thenReturn(Optional.empty());

        var req = new LoginRequest("nao@existe.com", "qualquer");
        assertThrows(RecursoNaoEncontradoException.class, () -> service.login(req));
    }

    @Test
    void refresh_tokenInvalido_lancaUnauthorized() throws ParseException {
        when(jwtParser.parse("token-ruim")).thenThrow(new ParseException("inválido"));

        WebApplicationException ex = assertThrows(WebApplicationException.class,
                () -> service.refresh("token-ruim"));
        assertEquals(Response.Status.UNAUTHORIZED.getStatusCode(), ex.getResponse().getStatus());
    }

    @Test
    void refresh_usuarioNaoEncontrado_lancaUnauthorized() throws ParseException {
        UUID id = UUID.randomUUID();
        JsonWebToken jwt = mock(JsonWebToken.class);
        when(jwt.getSubject()).thenReturn(id.toString());
        when(jwtParser.parse("token-ok")).thenReturn(jwt);
        when(userRepo.findById(id)).thenReturn(null);

        WebApplicationException ex = assertThrows(WebApplicationException.class,
                () -> service.refresh("token-ok"));
        assertEquals(Response.Status.UNAUTHORIZED.getStatusCode(), ex.getResponse().getStatus());
    }
}
