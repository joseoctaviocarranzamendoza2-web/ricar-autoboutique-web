package com.mecatools.web.api;

import com.mecatools.web.models.Comentario;
import com.mecatools.web.models.Usuario;
import com.mecatools.web.security.UsuarioDetails;
import com.mecatools.web.services.ComentarioService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)

class ComentarioApiControllerTest {

    @Mock
    private ComentarioService comentarioService;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private ComentarioApiController controller;

    @Test
    void debeListarComentarios() {
        // Arrange.
        List<Comentario> comentarios = List.of(new Comentario());
        when(comentarioService.listar()).thenReturn(comentarios);
        // Act.
        var response = controller.listar();
        // Assert.
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(comentarios, response.getBody());
    }

    @Test
    void debeCrearComentarioConElUsuarioAutenticado() {
        // Arrange: el principal contiene el usuario que debe recibir el servicio.
        Usuario usuario = new Usuario();
        usuario.setId(4L);
        usuario.setRol("cliente");
        when(authentication.getPrincipal()).thenReturn(new UsuarioDetails(usuario));
        when(comentarioService.crear(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.same(usuario))).thenAnswer(invocation -> invocation.getArgument(0));
        Comentario comentario = new Comentario();
        org.springframework.validation.BindingResult result = org.mockito.Mockito.mock(org.springframework.validation.BindingResult.class);
        when(result.hasErrors()).thenReturn(false);
        // Act.
        var response = controller.crear(comentario, result, authentication);
        // Assert: la operación se crea y usa la identidad autenticada.
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(comentarioService).crear(comentario, usuario);
    }

}
