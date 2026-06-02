package com.studyquest.auth.resend;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.core.MultivaluedHashMap;
import jakarta.ws.rs.core.MultivaluedMap;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.rest.client.ext.ClientHeadersFactory;

@ApplicationScoped
public class ResendAuthFilter implements ClientHeadersFactory {

    @ConfigProperty(name = "resend.api-key", defaultValue = "")
    Optional<String> apiKey;

    @Override
    public MultivaluedMap<String, String> update(
            MultivaluedMap<String, String> incomingHeaders,
            MultivaluedMap<String, String> clientOutgoingHeaders
    ) {
        MultivaluedMap<String, String> headers = new MultivaluedHashMap<>();
        apiKey.filter(key -> !key.isBlank())
                .ifPresent(key -> headers.putSingle("Authorization", "Bearer " + key));
        return headers;
    }
}
