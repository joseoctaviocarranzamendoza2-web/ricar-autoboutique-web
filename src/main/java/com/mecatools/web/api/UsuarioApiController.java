package com.mecatools.web.api;

import com.mecatools.web.models.Usuario;
import com.mecatools.web.security.UsuarioDetails;
import com.mecatools.web.services.UsuarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

// Controlador REST para manejar las operaciones relacionadas con la entidad Usuario.
@RestController
// Mapeo de la ruta base para las operaciones de usuario.
@RequestMapping("/api/usuarios")
// Anotación de Lombok para generar un constructor con los campos finales.
@RequiredArgsConstructor

// Clase de controlador para manejar las solicitudes HTTP relacionadas con la entidad Usuario.
public class UsuarioApiController {

    // Inyección de dependencia del servicio de usuario para manejar la lógica de negocio.
    private final UsuarioService usuarioService;

    // Método para listar todos los clientes disponibles en la base de datos. Devuelve una respuesta HTTP con el estado OK y la lista de clientes.
    @GetMapping
    public ResponseEntity<List<Usuario>> listar() {
        return ResponseEntity.ok(usuarioService.listarClientes());
    }

    // Método para obtener un cliente por su ID. Devuelve una respuesta HTTP con el estado OK y el cliente encontrado, o un estado Not Found si no se encuentra.
    @GetMapping("/{id}")
    public ResponseEntity<?> obtener(@PathVariable Long id) {
        return usuarioService.obtenerPorId(id).<ResponseEntity<?>>map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    // Método para registrar un nuevo usuario. Valida los datos recibidos y devuelve una respuesta HTTP con el estado Created y el usuario registrado, o un estado Bad Request si hay errores de validación, o un estado Conflict si el usuario ya existe.
    @PostMapping("/registro")
    public ResponseEntity<?> registro(@Valid @RequestBody Usuario usuario, BindingResult result) {
        if (result.hasErrors()) {
            String msg = result.getFieldErrors().stream().map(e -> e.getDefaultMessage()).findFirst().orElse("Datos inválidos");
            return ResponseEntity.badRequest().body(Map.of("error", msg));
        }
        try {
            Usuario guardado = usuarioService.registrar(usuario);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", guardado.getId(), "nombres", guardado.getNombres(), "rol", guardado.getRol(), "mensaje", "Usuario registrado correctamente"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        }
    }

    // Método para editar el perfil de un cliente existente. Valida los datos recibidos y devuelve una respuesta HTTP con el estado OK y el cliente editado, o un estado Not Found si no se encuentra el cliente.
    @PutMapping("/{id}")
    public ResponseEntity<?> editarPerfil(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        UsuarioDetails usuarioAutenticado = (UsuarioDetails) auth.getPrincipal();
        boolean esAdministrador = auth.getAuthorities().stream().anyMatch(a -> "administrador".equals(a.getAuthority()));
        if (!esAdministrador && !id.equals(usuarioAutenticado.getUsuario().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "No puedes editar otro usuario"));
        }
        try {
            return ResponseEntity.ok(usuarioService.editarPerfil(id, body));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Método para eliminar un cliente por su ID. Devuelve una respuesta HTTP con el estado OK si se elimina correctamente, o un estado Not Found si no se encuentra el cliente, o un estado Bad Request si hay errores en los datos recibidos, o un estado Conflict si el cliente tiene registros asociados.
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id, @RequestParam(defaultValue = "false") boolean forzar) {
        try {
            usuarioService.eliminarCliente(id, forzar);
            return ResponseEntity.ok(Map.of("mensaje", "Cliente eliminado correctamente"));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (UsuarioService.RegistrosAsociadosException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage(), "tieneRegistros", true, "citas", e.citas, "compras", e.compras));
        }
    }

}
