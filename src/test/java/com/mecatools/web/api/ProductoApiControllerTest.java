package com.mecatools.web.api;

import com.mecatools.web.models.Producto;
import com.mecatools.web.services.ProductoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.validation.BindingResult;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)

class ProductoApiControllerTest {

    @Mock
    private ProductoService productoService;

    @Mock
    private BindingResult bindingResult;

    @InjectMocks
    private ProductoApiController controller;

    @Test
    void debeListarProductosPorCategoria() {
        // Arrange: el parámetro categoria activa el método filtrado del servicio.
        List<Producto> productos = List.of(new Producto());
        when(productoService.listarPorCategoria(3L)).thenReturn(productos);
        // Act.
        var response = controller.listar(3L);
        // Assert.
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(productos, response.getBody());
        verify(productoService).listarPorCategoria(3L);
    }

    @Test
    void debeResponderNoEncontradoCuandoElProductoNoExiste() {
        // Arrange.
        when(productoService.obtenerPorId(99L)).thenReturn(Optional.empty());
        // Act + Assert.
        assertEquals(HttpStatus.NOT_FOUND, controller.obtener(99L).getStatusCode());
    }

    @Test
    void debeResponderBadRequestAnteErrorDeValidacion() {
        // Arrange: una entidad inválida no debe llegar al servicio.
        Producto producto = new Producto();
        when(bindingResult.hasErrors()).thenReturn(true);
        when(bindingResult.getFieldErrors()).thenReturn(List.of());
        // Act.
        var response = controller.crear(producto, bindingResult);
        // Assert.
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

}
