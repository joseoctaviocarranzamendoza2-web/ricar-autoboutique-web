package com.mecatools.web.api;

import com.mecatools.web.models.Categoria;
import com.mecatools.web.services.CategoriaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

// Controlador REST para manejar las operaciones relacionadas con la entidad Categoria.
@RestController
// Mapeo de la ruta base para las operaciones de categoría.
@RequestMapping("/api/categorias")
// Anotación de Lombok para generar un constructor con los campos finales.
@RequiredArgsConstructor

// Clase de controlador para manejar las solicitudes HTTP relacionadas con la entidad Categoria.
public class CategoriaApiController {

    // Inyección de dependencia del servicio de categoría para manejar la lógica de negocio.
    private final CategoriaService categoriaService;

    // Método para listar todas las categorías disponibles en la base de datos. Devuelve una respuesta HTTP con el estado OK y la lista de categorías.
    @GetMapping
    public ResponseEntity<List<Categoria>> listar() {
        return ResponseEntity.ok(categoriaService.listar());
    }

    // Método para obtener una categoría por su ID. Devuelve una respuesta HTTP con el estado OK y la categoría encontrada, o un estado Not Found si no se encuentra.
    @GetMapping("/{id}")
    public ResponseEntity<?> obtener(@PathVariable Long id) {
        return categoriaService.obtenerPorId(id).<ResponseEntity<?>>map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    // Método para crear una nueva categoría. Valida los datos recibidos y devuelve una respuesta HTTP con el estado Created y la categoría creada, o un estado Bad Request si hay errores de validación.
    @PostMapping
    public ResponseEntity<?> crear(@Valid @RequestBody Categoria categoria, BindingResult result) {
        if (result.hasErrors()) {
            String msg = result.getFieldErrors().stream().map(e -> e.getDefaultMessage()).findFirst().orElse("Datos inválidos");
            return ResponseEntity.badRequest().body(Map.of("error", msg));
        }
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(categoriaService.crear(categoria));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        }
    }

    // Método para editar una categoría existente. Valida los datos recibidos y devuelve una respuesta HTTP con el estado OK y la categoría editada, o un estado Not Found si no se encuentra la categoría.
    @PutMapping("/{id}")
    public ResponseEntity<?> editar(@PathVariable Long id, @Valid @RequestBody Categoria datos, BindingResult result) {
        if (result.hasErrors()) {
            String msg = result.getFieldErrors().stream().map(e -> e.getDefaultMessage()).findFirst().orElse("Datos inválidos");
            return ResponseEntity.badRequest().body(Map.of("error", msg));
        }
        try {
            return ResponseEntity.ok(categoriaService.editar(id, datos));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Método para eliminar una categoría por su ID. Devuelve una respuesta HTTP con el estado OK si se elimina correctamente, o un estado Not Found si no se encuentra la categoría.
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        try {
            categoriaService.eliminar(id);
            return ResponseEntity.ok(Map.of("mensaje", "Categoría eliminada"));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

}
