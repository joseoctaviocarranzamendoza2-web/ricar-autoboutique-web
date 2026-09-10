package com.mecatools.web.api;

import com.mecatools.web.models.Categoria;
import com.mecatools.web.services.CategoriaService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.validation.BindingResult;
import java.util.List;
import java.util.NoSuchElementException;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)

class CategoriaApiControllerTest {

    @Mock
    private CategoriaService categoriaService;

    @Mock
    private BindingResult bindingResult;

    @InjectMocks
    private CategoriaApiController controller;

    @Test
    void debeListarCategoriasConRespuestaOk() {
        // Arrange: el servicio devuelve las categorías disponibles.
        List<Categoria> categorias = List.of(new Categoria());
        when(categoriaService.listar()).thenReturn(categorias);
        // Act.
        var response = controller.listar();
        // Assert: el controlador conserva los datos y el estado HTTP exitoso.
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(categorias, response.getBody());
        verify(categoriaService).listar();
    }

    @Test
    void debeResponderConflictoCuandoLaCategoriaEstaDuplicada() {
        // Arrange: la validación es correcta, pero el servicio detecta duplicidad.
        Categoria categoria = new Categoria();
        when(bindingResult.hasErrors()).thenReturn(false);
        when(categoriaService.crear(categoria)).thenThrow(new IllegalStateException("Ya existe"));
        // Act.
        var response = controller.crear(categoria, bindingResult);
        // Assert: la regla de negocio se traduce a HTTP 409.
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("Ya existe", ((java.util.Map<?, ?>) response.getBody()).get("error"));
    }

    @Test
    void debeResponderNoEncontradoAlEditarCategoriaInexistente() {
        // Arrange: el servicio indica que el id no existe.
        Categoria datos = new Categoria();
        when(bindingResult.hasErrors()).thenReturn(false);
        when(categoriaService.editar(99L, datos)).thenThrow(new NoSuchElementException());
        // Act + Assert.
        assertEquals(HttpStatus.NOT_FOUND, controller.editar(99L, datos, bindingResult).getStatusCode());
    }

}
