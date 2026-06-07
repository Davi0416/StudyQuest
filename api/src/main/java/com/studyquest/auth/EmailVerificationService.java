package com.studyquest.auth;

import com.studyquest.usuarios.User;
import io.quarkus.elytron.security.common.BcryptUtil;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@ApplicationScoped
public class EmailVerificationService {

    private static final int CODE_TTL_MINUTES = 15;
    private static final int RESEND_COOLDOWN_SECONDS = 60;

    private final EmailVerificationCodeRepository codeRepository;
    private final EmailService emailService;
    private final SecureRandom random = new SecureRandom();

    @Inject
    public EmailVerificationService(EmailVerificationCodeRepository codeRepository, EmailService emailService) {
        this.codeRepository = codeRepository;
        this.emailService = emailService;
    }

    @Transactional
    public void sendCode(User user) {
        codeRepository.invalidateAllForEmail(user.getEmail());

        String code = generateCode();
        codeRepository.persist(EmailVerificationCode.builder()
                .email(user.getEmail())
                .codeHash(BcryptUtil.bcryptHash(code))
                .expiresAt(LocalDateTime.now().plusMinutes(CODE_TTL_MINUTES))
                .build());

        emailService.sendVerificationCode(user.getEmail(), user.getName(), code);
    }

    @Transactional
    public void resendCode(User user) {
        var latest = codeRepository.find("email = ?1 order by createdAt desc", user.getEmail())
                .firstResultOptional();

        if (latest.isPresent()) {
            LocalDateTime cooldownUntil = latest.get().getCreatedAt().plusSeconds(RESEND_COOLDOWN_SECONDS);
            if (LocalDateTime.now().isBefore(cooldownUntil)) {
                throw new WebApplicationException(
                        "Aguarde um minuto antes de solicitar um novo código",
                        Response.Status.TOO_MANY_REQUESTS
                );
            }
        }

        sendCode(user);
    }

    @Transactional
    public boolean verify(String email, String code) {
        EmailVerificationCode active = codeRepository.findLatestActive(email)
                .orElseThrow(() -> new WebApplicationException(
                        "Código inválido ou expirado",
                        Response.Status.BAD_REQUEST
                ));

        if (!BcryptUtil.matches(code, active.getCodeHash())) {
            throw new WebApplicationException("Código inválido", Response.Status.BAD_REQUEST);
        }

        active.setConsumed(true);
        return true;
    }

    private String generateCode() {
        return String.format("%06d", random.nextInt(1_000_000));
    }
}
