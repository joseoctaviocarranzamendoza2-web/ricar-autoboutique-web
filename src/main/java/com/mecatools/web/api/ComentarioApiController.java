package com.mecatools.web.api;

import com.mecatools.web.models.Comentario;
import com.mecatools.web.models.Usuario;
import com.mecatools.web.security.UsuarioDetails;
import com.mecatools.web.services.ComentarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.BindingResult;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

// Controlador REST para manejar las operaciones relacionadas con la entidad Comentario.
@RestController
// Mapeo de la ruta base para las operaciones de comentario.
@RequestMapping("/api/comentarios")
// Anotación de Lombok para generar un constructor con los campos finales.
@RequiredArgsConstructor

// Clase de controlador para manejar las solicitudes HTTP relacionadas con la entidad Comentario.
public class ComentarioApiController {

    // Inyección de dependencia del servicio de comentario para manejar la lógica de negocio.
    private final ComentarioService comentarioService;

    // Método para listar todos los comentarios disponibles en la base de datos. Devuelve una respuesta HTTP con el estado OK y la lista de comentarios.
    @GetMapping
    public ResponseEntity<List<Comentario>> listar() {
        return ResponseEntity.ok(comentarioService.listar());
    }

    // Método para obtener un comentario por su ID. Devuelve una respuesta HTTP con el estado OK y el comentario encontrado, o un estado Not Found si no se encuentra.
    @GetMapping("/usuario/{usuarioId}")
    public ResponseEntity<?> obtenerPorUsuario(@PathVariable Long usuarioId) {
        return comentarioService.obtenerPorUsuario(usuarioId).<ResponseEntity<?>>map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    // Método para crear un nuevo comentario. Valida los datos recibidos y devuelve una respuesta HTTP con el estado Created y el comentario creado, o un estado Bad Request si hay errores de validación, o un estado Forbidden si el usuario no tiene permiso para crear el comentario, o un estado Conflict si hay conflictos en la creación del comentario.
    @PostMapping
    public ResponseEntity<?> crear(@Valid @RequestBody Comentario comentario, BindingResult result, Authentication auth) {
        if (result.hasErrors()) {
            String msg = result.getFieldErrors().stream().map(e -> e.getDefaultMessage()).findFirst().orElse("Datos inválidos");
            return ResponseEntity.badRequest().body(Map.of("error", msg));
        }
        Usuario usuario = usuarioDe(auth);
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(comentarioService.crear(comentario, usuario));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        }
    }

    // Método para actualizar un comentario existente. Valida los datos recibidos y devuelve una respuesta HTTP con el estado OK y el comentario actualizado, o un estado Not Found si no se encuentra el comentario, o un estado Forbidden si el usuario no tiene permiso para actualizar el comentario.
    @PutMapping("/usuario/{usuarioId}")
    public ResponseEntity<?> actualizar(@PathVariable Long usuarioId, @Valid @RequestBody Comentario datos, Authentication auth) {
        Usuario usuario = usuarioDe(auth);
        try {
            return ResponseEntity.ok(comentarioService.actualizar(usuarioId, datos, usuario));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Método para eliminar un comentario existente. Devuelve una respuesta HTTP con el estado OK y un mensaje de confirmación, o un estado Not Found si no se encuentra el comentario, o un estado Forbidden si el usuario no tiene permiso para eliminar el comentario.
    @DeleteMapping("/usuario/{usuarioId}")
    public ResponseEntity<?> eliminar(@PathVariable Long usuarioId, Authentication auth) {
        Usuario usuario = usuarioDe(auth);
        try {
            comentarioService.eliminar(usuarioId, usuario);
            return ResponseEntity.ok(Map.of("mensaje", "Comentario eliminado"));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Método privado para obtener el usuario autenticado a partir del objeto Authentication. Devuelve el usuario correspondiente al principal de la autenticación.
    private Usuario usuarioDe(Authentication auth) {
        return ((UsuarioDetails) auth.getPrincipal()).getUsuario();
    }

}
