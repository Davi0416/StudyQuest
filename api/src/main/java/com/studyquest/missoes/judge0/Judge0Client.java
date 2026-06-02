package com.studyquest.missoes.judge0;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

@RegisterRestClient(configKey = "judge0")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public interface Judge0Client {

    @POST
    @Path("/submissions?base64_encoded=false&wait=true")
    Judge0SubmissionResponse submit(Judge0SubmissionRequest request);

    @GET
    @Path("/submissions/{token}")
    Judge0SubmissionResponse getResult(@PathParam("token") String token,
                                       @QueryParam("base64_encoded") boolean base64Encoded);
}
