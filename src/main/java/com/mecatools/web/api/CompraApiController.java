package com.mecatools.web.api;

import com.mecatools.web.dto.CrearCompraDTO;
import com.mecatools.web.models.Compra;
import com.mecatools.web.services.CompraService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

// Controlador REST para manejar las operaciones relacionadas con la entidad Compra.
@RestController
// Mapeo de la ruta base para las operaciones de compra.
@RequestMapping("/api/compras")
// Anotación de Lombok para generar un constructor con los campos finales.
@RequiredArgsConstructor

// Clase de controlador para manejar las solicitudes HTTP relacionadas con la entidad Compra.
public class CompraApiController {

    // Inyección de dependencia del servicio de compra para manejar la lógica de negocio.
    private final CompraService compraService;

    // Método para listar todas las compras disponibles en la base de datos. Devuelve una respuesta HTTP con el estado OK y la lista de compras, o filtra por usuario si se proporciona un parámetro.
    @GetMapping
    public ResponseEntity<List<Compra>> listar(@RequestParam(required = false) Long usuario) {
        if (usuario != null) {
            return ResponseEntity.ok(compraService.listarPorUsuario(usuario));
        }
        return ResponseEntity.ok(compraService.listarTodas());
    }

    // Método para crear una nueva compra. Valida los datos recibidos y devuelve una respuesta HTTP con el estado Created y la compra creada, o un estado Bad Request si hay errores de validación o conflictos.
    @PostMapping
    public ResponseEntity<?> crear(@Valid @RequestBody CrearCompraDTO dto, BindingResult result) {
        if (result.hasErrors()) {
            String msg = result.getFieldErrors().stream().map(e -> e.getDefaultMessage()).findFirst().orElse("Datos inválidos");
            return ResponseEntity.badRequest().body(Map.of("error", msg));
        }
        try {
            Compra guardada = compraService.procesarCompra(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", guardada.getId(), "total", guardada.getTotal(), "fecha", guardada.getFecha(), "estado", guardada.getEstado(), "metodoPago", guardada.getMetodoPago(), "mensaje", "Compra realizada correctamente"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        }
    }

    // Método para cambiar el estado de una compra existente. Devuelve una respuesta HTTP con el estado OK y la compra actualizada, o un estado Not Found si no se encuentra la compra, o un estado Bad Request si hay errores en el cambio de estado.
    @PatchMapping("/{id}/estado")
    public ResponseEntity<?> cambiarEstado(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(compraService.cambiarEstado(id, body.get("estado")));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

}
