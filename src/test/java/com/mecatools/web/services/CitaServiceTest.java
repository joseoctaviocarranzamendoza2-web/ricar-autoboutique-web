package com.mecatools.web.services;

import com.mecatools.web.models.Cita;
import com.mecatools.web.models.Servicio;
import com.mecatools.web.models.Usuario;
import com.mecatools.web.repositories.CitaRepository;
import com.mecatools.web.repositories.ServicioRepository;
import com.mecatools.web.repositories.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.LocalDate;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)

class CitaServiceTest {

    @Mock
    private CitaRepository citaRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private ServicioRepository servicioRepository;

    @InjectMocks
    private CitaService citaService;

    @Test
    void debeIndicarSiUnHorarioEstaDisponible() {
        // Arrange: el repositorio informa que no existe una cita en ese horario.
        LocalDate fecha = LocalDate.of(2030, 1, 10);
        when(citaRepository.existsByFechaAndHora(fecha, "10:00")).thenReturn(false);
        // Act + Assert.
        assertTrue(citaService.disponible(fecha, "10:00"));
    }

    @Test
    void debeIndicarSiUnHorarioEstaOcupado() {
        // Arrange.
        LocalDate fecha = LocalDate.of(2030, 1, 10);
        when(citaRepository.existsByFechaAndHora(fecha, "10:00")).thenReturn(true);
        // Act + Assert: disponible es la negación de existsByFechaAndHora.
        assertFalse(citaService.disponible(fecha, "10:00"));
    }

    @Test
    void debeCrearCitaPendienteConUsuarioYServicioValidos() {
        // Arrange: ambas relaciones existen y el horario está libre.
        Cita cita = crearCita();
        when(usuarioRepository.existsById(1L)).thenReturn(true);
        when(servicioRepository.existsById(2L)).thenReturn(true);
        when(citaRepository.existsByFechaAndHora(cita.getFecha(), cita.getHora())).thenReturn(false);
        when(citaRepository.save(cita)).thenReturn(cita);
        // Act.
        Cita resultado = citaService.crear(cita);
        // Assert: una cita nueva comienza en estado Pendiente.
        assertEquals("Pendiente", resultado.getEstado());
        verify(citaRepository).save(cita);
    }

    @Test
    void debeRechazarCitaConHorarioOcupado() {
        // Arrange: el usuario y servicio son válidos, pero el horario ya está reservado.
        Cita cita = crearCita();
        when(usuarioRepository.existsById(1L)).thenReturn(true);
        when(servicioRepository.existsById(2L)).thenReturn(true);
        when(citaRepository.existsByFechaAndHora(cita.getFecha(), cita.getHora())).thenReturn(true);
        // Act + Assert.
        assertThrows(IllegalStateException.class, () -> citaService.crear(cita));
        verify(citaRepository, never()).save(cita);
    }

    @Test
    void debeCambiarEstadoDeCitaExistente() {
        // Arrange.
        Cita cita = crearCita();
        when(citaRepository.findById(1L)).thenReturn(Optional.of(cita));
        when(citaRepository.save(cita)).thenReturn(cita);
        // Act.
        Cita resultado = citaService.cambiarEstado(1L, "Confirmada");
        // Assert.
        assertEquals("Confirmada", resultado.getEstado());
        verify(citaRepository).save(cita);
    }

    private Cita crearCita() {
        Usuario usuario = new Usuario();
        usuario.setId(1L);
        Servicio servicio = new Servicio();
        servicio.setId(2L);
        Cita cita = new Cita();
        cita.setFecha(LocalDate.of(2030, 1, 10));
        cita.setHora("10:00");
        cita.setUsuario(usuario);
        cita.setServicio(servicio);
        return cita;
    }

}
