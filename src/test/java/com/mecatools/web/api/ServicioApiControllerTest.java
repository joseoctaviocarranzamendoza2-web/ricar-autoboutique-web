package com.mecatools.web.api;

import com.mecatools.web.models.Servicio;
import com.mecatools.web.services.ServicioService;
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

class ServicioApiControllerTest {

    @Mock
    private ServicioService servicioService;

    @Mock
    private BindingResult bindingResult;

    @InjectMocks
    private ServicioApiController controller;

    @Test
    void debeListarServiciosActivos() {
        // Arrange.
        List<Servicio> servicios = List.of(new Servicio());
        when(servicioService.listarActivos()).thenReturn(servicios);
        // Act.
        var response = controller.listarActivos();
        // Assert.
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(servicios, response.getBody());
    }

    @Test
    void debeCrearServicioConRespuestaCreated() {
        // Arrange: una validación limpia permite delegar la creación.
        Servicio servicio = new Servicio();
        when(bindingResult.hasErrors()).thenReturn(false);
        when(servicioService.crear(servicio)).thenReturn(servicio);
        // Act.
        var response = controller.crear(servicio, bindingResult);
        // Assert.
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(servicio, response.getBody());
    }

}
