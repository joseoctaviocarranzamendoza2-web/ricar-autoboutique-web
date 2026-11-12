package com.mecatools.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestExecutionListeners;
import org.springframework.test.context.support.DependencyInjectionTestExecutionListener;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.BindingResult;

import com.mecatools.web.api.CitaApiController;
import com.mecatools.web.models.Cita;
import com.mecatools.web.models.Rol;
import com.mecatools.web.models.Servicio;
import com.mecatools.web.models.Usuario;
import com.mecatools.web.repositories.CitaRepository;
import com.mecatools.web.repositories.RolRepository;
import com.mecatools.web.repositories.ServicioRepository;
import com.mecatools.web.repositories.UsuarioRepository;
import com.mecatools.web.services.CitaService;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import jakarta.validation.groups.Default;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:cita-expirada-jpa;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.jwt.secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="
})
@TestExecutionListeners({ DependencyInjectionTestExecutionListener.class })
class CitaExpiradaIntegrationTest {

    @Autowired
    private CitaApiController citaApiController;

    @Autowired
    private CitaService citaService;

    @Autowired
    private CitaRepository citaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private ServicioRepository servicioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private Validator validator;

    private Usuario admin;
    private Servicio servicio;

    @BeforeEach
    void prepararDatos() {
        Rol rolAdmin = rolRepository.findByNombreIgnoreCase("administrador").orElseThrow();
        admin = new Usuario();
        admin.setNombres("Admin");
        admin.setApellidos("Test");
        admin.setEmail("admin-cita-" + UUID.randomUUID() + "@example.test");
        admin.setPassword(passwordEncoder.encode("PruebaSegura123!"));
        admin.setTelefono("912345678");
        admin.setCiudad("Trujillo");
        admin.setRol("administrador");
        admin.getRoles().add(rolAdmin);
        admin = usuarioRepository.saveAndFlush(admin);
        assertEquals(LocalDate.now(), admin.getFechaRegistro());

        servicio = new Servicio();
        servicio.setNombre("Sistema Eléctrico");
        servicio.setCategoria("Electricidad");
        servicio.setPrecioBase(80.0);
        servicio.setDuracionMinutos(60);
        servicio.setEstado("Activo");
        servicio = servicioRepository.saveAndFlush(servicio);
    }

    @Test
    void citaExpiradaNoSePuedeConfirmarPeroSiCancelarSinError() {
        Cita citaExpirada = crearCitaEnBd(LocalDate.now().minusDays(10), "10:00 – 11:00", "Pendiente");

        ResponseEntity<?> respConfirmar = citaApiController.cambiarEstado(citaExpirada.getId(), Map.of("estado", "Confirmada"));
        assertEquals(400, respConfirmar.getStatusCode().value());
        assertTrue(String.valueOf(respConfirmar.getBody()).toLowerCase().contains("expir"));
        assertEquals("Pendiente", citaRepository.findById(citaExpirada.getId()).orElseThrow().getEstado());

        ResponseEntity<?> respCompletar = citaApiController.cambiarEstado(citaExpirada.getId(), Map.of("estado", "Completada"));
        assertEquals(400, respCompletar.getStatusCode().value());
        assertEquals("Pendiente", citaRepository.findById(citaExpirada.getId()).orElseThrow().getEstado());

        ResponseEntity<?> respCancelar = citaApiController.cambiarEstado(citaExpirada.getId(), Map.of("estado", "Cancelada"));
        assertEquals(200, respCancelar.getStatusCode().value());
        assertEquals("Cancelada", citaRepository.findById(citaExpirada.getId()).orElseThrow().getEstado());
    }

    @Test
    void citaExpiradaPermiteDeleteCancelarYCreacionSigueExigiendoFechaFutura() {
        Cita citaExpirada = crearCitaEnBd(LocalDate.now().minusDays(3), "08:00 – 09:00", "Pendiente");

        ResponseEntity<?> respDelete = citaApiController.cancelar(citaExpirada.getId());
        assertEquals(200, respDelete.getStatusCode().value());
        assertEquals("Cancelada", citaRepository.findById(citaExpirada.getId()).orElseThrow().getEstado());

        Cita nuevaPasada = new Cita();
        nuevaPasada.setFecha(LocalDate.now().minusDays(1));
        nuevaPasada.setHora("10:00 – 11:00");
        nuevaPasada.setVehiculo("Toyota Corolla 2019");
        nuevaPasada.setEstado("Pendiente");
        nuevaPasada.setUsuario(admin);
        nuevaPasada.setServicio(servicio);

        Set<ConstraintViolation<Cita>> violacionesOnCreate = validator.validate(nuevaPasada, Default.class, Cita.OnCreate.class);
        assertFalse(violacionesOnCreate.isEmpty());

        BindingResult bindingResult = new BeanPropertyBindingResult(nuevaPasada, "cita");
        assertThrows(IllegalArgumentException.class, () -> citaService.crear(nuevaPasada));
        ResponseEntity<?> respCrear = citaApiController.crear(nuevaPasada, bindingResult);
        assertEquals(400, respCrear.getStatusCode().value());
    }

    @Test
    void citaConfirmadaPreviamenteSePuedeMarcarCompletadaLuegoYConfirmarFuturaFunciona() {
        Cita yaConfirmada = crearCitaEnBd(LocalDate.now().minusDays(1), "09:00 – 10:00", "Confirmada");
        ResponseEntity<?> respCompletar = citaApiController.cambiarEstado(yaConfirmada.getId(), Map.of("estado", "Completada"));
        assertEquals(200, respCompletar.getStatusCode().value());
        assertEquals("Completada", citaRepository.findById(yaConfirmada.getId()).orElseThrow().getEstado());

        Cita futura = crearCitaEnBd(LocalDate.now().plusDays(2), "14:00 – 15:00", "Pendiente");
        ResponseEntity<?> respConfirmar = citaApiController.cambiarEstado(futura.getId(), Map.of("estado", "Confirmada"));
        assertEquals(200, respConfirmar.getStatusCode().value());
        assertEquals("Confirmada", citaRepository.findById(futura.getId()).orElseThrow().getEstado());

        ResponseEntity<?> respCompletarPrematura = citaApiController.cambiarEstado(futura.getId(), Map.of("estado", "Completada"));
        assertEquals(400, respCompletarPrematura.getStatusCode().value());
        assertEquals("Confirmada", citaRepository.findById(futura.getId()).orElseThrow().getEstado());

        LocalDateTime haceUnosMinutos = LocalDateTime.now().minusMinutes(2);
        String horaFinPasada = haceUnosMinutos.minusHours(1).format(DateTimeFormatter.ofPattern("HH:mm"))
                + " – " + haceUnosMinutos.format(DateTimeFormatter.ofPattern("HH:mm"));
        Cita citaHoyFinalizada = crearCitaEnBd(haceUnosMinutos.toLocalDate(), horaFinPasada, "Confirmada");
        ResponseEntity<?> respCompletarHoy = citaApiController.cambiarEstado(citaHoyFinalizada.getId(), Map.of("estado", "Completada"));
        assertEquals(200, respCompletarHoy.getStatusCode().value());
        assertEquals("Completada", citaRepository.findById(citaHoyFinalizada.getId()).orElseThrow().getEstado());
    }

    @Test
    void permiteHastaTresVehiculosPorFechaYHoraYLiberaCupoAlCancelar() {
        LocalDate fechaSlot = LocalDate.now().plusDays(5);
        String horaSlot = "10:00 – 11:00";

        Long idPrimera = null;
        for (int i = 1; i <= 3; i++) {
            Cita nueva = new Cita();
            nueva.setFecha(fechaSlot);
            nueva.setHora(i == 2 ? "10:00 - 11:00" : horaSlot);
            nueva.setVehiculo("Toyota Yaris 202" + i);
            nueva.setEstado("Pendiente");
            nueva.setUsuario(admin);
            nueva.setServicio(servicio);
            BindingResult br = new BeanPropertyBindingResult(nueva, "cita");
            ResponseEntity<?> resp = citaApiController.crear(nueva, br);
            assertEquals(201, resp.getStatusCode().value());
            if (i == 1) {
                idPrimera = ((Cita) resp.getBody()).getId();
            }
        }

        // Con 3 vehículos reservados, el horario aparece no disponible (ocupadas = 3, restantes = 0)
        ResponseEntity<Map<String, Object>> dispLleno = citaApiController.verificarDisponibilidad(fechaSlot.toString(), horaSlot);
        assertEquals(200, dispLleno.getStatusCode().value());
        assertEquals(false, dispLleno.getBody().get("disponible"));
        assertEquals(3L, dispLleno.getBody().get("ocupadas"));
        assertEquals(0L, dispLleno.getBody().get("restantes"));

        // El 4to vehículo en la misma fecha y horario debe ser rechazado con 409 Conflict
        Cita cuarta = new Cita();
        cuarta.setFecha(fechaSlot);
        cuarta.setHora(horaSlot);
        cuarta.setVehiculo("Nissan Sentra 2022");
        cuarta.setEstado("Pendiente");
        cuarta.setUsuario(admin);
        cuarta.setServicio(servicio);
        BindingResult brCuarta = new BeanPropertyBindingResult(cuarta, "cita");
        ResponseEntity<?> respCuarta = citaApiController.crear(cuarta, brCuarta);
        assertEquals(409, respCuarta.getStatusCode().value());

        // Si se cancela una de las 3 citas, el cupo vuelve a estar disponible (2/3) y se permite agendar un reemplazo
        ResponseEntity<?> respCancelar = citaApiController.cambiarEstado(idPrimera, Map.of("estado", "Cancelada"));
        assertEquals(200, respCancelar.getStatusCode().value());

        ResponseEntity<Map<String, Object>> dispLiberado = citaApiController.verificarDisponibilidad(fechaSlot.toString(), horaSlot);
        assertEquals(true, dispLiberado.getBody().get("disponible"));
        assertEquals(2L, dispLiberado.getBody().get("ocupadas"));
        assertEquals(1L, dispLiberado.getBody().get("restantes"));

        Cita reemplazo = new Cita();
        reemplazo.setFecha(fechaSlot);
        reemplazo.setHora(horaSlot);
        reemplazo.setVehiculo("Honda Civic 2021");
        reemplazo.setEstado("Pendiente");
        reemplazo.setUsuario(admin);
        reemplazo.setServicio(servicio);
        ResponseEntity<?> respReemplazo = citaApiController.crear(reemplazo, new BeanPropertyBindingResult(reemplazo, "cita"));
        assertEquals(201, respReemplazo.getStatusCode().value());

        @SuppressWarnings("unchecked")
        Map<String, Object> bodyOcupacion = (Map<String, Object>) citaApiController.obtenerOcupacionPorFecha(fechaSlot.toString()).getBody();
        assertEquals(3, bodyOcupacion.get("capacidad"));
        @SuppressWarnings("unchecked")
        Map<String, Long> mapaHorarios = (Map<String, Long>) bodyOcupacion.get("ocupacion");
        assertEquals(3L, mapaHorarios.get(horaSlot));

        // Las solicitudes "Por confirmar" de servicio personalizado no deben bloquearse al superar 3 en el mismo día
        LocalDate fechaPersonalizada = LocalDate.now().plusDays(6);
        for (int i = 1; i <= 4; i++) {
            Cita pers = new Cita();
            pers.setFecha(fechaPersonalizada);
            pers.setHora("Por confirmar");
            pers.setVehiculo("Kia Rio 202" + i);
            pers.setEstado("Pendiente");
            pers.setUsuario(admin);
            pers.setServicio(servicio);
            ResponseEntity<?> respPers = citaApiController.crear(pers, new BeanPropertyBindingResult(pers, "cita"));
            assertEquals(201, respPers.getStatusCode().value());
        }
    }

    private Cita crearCitaEnBd(LocalDate fecha, String hora, String estado) {
        Cita cita = new Cita();
        cita.setFecha(fecha);
        cita.setHora(hora);
        cita.setVehiculo("Toyota Corolla 2019");
        cita.setEstado(estado);
        cita.setUsuario(admin);
        cita.setServicio(servicio);
        return citaRepository.saveAndFlush(cita);
    }
}
