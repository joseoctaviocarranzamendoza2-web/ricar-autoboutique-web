package com.mecatools.web.repositories;

import com.mecatools.web.models.Cita;
import com.mecatools.web.models.Servicio;
import com.mecatools.web.models.Usuario;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import java.time.LocalDate;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest(properties = { "spring.datasource.url=jdbc:h2:mem:mecatools-citas-test", "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=", "spring.jpa.hibernate.ddl-auto=create-drop" })

class CitaRepositoryTest {

    private final CitaRepository citaRepository;
    private final UsuarioRepository usuarioRepository;
    private final ServicioRepository servicioRepository;

    @Autowired
    CitaRepositoryTest(CitaRepository citaRepository, UsuarioRepository usuarioRepository, ServicioRepository servicioRepository) {
        this.citaRepository = citaRepository;
        this.usuarioRepository = usuarioRepository;
        this.servicioRepository = servicioRepository;
    }

    @Test
    void debeEncontrarCitasPorUsuario() {
        // Arrange: se persiste una cita vinculada al usuario consultado.
        Usuario usuario = usuarioRepository.save(usuarioValido("cita@test.com"));
        Servicio servicio = servicioRepository.save(servicioValido());
        citaRepository.save(citaValida(usuario, servicio, LocalDate.of(2030, 1, 10), "10:00"));
        // Act: se filtran las citas por el id de la relación usuario.
        List<Cita> resultado = citaRepository.findByUsuario_Id(usuario.getId());
        // Assert: la consulta devuelve exactamente la cita asociada.
        assertEquals(1, resultado.size());
        assertEquals("10:00", resultado.get(0).getHora());
    }

    @Test
    void debeDetectarHorarioOcupadoYDisponible() {
        // Arrange: se guarda una cita para una combinación fecha-hora concreta.
        Usuario usuario = usuarioRepository.save(usuarioValido("horario@test.com"));
        Servicio servicio = servicioRepository.save(servicioValido());
        citaRepository.save(citaValida(usuario, servicio, LocalDate.of(2030, 2, 15), "14:30"));
        // Assert: la combinación guardada existe y otra combinación permanece libre.
        assertTrue(citaRepository.existsByFechaAndHora(LocalDate.of(2030, 2, 15), "14:30"));
        assertFalse(citaRepository.existsByFechaAndHora(LocalDate.of(2030, 2, 15), "15:30"));
    }

    private Usuario usuarioValido(String email) {
        Usuario usuario = new Usuario();
        usuario.setNombres("Ana");
        usuario.setApellidos("Perez");
        usuario.setEmail(email);
        usuario.setPassword("hash");
        usuario.setTelefono("912345678");
        usuario.setRol("CLIENTE");
        return usuario;
    }

    private Servicio servicioValido() {
        Servicio servicio = new Servicio();
        servicio.setNombre("Diagnostico");
        servicio.setCategoria("Mecanica");
        servicio.setPrecioBase(50.0);
        servicio.setDuracionMinutos(60);
        servicio.setEstado("Activo");
        return servicio;
    }

    private Cita citaValida(Usuario usuario, Servicio servicio, LocalDate fecha, String hora) {
        Cita cita = new Cita();
        cita.setFecha(fecha);
        cita.setHora(hora);
        cita.setVehiculo("Toyota Corolla");
        cita.setEstado("Pendiente");
        cita.setUsuario(usuario);
        cita.setServicio(servicio);
        return cita;
    }

}
