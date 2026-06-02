package com.studyquest.auth;

import com.studyquest.auth.resend.ResendClient;
import com.studyquest.auth.resend.ResendEmailRequest;
import io.quarkus.mailer.Mail;
import io.quarkus.mailer.reactive.ReactiveMailer;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class EmailService {

    private static final Logger LOG = Logger.getLogger(EmailService.class);

    @Inject
    ReactiveMailer mailer;

    @RestClient
    ResendClient resendClient;

    @ConfigProperty(name = "studyquest.mail.provider")
    String provider;

    @ConfigProperty(name = "resend.api-key", defaultValue = "")
    Optional<String> resendApiKey;

    @ConfigProperty(name = "quarkus.mailer.password")
    Optional<String> smtpPassword;

    @ConfigProperty(name = "mail.from")
    String fromAddress;

    @ConfigProperty(name = "quarkus.mailer.mock", defaultValue = "false")
    boolean mailMock;

    public void sendVerificationCode(String email, String name, String code) {
        String body = """
                Olá, %s!

                Seu código de verificação StudyQuest é:

                    %s

                Ele expira em 15 minutos. Se você não criou uma conta, ignore este e-mail.
                """.formatted(name, code);

        String subject = "Seu código StudyQuest";

        try {
            switch (resolveProvider()) {
                case "resend" -> sendViaResend(email, subject, body);
                case "smtp" -> sendViaSmtp(email, subject, body);
                default -> {
                    LOG.infof("[mail-mock] Código de verificação para %s: %s", email, code);
                }
            }
        } catch (WebApplicationException e) {
            throw e;
        } catch (Exception e) {
            LOG.errorf(e, "Falha ao enviar e-mail de verificação para %s", email);
            throw new WebApplicationException(
                    "Não foi possível enviar o e-mail de verificação. Tente novamente em instantes.",
                    Response.Status.SERVICE_UNAVAILABLE
            );
        }
    }

    private String resolveProvider() {
        if (!"auto".equalsIgnoreCase(provider)) {
            return provider.toLowerCase();
        }
        if (resendApiKey.filter(k -> !k.isBlank()).isPresent()) {
            return "resend";
        }
        if (smtpPassword.filter(p -> !p.isBlank()).isPresent()) {
            return "smtp";
        }
        if (mailMock) {
            return "mock";
        }
        throw new WebApplicationException(
                "E-mail não configurado: adicione RESEND_API_KEY ou SMTP_PASSWORD em api/.env",
                Response.Status.SERVICE_UNAVAILABLE
        );
    }

    private void sendViaResend(String email, String subject, String body) {
        if (resendApiKey.isEmpty() || resendApiKey.get().isBlank()) {
            throw new WebApplicationException(
                    "RESEND_API_KEY não configurada em api/.env",
                    Response.Status.SERVICE_UNAVAILABLE
            );
        }
        var response = resendClient.send(new ResendEmailRequest(fromAddress, List.of(email), subject, body));
        LOG.infof("E-mail enviado via Resend para %s (id=%s)", email, response.id());
    }

    private void sendViaSmtp(String email, String subject, String body) {
        mailer.send(
                Mail.withText(email, subject, body)
                        .setFrom(fromAddress)
        ).await().indefinitely();
        LOG.infof("E-mail enviado via SMTP para %s", email);
    }
}
