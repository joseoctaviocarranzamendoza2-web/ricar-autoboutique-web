package com.mecatools.web.api;

import com.mecatools.web.models.Categoria;
import com.mecatools.web.models.CategoriaServicio;
import com.mecatools.web.services.CategoriaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

// Controlador REST para manejar operaciones relacionadas con las entidades Categoria (Productos y Servicios en 3FN).
@RestController
@RequestMapping("/api/categorias")
public class CategoriaApiController {

    private final CategoriaService categoriaService;

    public CategoriaApiController(CategoriaService categoriaService) {
        this.categoriaService = categoriaService;
    }

    // Lista categorías filtradas por tipo ('producto' o 'servicio'). Por defecto retorna categorías de productos.
    @GetMapping
    public ResponseEntity<?> listar(@RequestParam(required = false) String tipo) {
        if ("servicio".equalsIgnoreCase(tipo) || "servicios".equalsIgnoreCase(tipo)) {
            return ResponseEntity.ok(categoriaService.listarServicios());
        }
        return ResponseEntity.ok(categoriaService.listar());
    }

    // Sub-recurso específico para listar categorías de servicios
    @GetMapping("/servicios")
    public ResponseEntity<List<CategoriaServicio>> listarServicios() {
        return ResponseEntity.ok(categoriaService.listarServicios());
    }

    // Sub-recurso específico para listar categorías de productos
    @GetMapping("/productos")
    public ResponseEntity<List<Categoria>> listarProductos() {
        return ResponseEntity.ok(categoriaService.listar());
    }

    // Obtiene una categoría por su ID y tipo opcional
    @GetMapping("/{id}")
    public ResponseEntity<?> obtener(@PathVariable Long id, @RequestParam(required = false) String tipo) {
        if ("servicio".equalsIgnoreCase(tipo) || "servicios".equalsIgnoreCase(tipo)) {
            return categoriaService.obtenerServicioPorId(id)
                    .<ResponseEntity<?>>map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        }
        return categoriaService.obtenerPorId(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Crea una nueva categoría (Producto o Servicio según el campo 'tipo')
    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Map<String, Object> body) {
        String tipo = body.get("tipo") != null ? body.get("tipo").toString().trim() : "PRODUCTO";
        String nombre = body.get("nombre") != null ? body.get("nombre").toString().trim() : "";
        String descripcion = body.get("descripcion") != null ? body.get("descripcion").toString().trim() : "";

        if (nombre.length() < 2 || nombre.length() > 50) {
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre debe tener entre 2 y 50 caracteres"));
        }
        if (descripcion.length() > 200) {
            return ResponseEntity.badRequest().body(Map.of("error", "La descripción no puede exceder 200 caracteres"));
        }

        try {
            if ("servicio".equalsIgnoreCase(tipo) || "servicios".equalsIgnoreCase(tipo)) {
                CategoriaServicio cs = new CategoriaServicio(nombre, descripcion);
                return ResponseEntity.status(HttpStatus.CREATED).body(categoriaService.crearServicio(cs));
            } else {
                Categoria c = new Categoria();
                c.setNombre(nombre);
                c.setDescripcion(descripcion);
                c.setTipo("PRODUCTO");
                return ResponseEntity.status(HttpStatus.CREATED).body(categoriaService.crear(c));
            }
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        }
    }

    // Edita una categoría existente
    @PutMapping("/{id}")
    public ResponseEntity<?> editar(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String tipo = body.get("tipo") != null ? body.get("tipo").toString().trim() : "PRODUCTO";
        String nombre = body.get("nombre") != null ? body.get("nombre").toString().trim() : "";
        String descripcion = body.get("descripcion") != null ? body.get("descripcion").toString().trim() : "";

        if (nombre.length() < 2 || nombre.length() > 50) {
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre debe tener entre 2 y 50 caracteres"));
        }
        if (descripcion.length() > 200) {
            return ResponseEntity.badRequest().body(Map.of("error", "La descripción no puede exceder 200 caracteres"));
        }

        try {
            if ("servicio".equalsIgnoreCase(tipo) || "servicios".equalsIgnoreCase(tipo)) {
                CategoriaServicio datos = new CategoriaServicio(nombre, descripcion);
                return ResponseEntity.ok(categoriaService.editarServicio(id, datos));
            } else {
                Categoria datos = new Categoria();
                datos.setNombre(nombre);
                datos.setDescripcion(descripcion);
                datos.setTipo("PRODUCTO");
                return ResponseEntity.ok(categoriaService.editar(id, datos));
            }
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        }
    }

    // Elimina una categoría por su ID y tipo opcional
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id, @RequestParam(required = false) String tipo) {
        try {
            if ("servicio".equalsIgnoreCase(tipo) || "servicios".equalsIgnoreCase(tipo)) {
                categoriaService.eliminarServicio(id);
            } else {
                categoriaService.eliminar(id);
            }
            return ResponseEntity.ok(Map.of("mensaje", "Categoría eliminada"));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/servicios/{id}")
    public ResponseEntity<?> eliminarServicioDirecto(@PathVariable Long id) {
        return eliminar(id, "servicio");
    }

    @DeleteMapping("/productos/{id}")
    public ResponseEntity<?> eliminarProductoDirecto(@PathVariable Long id) {
        return eliminar(id, "producto");
    }
}
