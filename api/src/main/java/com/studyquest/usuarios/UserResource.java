package com.studyquest.usuarios;

import com.studyquest.usuarios.dto.UserRequestDTO;
import com.studyquest.usuarios.dto.UserResponseDTO;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestResponse;

import java.util.List;

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
    @Consumes(MediaType.APPLICATION_JSON)
    public RestResponse<UserResponseDTO> createUser(@Valid UserRequestDTO dto) {
        UserResponseDTO responseDTO = userService.createUser(dto);
        return RestResponse.status(RestResponse.Status.CREATED, responseDTO);
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public RestResponse<List<UserResponseDTO>> findAll() {
        List<UserResponseDTO> responseDTOs = userService.listAll();
        return RestResponse.ok(responseDTOs);
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @Path("/{id}")
    public RestResponse<UserResponseDTO> findById(@Valid @PathParam("id") Long id) {
        UserResponseDTO responseDTO = userService.findById(id);
        return RestResponse.ok(responseDTO);
    }
}
