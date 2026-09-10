package com.mecatools.web.api;

import com.mecatools.web.models.Cita;
import com.mecatools.web.services.CitaService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.validation.BindingResult;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)

class CitaApiControllerTest {

    @Mock
    private CitaService citaService;

    @Mock
    private BindingResult bindingResult;

    @InjectMocks
    private CitaApiController controller;

    @Test
    void debeListarPorUsuarioCuandoSeRecibeElFiltro() {
        // Arrange: la presencia del parámetro usuario debe seleccionar la operación filtrada.
        List<Cita> citas = List.of(new Cita());
        when(citaService.listarPorUsuario(7L)).thenReturn(citas);
        // Act.
        var response = controller.listar(7L);
        // Assert.
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(citas, response.getBody());
        verify(citaService).listarPorUsuario(7L);
    }

    @Test
    void debeInformarDisponibilidadEnLaRespuesta() {
        // Arrange: el servicio indica que el horario está libre.
        when(citaService.disponible(LocalDate.of(2030, 5, 10), "09:00")).thenReturn(true);
        // Act.
        var response = controller.verificarDisponibilidad("2030-05-10", "09:00");
        // Assert: el controlador expone la decisión con la clave pública disponible.
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(true, response.getBody().get("disponible"));
    }

    @Test
    void debeResponderConflictoCuandoElHorarioYaEstaReservado() {
        // Arrange: la validación es correcta, pero crear lanza la regla de horario ocupado.
        Cita cita = new Cita();
        when(bindingResult.hasErrors()).thenReturn(false);
        when(citaService.crear(cita)).thenThrow(new IllegalStateException("Horario ocupado"));
        // Act.
        var response = controller.crear(cita, bindingResult);
        // Assert.
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("Horario ocupado", ((Map<?, ?>) response.getBody()).get("error"));
    }

}
