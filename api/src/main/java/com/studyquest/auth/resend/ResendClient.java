package com.studyquest.auth.resend;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.annotation.RegisterClientHeaders;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

@RegisterRestClient(configKey = "resend-api")
@RegisterClientHeaders(ResendAuthFilter.class)
@Path("/emails")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public interface ResendClient {

    @POST
    ResendEmailResponse send(ResendEmailRequest request);
}
