package com.studyquest.usuarios;

import com.studyquest.usuarios.dto.UserRequestDTO;
import com.studyquest.usuarios.dto.UserResponseDTO;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestResponse;

import java.util.List;
import java.util.UUID;

@Path("/users")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class UserResource {

    private final UserService userService;

    @Inject
    public UserResource(UserService userService) {
        this.userService = userService;
    }

    @POST
    public RestResponse<UserResponseDTO> createUser(@Valid UserRequestDTO dto) {
        return RestResponse.status(RestResponse.Status.CREATED, userService.createUser(dto));
    }

    @GET
    public RestResponse<List<UserResponseDTO>> findAll() {
        return RestResponse.ok(userService.listAll());
    }

    @GET
    @Path("/{id}")
    public RestResponse<UserResponseDTO> findById(@PathParam("id") UUID id) {
        return RestResponse.ok(userService.findById(id));
    }
}
