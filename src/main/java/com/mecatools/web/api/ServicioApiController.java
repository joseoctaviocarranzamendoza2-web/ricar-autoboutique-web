package com.mecatools.web.api;

import com.mecatools.web.models.Servicio;
import com.mecatools.web.services.ServicioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

// Controlador REST para manejar las operaciones relacionadas con la entidad Servicio.
@RestController
// Mapeo de la ruta base para las operaciones de servicio.
@RequestMapping("/api/servicios")
// Anotación de Lombok para generar un constructor con los campos finales.
@RequiredArgsConstructor

// Clase de controlador para manejar las solicitudes HTTP relacionadas con la entidad Servicio.
public class ServicioApiController {

    // Inyección de dependencia del servicio de servicio para manejar la lógica de negocio.
    private final ServicioService servicioService;

    // Método para listar todos los servicios disponibles en la base de datos. Devuelve una respuesta HTTP con el estado OK y la lista de servicios.
    @GetMapping
    public ResponseEntity<List<Servicio>> listar() {
        return ResponseEntity.ok(servicioService.listar());
    }

    // Método para listar todos los servicios activos disponibles en la base de datos. Devuelve una respuesta HTTP con el estado OK y la lista de servicios activos.
    @GetMapping("/activos")
    public ResponseEntity<List<Servicio>> listarActivos() {
        return ResponseEntity.ok(servicioService.listarActivos());
    }

    // Método para obtener un servicio por su ID. Devuelve una respuesta HTTP con el estado OK y el servicio encontrado, o un estado Not Found si no se encuentra.
    @GetMapping("/{id}")
    public ResponseEntity<?> obtener(@PathVariable Long id) {
        return servicioService.obtenerPorId(id).<ResponseEntity<?>>map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    // Método para crear un nuevo servicio. Valida los datos recibidos y devuelve una respuesta HTTP con el estado Created y el servicio creado, o un estado Bad Request si hay errores de validación.
    @PostMapping
    public ResponseEntity<?> crear(@Valid @RequestBody Servicio servicio, BindingResult result) {
        if (result.hasErrors()) {
            String msg = result.getFieldErrors().stream().map(e -> e.getDefaultMessage()).findFirst().orElse("Datos inválidos");
            return ResponseEntity.badRequest().body(Map.of("error", msg));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(servicioService.crear(servicio));
    }

    // Método para editar un servicio existente. Valida los datos recibidos y devuelve una respuesta HTTP con el estado OK y el servicio editado, o un estado Not Found si no se encuentra el servicio, o un estado Bad Request si hay errores en los datos recibidos.
    @PutMapping("/{id}")
    public ResponseEntity<?> editar(@PathVariable Long id, @Valid @RequestBody Servicio datos, BindingResult result) {
        if (result.hasErrors()) {
            String msg = result.getFieldErrors().stream().map(e -> e.getDefaultMessage()).findFirst().orElse("Datos inválidos");
            return ResponseEntity.badRequest().body(Map.of("error", msg));
        }
        try {
            return ResponseEntity.ok(servicioService.editar(id, datos));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Método para eliminar un servicio por su ID. Devuelve una respuesta HTTP con el estado OK si se elimina correctamente, o un estado Not Found si no se encuentra el servicio.
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        try {
            servicioService.eliminar(id);
            return ResponseEntity.ok(Map.of("mensaje", "Servicio eliminado"));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

}
