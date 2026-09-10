package com.mecatools.web.api;

import com.mecatools.web.models.Usuario;
import com.mecatools.web.services.UsuarioService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.validation.BindingResult;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)

class UsuarioApiControllerTest {

    @Mock
    private UsuarioService usuarioService;

    @Mock
    private BindingResult bindingResult;

    @InjectMocks
    private UsuarioApiController controller;

    @Test
    void debeListarClientes() {
        // Arrange.
        List<Usuario> usuarios = List.of(new Usuario());
        when(usuarioService.listarClientes()).thenReturn(usuarios);
        // Act.
        var response = controller.listar();
        // Assert.
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(usuarios, response.getBody());
    }

    @Test
    void debeRegistrarUsuarioYDevolverResumenPublico() {
        // Arrange: la API solo expone los datos públicos del usuario creado.
        Usuario usuario = new Usuario();
        usuario.setId(8L);
        usuario.setNombres("Carlos");
        usuario.setRol("cliente");
        when(bindingResult.hasErrors()).thenReturn(false);
        when(usuarioService.registrar(usuario)).thenReturn(usuario);
        // Act.
        var response = controller.registro(usuario, bindingResult);
        // Assert.
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(8L, ((java.util.Map<?, ?>) response.getBody()).get("id"));
        assertEquals("Carlos", ((java.util.Map<?, ?>) response.getBody()).get("nombres"));
    }

    @Test
    void debeResponderConflictoSiElCorreoYaEstaRegistrado() {
        // Arrange.
        Usuario usuario = new Usuario();
        when(bindingResult.hasErrors()).thenReturn(false);
        when(usuarioService.registrar(usuario)).thenThrow(new IllegalStateException("Email ya registrado"));
        // Act + Assert.
        assertEquals(HttpStatus.CONFLICT, controller.registro(usuario, bindingResult).getStatusCode());
    }

}
