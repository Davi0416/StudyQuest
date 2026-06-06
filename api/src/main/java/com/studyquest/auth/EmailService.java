package com.studyquest.auth;

import io.quarkus.mailer.Mail;
import io.quarkus.mailer.reactive.ReactiveMailer;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

@ApplicationScoped
public class EmailService {

    private static final Logger LOG = Logger.getLogger(EmailService.class);
    private static final String RESEND_URL = "https://api.resend.com/emails";

    @Inject
    ReactiveMailer mailer;

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
                    "Falha ao enviar e-mail: " + e.getMessage(),
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
                "E-mail não configurado: adicione RESEND_API_KEY ou SMTP_PASSWORD",
                Response.Status.SERVICE_UNAVAILABLE
        );
    }

    private void sendViaResend(String toEmail, String subject, String body) {
        String apiKey = resendApiKey.filter(k -> !k.isBlank()).orElseThrow(() ->
                new WebApplicationException("RESEND_API_KEY não configurada", Response.Status.SERVICE_UNAVAILABLE));

        String json = buildResendJson(fromAddress, toEmail, subject, body);
        LOG.infof("Enviando via Resend — from=%s to=%s", fromAddress, toEmail);

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(RESEND_URL))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = HttpClient.newHttpClient()
                    .send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 400) {
                LOG.errorf("Resend retornou %d: %s", response.statusCode(), response.body());
                throw new WebApplicationException(
                        "Falha ao enviar e-mail (Resend status " + response.statusCode() + "): " + response.body(),
                        Response.Status.SERVICE_UNAVAILABLE
                );
            }

            LOG.infof("E-mail enviado via Resend para %s — resposta: %s", toEmail, response.body());
        } catch (WebApplicationException e) {
            throw e;
        } catch (Exception e) {
            LOG.errorf(e, "Erro HTTP ao chamar Resend para %s", toEmail);
            throw new WebApplicationException("Falha ao enviar e-mail via Resend", Response.Status.SERVICE_UNAVAILABLE);
        }
    }

    private void sendViaSmtp(String email, String subject, String body) {
        mailer.send(
                Mail.withText(email, subject, body)
                        .setFrom(fromAddress)
        ).await().indefinitely();
        LOG.infof("E-mail enviado via SMTP para %s", email);
    }

    private static String buildResendJson(String from, String to, String subject, String text) {
        return "{\"from\":\""   + escape(from)    + "\","
             + "\"to\":[\""    + escape(to)      + "\"],"
             + "\"subject\":\"" + escape(subject) + "\","
             + "\"text\":\""   + escape(text)    + "\"}";
    }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
