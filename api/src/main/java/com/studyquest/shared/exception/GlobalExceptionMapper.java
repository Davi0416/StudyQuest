package com.studyquest.shared.exception;

import com.studyquest.shared.response.ApiResponse;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

@Provider
public class GlobalExceptionMapper implements ExceptionMapper<Throwable> {

    @Override
    public Response toResponse(Throwable ex) {
        if (ex instanceof NoBloqueadoException e) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity(ApiResponse.error("NO_BLOQUEADO", e.getMessage()))
                    .build();
        }
        if (ex instanceof RecursoNaoEncontradoException e) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(ApiResponse.error("NAO_ENCONTRADO", e.getMessage()))
                    .build();
        }
        if (ex instanceof WebApplicationException e) {
            return Response.status(e.getResponse().getStatus())
                    .entity(ApiResponse.error("ERRO", e.getMessage()))
                    .build();
        }
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(ApiResponse.error("ERRO_INTERNO", ex.getMessage()))
                .build();
    }
}
