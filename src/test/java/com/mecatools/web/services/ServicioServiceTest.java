package com.mecatools.web.services;

import com.mecatools.web.models.Servicio;
import com.mecatools.web.repositories.ServicioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)

class ServicioServiceTest {

    // El repositorio es falso: solo se prueba la lógica de ServicioService.
    @Mock
    private ServicioRepository servicioRepository;

    // Mockito inyecta el mock en el servicio real.
    @InjectMocks
    private ServicioService servicioService;

    @Test
    void debeListarServiciosActivos() {
        // Arrange: el repositorio devuelve únicamente servicios con estado Activo.
        List<Servicio> servicios = List.of(crearServicio("Cambio de aceite", "Activo"));
        when(servicioRepository.findByEstado("Activo")).thenReturn(servicios);
        // Act.
        List<Servicio> resultado = servicioService.listarActivos();
        // Assert: se utiliza el filtro de estado correcto.
        assertEquals(servicios, resultado);
        verify(servicioRepository).findByEstado("Activo");
    }

    @Test
    void debeObtenerServicioPorId() {
        // Arrange.
        Servicio servicio = crearServicio("Cambio de aceite", "Activo");
        when(servicioRepository.findById(1L)).thenReturn(Optional.of(servicio));
        // Act + Assert: se devuelve el servicio encontrado.
        assertEquals(Optional.of(servicio), servicioService.obtenerPorId(1L));
        verify(servicioRepository).findById(1L);
    }

    @Test
    void debeCrearServicio() {
        // Arrange: el guardado devuelve la entidad recibida.
        Servicio servicio = crearServicio("Cambio de aceite", "Activo");
        when(servicioRepository.save(servicio)).thenReturn(servicio);
        // Act.
        Servicio resultado = servicioService.crear(servicio);
        // Assert.
        assertEquals(servicio, resultado);
        verify(servicioRepository).save(servicio);
    }

    @Test
    void debeEditarServicioExistente() {
        // Arrange: se encuentra el servicio y se preparan los nuevos datos.
        Servicio existente = crearServicio("Cambio de aceite", "Activo");
        Servicio datos = crearServicio("Alineacion", "Inactivo");
        when(servicioRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(servicioRepository.save(existente)).thenReturn(existente);
        // Act: el servicio copia los campos editables y guarda la entidad.
        Servicio resultado = servicioService.editar(1L, datos);
        // Assert.
        assertEquals("Alineacion", resultado.getNombre());
        assertEquals("Inactivo", resultado.getEstado());
        verify(servicioRepository).save(existente);
    }

    @Test
    void debeRechazarEliminacionDeServicioInexistente() {
        // Arrange.
        when(servicioRepository.existsById(99L)).thenReturn(false);
        // Act + Assert: la regla evita borrar un id que no existe.
        assertThrows(NoSuchElementException.class, () -> servicioService.eliminar(99L));
        verify(servicioRepository, never()).deleteById(99L);
    }

    private Servicio crearServicio(String nombre, String estado) {
        Servicio servicio = new Servicio();
        servicio.setNombre(nombre);
        servicio.setCategoria("Mantenimiento");
        servicio.setPrecioBase(50.0);
        servicio.setDuracionMinutos(60);
        servicio.setEstado(estado);
        return servicio;
    }

}
