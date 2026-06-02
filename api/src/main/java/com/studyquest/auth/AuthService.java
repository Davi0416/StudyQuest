package com.studyquest.auth;

import com.studyquest.auth.dto.LoginRequest;
import com.studyquest.auth.dto.RegisterRequest;
import com.studyquest.auth.dto.TokenResponse;
import com.studyquest.shared.exception.RecursoNaoEncontradoException;
import com.studyquest.usuarios.User;
import com.studyquest.usuarios.UserRepository;
import io.quarkus.elytron.security.common.BcryptUtil;
import io.smallrye.jwt.build.Jwt;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;

import java.time.Duration;
import java.util.Set;
import java.util.UUID;

@ApplicationScoped
public class AuthService {

    private static final String ISSUER = "https://studyquest.app";

    private final UserRepository userRepository;
    private final io.smallrye.jwt.auth.principal.JWTParser jwtParser;

    public AuthService(UserRepository userRepository, io.smallrye.jwt.auth.principal.JWTParser jwtParser) {
        this.userRepository = userRepository;
        this.jwtParser = jwtParser;
    }

    @Transactional
    public TokenResponse register(RegisterRequest req) {
        userRepository.findByEmail(req.email()).ifPresent(u -> {
            throw new WebApplicationException("Email já cadastrado", Response.Status.CONFLICT);
        });

        User user = User.builder()
                .name(req.name())
                .email(req.email())
                .passwordHash(BcryptUtil.bcryptHash(req.password()))
                .avatarUrl(req.avatarUrl())
                .build();

        userRepository.persist(user);
        return generateTokens(user);
    }

    public TokenResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado"));

        if (!BcryptUtil.matches(req.password(), user.getPasswordHash())) {
            throw new WebApplicationException("Credenciais inválidas", Response.Status.UNAUTHORIZED);
        }

        return generateTokens(user);
    }

    public TokenResponse refresh(String refreshToken) {
        // valida o refresh token e emite novo access token
        try {
            var claims = jwtParser.parse(refreshToken);
            String subject = claims.getSubject();
            UUID userId = UUID.fromString(subject);
            User user = userRepository.findById(userId);
            if (user == null) throw new RecursoNaoEncontradoException("Usuário não encontrado");
            return generateTokens(user);
        } catch (Exception e) {
            throw new WebApplicationException("Refresh token inválido", Response.Status.UNAUTHORIZED);
        }
    }

    private TokenResponse generateTokens(User user) {
        String accessToken = Jwt.issuer(ISSUER)
                .subject(user.getId().toString())
                .groups(Set.of("user"))
                .claim("name", user.getName())
                .claim("email", user.getEmail())
                .expiresIn(Duration.ofMinutes(15))
                .sign();

        String refreshToken = Jwt.issuer(ISSUER)
                .subject(user.getId().toString())
                .groups(Set.of("refresh"))
                .expiresIn(Duration.ofDays(7))
                .sign();

        return new TokenResponse(accessToken, refreshToken);
    }
}
