package com.mecatools.web.api;

import com.mecatools.web.models.Producto;
import com.mecatools.web.services.ProductoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

// Controlador REST para manejar las operaciones relacionadas con la entidad Producto.
@RestController
// Mapeo de la ruta base para las operaciones de producto.
@RequestMapping("/api/productos")
// Anotación de Lombok para generar un constructor con los campos finales.
@RequiredArgsConstructor

// Clase de controlador para manejar las solicitudes HTTP relacionadas con la entidad Producto.
public class ProductoApiController {

    // Inyección de dependencia del servicio de producto para manejar la lógica de negocio.
    private final ProductoService productoService;

    // Método para listar todos los productos disponibles en la base de datos. Devuelve una respuesta HTTP con el estado OK y la lista de productos, o filtra por categoría si se proporciona un parámetro.
    @GetMapping
    public ResponseEntity<List<Producto>> listar(@RequestParam(required = false) Long categoria) {
        if (categoria != null) {
            return ResponseEntity.ok(productoService.listarPorCategoria(categoria));
        }
        return ResponseEntity.ok(productoService.listar());
    }

    // Método para obtener un producto por su ID. Devuelve una respuesta HTTP con el estado OK y el producto encontrado, o un estado Not Found si no se encuentra.
    @GetMapping("/{id}")
    public ResponseEntity<?> obtener(@PathVariable Long id) {
        return productoService.obtenerPorId(id).<ResponseEntity<?>>map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    // Método para crear un nuevo producto. Valida los datos recibidos y devuelve una respuesta HTTP con el estado Created y el producto creado, o un estado Bad Request si hay errores de validación.
    @PostMapping
    public ResponseEntity<?> crear(@Valid @RequestBody Producto producto, BindingResult result) {
        if (result.hasErrors()) {
            String msg = result.getFieldErrors().stream().map(e -> e.getDefaultMessage()).findFirst().orElse("Datos inválidos");
            return ResponseEntity.badRequest().body(Map.of("error", msg));
        }
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(productoService.crear(producto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Método para editar un producto existente. Valida los datos recibidos y devuelve una respuesta HTTP con el estado OK y el producto editado, o un estado Not Found si no se encuentra el producto, o un estado Bad Request si hay errores en los datos recibidos.
    @PutMapping("/{id}")
    public ResponseEntity<?> editar(@PathVariable Long id, @Valid @RequestBody Producto datos, BindingResult result) {
        if (result.hasErrors()) {
            String msg = result.getFieldErrors().stream().map(e -> e.getDefaultMessage()).findFirst().orElse("Datos inválidos");
            return ResponseEntity.badRequest().body(Map.of("error", msg));
        }
        try {
            return ResponseEntity.ok(productoService.editar(id, datos));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Método para eliminar un producto por su ID. Devuelve una respuesta HTTP con el estado OK si se elimina correctamente, o un estado Not Found si no se encuentra el producto.
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        try {
            productoService.eliminar(id);
            return ResponseEntity.ok(Map.of("mensaje", "Producto eliminado"));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

}
