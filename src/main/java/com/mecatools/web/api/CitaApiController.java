package com.mecatools.web.api;

import com.mecatools.web.models.Cita;
import com.mecatools.web.services.CitaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

// Controlador REST para manejar las operaciones relacionadas con la entidad Cita.
@RestController
// Mapeo de la ruta base para las operaciones de cita.
@RequestMapping("/api/citas")
// Anotación de Lombok para generar un constructor con los campos finales.
@RequiredArgsConstructor

// Clase de controlador para manejar las solicitudes HTTP relacionadas con la entidad Cita.
public class CitaApiController {

    // Inyección de dependencia del servicio de cita para manejar la lógica de negocio.
    private final CitaService citaService;

    // Método para listar todas las citas disponibles en la base de datos. Devuelve una respuesta HTTP con el estado OK y la lista de citas, o filtra por usuario si se proporciona un parámetro.
    @GetMapping
    public ResponseEntity<List<Cita>> listar(@RequestParam(required = false) Long usuario) {
        if (usuario != null) {
            return ResponseEntity.ok(citaService.listarPorUsuario(usuario));
        }
        return ResponseEntity.ok(citaService.listarTodas());
    }

    // Método para verificar la disponibilidad de una cita en una fecha y hora específicas. Devuelve una respuesta HTTP con el estado OK y un mapa indicando si la cita está disponible o no.
    @GetMapping("/disponible")
    public ResponseEntity<Map<String, Boolean>> verificarDisponibilidad(@RequestParam String fecha, @RequestParam String hora) {
        boolean libre = citaService.disponible(LocalDate.parse(fecha), hora);
        return ResponseEntity.ok(Map.of("disponible", libre));
    }

    // Método para crear una nueva cita. Valida los datos recibidos y devuelve una respuesta HTTP con el estado Created y la cita creada, o un estado Bad Request si hay errores de validación o conflictos.
    @PostMapping
    public ResponseEntity<?> crear(@Valid @RequestBody Cita cita, BindingResult result) {
        if (result.hasErrors()) {
            String msg = result.getFieldErrors().stream().map(e -> e.getDefaultMessage()).findFirst().orElse("Datos inválidos");
            return ResponseEntity.badRequest().body(Map.of("error", msg));
        }
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(citaService.crear(cita));
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
            return ResponseEntity.ok(citaService.cambiarEstado(id, body.get("estado")));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Método para cancelar una cita existente. Devuelve una respuesta HTTP con el estado OK y un mensaje de confirmación, o un estado Not Found si no se encuentra la cita.
    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelar(@PathVariable Long id) {
        try {
            citaService.cancelar(id);
            return ResponseEntity.ok(Map.of("mensaje", "Cita cancelada"));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

}
