package com.mecatools.web.api;

import com.mecatools.web.models.Cita;
import com.mecatools.web.services.CitaService;
import jakarta.validation.groups.Default;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

// Controlador REST para manejar las operaciones relacionadas con la entidad Cita.
@RestController
// Mapeo de la ruta base para las operaciones de cita.
@RequestMapping("/api/citas")
// Clase de controlador para manejar las solicitudes HTTP relacionadas con la entidad Cita.
public class CitaApiController {

    // Inyección de dependencia del servicio de cita para manejar la lógica de negocio.
    private final CitaService citaService;
    private final Object slotLock = new Object();

    public CitaApiController(CitaService citaService) {
        this.citaService = citaService;
    }

    // Método para listar todas las citas disponibles en la base de datos. Devuelve una respuesta HTTP con el estado OK y la lista de citas, o filtra por usuario si se proporciona un parámetro.
    @GetMapping
    public ResponseEntity<List<Cita>> listar(@RequestParam(required = false) Long usuario) {
        if (usuario != null) {
            return ResponseEntity.ok(citaService.listarPorUsuario(usuario));
        }
        return ResponseEntity.ok(citaService.listarTodas());
    }

    // Verifica la disponibilidad y cupos restantes para una fecha y horario (capacidad máxima de 3 vehículos).
    @GetMapping("/disponible")
    public ResponseEntity<Map<String, Object>> verificarDisponibilidad(@RequestParam String fecha, @RequestParam String hora) {
        LocalDate fechaLocal = LocalDate.parse(fecha);
        long ocupadas = citaService.contarActivasEnHorario(fechaLocal, hora);
        boolean libre = citaService.disponible(fechaLocal, hora);
        long restantes = Math.max(0L, CitaService.MAX_VEHICULOS_POR_HORARIO - ocupadas);
        return ResponseEntity.ok(Map.of(
                "disponible", libre,
                "ocupadas", ocupadas,
                "capacidad", CitaService.MAX_VEHICULOS_POR_HORARIO,
                "restantes", restantes));
    }

    // Lista la ocupación por horario para una fecha específica para mostrar cupos disponibles u ocupados al cliente.
    @GetMapping("/ocupacion")
    public ResponseEntity<?> obtenerOcupacionPorFecha(@RequestParam String fecha) {
        try {
            LocalDate fechaLocal = LocalDate.parse(fecha);
            Map<String, Long> ocupacion = citaService.obtenerOcupacionPorFecha(fechaLocal);
            return ResponseEntity.ok(Map.of(
                    "fecha", fechaLocal.toString(),
                    "capacidad", CitaService.MAX_VEHICULOS_POR_HORARIO,
                    "ocupacion", ocupacion));
        } catch (DateTimeParseException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Formato de fecha inválido"));
        }
    }

    // Método para crear una nueva cita. Valida los datos recibidos y sincroniza el control de aforo por horario antes de persistir.
    @PostMapping
    public ResponseEntity<?> crear(@Validated({ Default.class, Cita.OnCreate.class }) @RequestBody Cita cita, BindingResult result) {
        if (result.hasErrors()) {
            String msg = result.getFieldErrors().stream().map(e -> e.getDefaultMessage()).findFirst().orElse("Datos inválidos");
            return ResponseEntity.badRequest().body(Map.of("error", msg));
        }
        try {
            synchronized (slotLock) {
                return ResponseEntity.status(HttpStatus.CREATED).body(citaService.crear(cita));
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        }
    }

    // Método para cambiar el estado de una cita existente. Devuelve una respuesta HTTP con el estado OK y la cita actualizada, o un estado Not Found si no se encuentra la cita, o un estado Bad Request si hay errores en los datos recibidos.
    @PatchMapping("/{id}/estado")
    public ResponseEntity<?> cambiarEstado(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            String nuevoEstado = body.get("estado");
            String motivo = body.get("motivoCancelacion");
            String evidencia = body.get("evidenciaCancelacion");
            String canceladoPor = body.get("canceladoPor");
            return ResponseEntity.ok(citaService.cambiarEstado(id, nuevoEstado, motivo, evidencia, canceladoPor));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Sobrecarga de conveniencia para cancelar cita con solo el ID (usado en tests y llamadas internas)
    public ResponseEntity<?> cancelar(Long id) {
        return cancelar(id, null, null);
    }

    // Método para cancelar una cita existente. Devuelve una respuesta HTTP con el estado OK y un mensaje de confirmación, o un estado Not Found si no se encuentra la cita.
    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelar(
            @PathVariable Long id,
            @RequestParam(required = false) String canceladoPor,
            @RequestParam(required = false) String motivo) {
        try {
            String autor = (canceladoPor != null && !canceladoPor.isBlank()) ? canceladoPor : "Cliente";
            citaService.cancelar(id, autor, motivo, null);
            return ResponseEntity.ok(Map.of("mensaje", "Cita cancelada"));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

}
