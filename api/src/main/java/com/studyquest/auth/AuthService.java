package com.studyquest.auth;

import com.studyquest.auth.dto.LoginRequest;
import com.studyquest.auth.dto.RegisterRequest;
import com.studyquest.auth.dto.TokenResponse;
import com.studyquest.offline.CachedSession;
import com.studyquest.shared.ConnectivityChecker;
import com.studyquest.shared.db.LocalDb;
import com.studyquest.shared.exception.RecursoNaoEncontradoException;
import com.studyquest.usuarios.User;
import com.studyquest.usuarios.UserRepository;
import io.quarkus.elytron.security.common.BcryptUtil;
import io.smallrye.jwt.auth.principal.JWTParser;
import io.smallrye.jwt.build.Jwt;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Set;
import java.util.UUID;

@ApplicationScoped
public class AuthService {

    @ConfigProperty(name = "studyquest.jwt.issuer")
    String issuer;

    @Inject UserRepository userRepository;

    @Inject JWTParser jwtParser;
    @Inject LocalDb localDb;
    @Inject ConnectivityChecker connectivityChecker;
    @Inject RevokedTokenRepository revokedTokenRepository;

    @Transactional
    public TokenResponse register(RegisterRequest req, String ip) {
        if (!connectivityChecker.isOnline()) {
            throw new WebApplicationException(
                    "Registro requer conexão com a internet. Conecte-se e tente novamente.",
                    Response.Status.SERVICE_UNAVAILABLE);
        }

        userRepository.findByEmail(req.email()).ifPresent(u -> {
            throw new WebApplicationException("Email já cadastrado", Response.Status.CONFLICT);
        });

        if (userRepository.countByRegisterIp(ip) >= 3) {
            throw new WebApplicationException("Limite de 3 contas por IP excedido.", Response.Status.FORBIDDEN);
        }

        User user = User.builder()
                .name(req.name())
                .email(req.email())
                .passwordHash(BcryptUtil.bcryptHash(req.password()))
                .avatarUrl(req.avatarUrl())
                .emailVerified(true) // verificação de e-mail desabilitada temporariamente
                .registerIp(ip)
                .build();

        userRepository.persist(user);

        TokenResponse tokens = generateTokens(user);
        cacheSession(user, tokens.refreshToken());
        return tokens;
    }

    // verificação de e-mail desabilitada temporariamente

    public TokenResponse login(LoginRequest req) {
        if (!connectivityChecker.isOnline()) {
            throw new WebApplicationException(
                    "Sem conexão. Abra o aplicativo com internet para fazer login pela primeira vez.",
                    Response.Status.SERVICE_UNAVAILABLE);
        }

        User user = userRepository.findByEmail(req.email())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado"));

        if (!BcryptUtil.matches(req.password(), user.getPasswordHash())) {
            throw new WebApplicationException("Credenciais inválidas", Response.Status.UNAUTHORIZED);
        }

        if (!user.isEmailVerified()) {
            throw new WebApplicationException(
                    "E-mail não verificado. Confira sua caixa de entrada ou solicite um novo código.",
                    Response.Status.FORBIDDEN);
        }

        TokenResponse tokens = generateTokens(user);
        cacheSession(user, tokens.refreshToken());
        return tokens;
    }

    public TokenResponse refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new WebApplicationException("Refresh token ausente", Response.Status.UNAUTHORIZED);
        }

        try {
            JsonWebToken claims = jwtParser.parse(refreshToken);

            if (!claims.getGroups().contains("refresh")) {
                throw new WebApplicationException("Token inválido para refresh", Response.Status.UNAUTHORIZED);
            }

            UUID userId = UUID.fromString(claims.getSubject());
            String jti = claims.getTokenID();

            if (connectivityChecker.isOnline()) {
                // Verifica revogação antes de emitir novo par de tokens
                if (jti != null && revokedTokenRepository.isRevoked(jti)) {
                    throw new WebApplicationException("Refresh token revogado", Response.Status.UNAUTHORIZED);
                }

                User user = userRepository.findById(userId);
                if (user == null) throw new RecursoNaoEncontradoException("Usuário não encontrado");

                // Revoga o token antigo antes de emitir o novo par (rotation)
                revokeJti(jti, userId, claims.getExpirationTime());

                TokenResponse tokens = generateTokens(user);
                cacheSession(user, tokens.refreshToken());
                updateCachedProfile(user); // sincroniza perfil atualizado no SQLite
                return tokens;
            } else {
                // Offline: assinatura JWT já validada localmente (publicKey.pem embutida)
                CachedSession session = loadCachedSession(userId);
                if (session == null) {
                    throw new WebApplicationException(
                            "Sessão local não encontrada. Conecte-se à internet para fazer login.",
                            Response.Status.UNAUTHORIZED);
                }
                return generateTokensFromCache(session);
            }
        } catch (WebApplicationException e) {
            throw e;
        } catch (Exception e) {
            throw new WebApplicationException("Refresh token inválido", Response.Status.UNAUTHORIZED);
        }
    }

    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) return;
        try {
            JsonWebToken claims = jwtParser.parse(refreshToken);
            String jti = claims.getTokenID();
            if (jti == null) return;
            UUID userId = UUID.fromString(claims.getSubject());
            revokeJti(jti, userId, claims.getExpirationTime());
        } catch (Exception ignored) {
            // Logout é best-effort — token pode já estar expirado ou malformado
        }
    }

    @Transactional
    void revokeJti(String jti, UUID userId, long expirationEpochSecond) {
        if (jti == null) return;
        try {
            LocalDateTime expiresAt = LocalDateTime.ofInstant(
                    Instant.ofEpochSecond(expirationEpochSecond), ZoneOffset.UTC);
            revokedTokenRepository.persist(RevokedToken.builder()
                    .jti(jti)
                    .userId(userId)
                    .expiresAt(expiresAt)
                    .build());
        } catch (Exception ignored) {
            // Ignora duplicatas (jti já revogado)
        }
    }

    // ---- Geração de tokens ----

    private TokenResponse generateTokens(User user) {
        String jti = UUID.randomUUID().toString();

        String accessToken = Jwt.issuer(issuer)
                .subject(user.getId().toString())
                .groups(Set.of("user"))
                .claim("name", user.getName())
                .claim("email", user.getEmail())
                .expiresIn(Duration.ofMinutes(15))
                .sign();

        // jti no refresh token para suporte a revogação
        String refreshToken = Jwt.issuer(issuer)
                .subject(user.getId().toString())
                .groups(Set.of("refresh"))
                .claim("jti", jti)
                .expiresIn(Duration.ofDays(7))
                .sign();

        return new TokenResponse(accessToken, refreshToken);
    }

    private TokenResponse generateTokensFromCache(CachedSession session) {
        String jti = UUID.randomUUID().toString();

        String accessToken = Jwt.issuer(issuer)
                .subject(session.getUserId().toString())
                .groups(Set.of("user"))
                .claim("name", session.getName())
                .claim("email", session.getEmail())
                .expiresIn(Duration.ofMinutes(15))
                .sign();

        String refreshToken = Jwt.issuer(issuer)
                .subject(session.getUserId().toString())
                .groups(Set.of("refresh"))
                .claim("jti", jti)
                .expiresIn(Duration.ofDays(7))
                .sign();

        // Atualiza token no cache
        localDb.write(em -> {
            CachedSession cached = em.find(CachedSession.class, session.getUserId());
            if (cached != null) {
                cached.setLastRefreshToken(refreshToken);
                cached.setCachedAt(LocalDateTime.now());
            }
        });

        return new TokenResponse(accessToken, refreshToken);
    }

    // ---- Cache local (SQLite) ----

    private void cacheSession(User user, String refreshToken) {
        try {
            localDb.write(em -> {
                CachedSession existing = em.find(CachedSession.class, user.getId());
                if (existing != null) {
                    existing.setEmail(user.getEmail());
                    existing.setName(user.getName());
                    existing.setAvatarUrl(user.getAvatarUrl());
                    existing.setLastRefreshToken(refreshToken);
                    existing.setCachedAt(LocalDateTime.now());
                } else {
                    em.persist(CachedSession.builder()
                            .userId(user.getId())
                            .email(user.getEmail())
                            .name(user.getName())
                            .avatarUrl(user.getAvatarUrl())
                            .lastRefreshToken(refreshToken)
                            .build());
                }
            });
        } catch (Exception ignored) {
            // Silent — não quebra o fluxo de autenticação
        }
    }

    private void updateCachedProfile(User user) {
        try {
            localDb.write(em -> {
                CachedSession cached = em.find(CachedSession.class, user.getId());
                if (cached != null) {
                    cached.setName(user.getName());
                    cached.setAvatarUrl(user.getAvatarUrl());
                    cached.setCachedAt(LocalDateTime.now());
                }
            });
        } catch (Exception ignored) {}
    }

    private CachedSession loadCachedSession(UUID userId) {
        return localDb.read(em -> em.find(CachedSession.class, userId));
    }
}
