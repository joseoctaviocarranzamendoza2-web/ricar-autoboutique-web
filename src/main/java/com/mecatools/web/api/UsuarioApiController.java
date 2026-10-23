package com.mecatools.web.api;

import com.mecatools.web.models.Usuario;
import com.mecatools.web.security.UsuarioDetails;
import com.mecatools.web.services.UsuarioService;
import jakarta.validation.Valid;
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
public class UsuarioApiController {

    // Inyección de dependencia del servicio de usuario para manejar la lógica de negocio.
    private final UsuarioService usuarioService;

    public UsuarioApiController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

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
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "id", guardado.getId(),
                    "nombres", guardado.getNombres(),
                    "rol", guardado.getRol(),
                    "rolBase", guardado.getRolBase(),
                    "roles", guardado.getNombresRoles(),
                    "estado", guardado.getEstado(),
                    "mensaje", "Usuario registrado correctamente"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        }
    }

    // Endpoint para consultar los roles disponibles del usuario autenticado
    @GetMapping("/roles-disponibles")
    public ResponseEntity<?> rolesDisponibles(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof UsuarioDetails details)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autenticado"));
        }
        Usuario u = details.getUsuario();
        return ResponseEntity.ok(Map.of(
                "id", u.getId(),
                "nombres", u.getNombres(),
                "apellidos", u.getApellidos(),
                "rolActual", u.getRol(),
                "rolBase", u.getRolBase(),
                "roles", u.getNombresRoles(),
                "estado", u.getEstado()
        ));
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

    // Endpoint para habilitar o inhabilitar un usuario (cambio de estado Activo/Inactivo)
    @PatchMapping("/{id}/estado")
    public ResponseEntity<?> cambiarEstado(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof UsuarioDetails details)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autenticado"));
        }
        String nuevoEstado = body != null ? body.get("estado") : null;
        if (nuevoEstado == null || (!nuevoEstado.equalsIgnoreCase("Activo") && !nuevoEstado.equalsIgnoreCase("Inactivo"))) {
            return ResponseEntity.badRequest().body(Map.of("error", "El estado debe ser Activo o Inactivo"));
        }
        try {
            Usuario actualizado = usuarioService.cambiarEstado(details.getUsuario(), id, nuevoEstado);
            return ResponseEntity.ok(Map.of(
                    "mensaje", "Estado del usuario actualizado a " + actualizado.getEstado(),
                    "id", actualizado.getId(),
                    "estado", actualizado.getEstado()
            ));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Método para eliminar un cliente por su ID. Devuelve una respuesta HTTP con el estado OK si se elimina correctamente, o un estado Not Found si no se encuentra el cliente, o un estado Bad Request si hay errores en los datos recibidos, o un estado Conflict si el cliente tiene registros asociados.
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id, @RequestParam(defaultValue = "false") boolean forzar, Authentication auth) {
        if (auth != null && auth.getPrincipal() instanceof UsuarioDetails details) {
            Usuario authUser = details.getUsuario();
            if (authUser.getId().equals(id)) {
                return ResponseEntity.badRequest().body(Map.of("error", "No puedes eliminar tu propia cuenta"));
            }
            Usuario target = usuarioService.obtenerPorId(id).orElse(null);
            if (target != null) {
                boolean authEsGerente = authUser.tieneRol("gerente");
                boolean authEsAdmin = authUser.tieneRol("administrador");
                boolean targetEsGerente = target.tieneRol("gerente");
                boolean targetEsAdmin = target.tieneRol("administrador");
                if (authEsGerente && targetEsGerente) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Un usuario con cuenta creada como gerente no puede eliminar a otro gerente"));
                }
                if (authEsAdmin && !authEsGerente && (targetEsAdmin || targetEsGerente)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Un usuario con cuenta creada como administrador solo puede eliminar clientes"));
                }
            }
        }
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
