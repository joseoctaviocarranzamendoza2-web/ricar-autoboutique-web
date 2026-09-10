package com.mecatools.web.api;

import com.mecatools.web.dto.CrearCompraDTO;
import com.mecatools.web.dto.ItemCarritoDTO;
import com.mecatools.web.models.Compra;
import com.mecatools.web.services.CompraService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.validation.BindingResult;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)

class CompraApiControllerTest {

    @Mock
    private CompraService compraService;

    @Mock
    private BindingResult bindingResult;

    @InjectMocks
    private CompraApiController controller;

    @Test
    void debeCrearCompraYDevolverResumen() {
        // Arrange: el servicio devuelve una compra ya procesada.
        CrearCompraDTO dto = new CrearCompraDTO(2L, List.of(new ItemCarritoDTO(3L, 1)), "Tarjeta");
        Compra compra = new Compra();
        compra.setId(15L);
        compra.setTotal(80.0);
        compra.setFecha("2030-06-01 10:00");
        compra.setEstado("Por entregar");
        compra.setMetodoPago("Tarjeta");
        when(bindingResult.hasErrors()).thenReturn(false);
        when(compraService.procesarCompra(dto)).thenReturn(compra);
        // Act.
        var response = controller.crear(dto, bindingResult);
        // Assert: la API devuelve 201 y el resumen esperado.
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(15L, ((java.util.Map<?, ?>) response.getBody()).get("id"));
        assertEquals(80.0, ((java.util.Map<?, ?>) response.getBody()).get("total"));
        verify(compraService).procesarCompra(dto);
    }

    @Test
    void debeResponderBadRequestSiElServicioRechazaLaCompra() {
        // Arrange.
        CrearCompraDTO dto = new CrearCompraDTO(2L, List.of(new ItemCarritoDTO(3L, 1)), "Efectivo");
        when(bindingResult.hasErrors()).thenReturn(false);
        when(compraService.procesarCompra(dto)).thenThrow(new IllegalArgumentException("Usuario no válido"));
        // Act + Assert.
        assertEquals(HttpStatus.BAD_REQUEST, controller.crear(dto, bindingResult).getStatusCode());
    }

}
