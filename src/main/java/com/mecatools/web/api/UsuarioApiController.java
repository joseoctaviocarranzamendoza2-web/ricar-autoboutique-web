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
            // Seguridad: El autoregistro público asigna únicamente el rol base de cliente
            usuario.setRol("cliente");
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

    // Endpoint público para verificar si un email ya está registrado en la base de datos
    @GetMapping("/verificar-email")
    public ResponseEntity<?> verificarEmail(@RequestParam(required = false) String email) {
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email requerido", "existe", false));
        }
        boolean existe = usuarioService.existePorEmail(email.trim());
        return ResponseEntity.ok(Map.of("existe", existe, "email", email.trim().toLowerCase()));
    }

    // Endpoint para consultar los roles disponibles del usuario autenticado
    @GetMapping("/roles-disponibles")
    public ResponseEntity<?> rolesDisponibles(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof UsuarioDetails details)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autenticado"));
        }
        Usuario u = details.getUsuario();
        usuarioService.verificarYActualizarExpiracionPrivilegio(u);

        Map<String, Object> resp = new java.util.LinkedHashMap<>();
        resp.put("id", u.getId());
        resp.put("nombres", u.getNombres());
        resp.put("apellidos", u.getApellidos());
        resp.put("rolActual", u.getRol());
        resp.put("rolBase", u.getRolBase());
        resp.put("roles", u.getNombresRoles());
        resp.put("estado", u.getEstado());
        resp.put("esGerenteSupremo", u.esGerenteSupremo());
        resp.put("fechaFinPrivilegio", u.getFechaFinPrivilegio() != null ? u.getFechaFinPrivilegio().toString() : "");
        resp.put("privilegioIndefinido", u.getPrivilegioIndefinido() != null ? u.getPrivilegioIndefinido() : true);
        resp.put("duracionPrivilegio", u.getDuracionPrivilegio() != null ? u.getDuracionPrivilegio() : "");

        return ResponseEntity.ok(resp);
    }

    // Endpoint exclusivo para el Gerente Supremo: Asignación de roles y privilegios por tiempo
    @PutMapping("/{id}/privilegios")
    public ResponseEntity<?> gestionarPrivilegios(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof UsuarioDetails details)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autenticado"));
        }
        Usuario adminAuth = details.getUsuario();
        if (!adminAuth.esGerenteSupremo()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Solo el Gerente Supremo puede gestionar y asignar privilegios"));
        }

        @SuppressWarnings("unchecked")
        List<String> roles = (List<String>) body.get("roles");
        Boolean indefinido = (Boolean) body.get("indefinido");
        Integer anios = body.get("anios") != null ? ((Number) body.get("anios")).intValue() : 0;
        Integer meses = body.get("meses") != null ? ((Number) body.get("meses")).intValue() : 0;
        Integer semanas = body.get("semanas") != null ? ((Number) body.get("semanas")).intValue() : 0;
        Integer dias = body.get("dias") != null ? ((Number) body.get("dias")).intValue() : 0;
        Integer horas = body.get("horas") != null ? ((Number) body.get("horas")).intValue() : 0;
        String duracionTexto = (String) body.get("duracionTexto");

        try {
            Usuario actualizado = usuarioService.asignarPrivilegios(adminAuth, id, roles, indefinido, anios, meses, semanas, dias, horas, duracionTexto);
            Map<String, Object> resp = new java.util.LinkedHashMap<>();
            resp.put("mensaje", "Privilegios actualizados correctamente");
            resp.put("id", actualizado.getId());
            resp.put("roles", actualizado.getNombresRoles());
            resp.put("rol", actualizado.getRol());
            resp.put("privilegioIndefinido", actualizado.getPrivilegioIndefinido() != null ? actualizado.getPrivilegioIndefinido() : true);
            resp.put("fechaFinPrivilegio", actualizado.getFechaFinPrivilegio() != null ? actualizado.getFechaFinPrivilegio().toString() : "");
            resp.put("duracionPrivilegio", actualizado.getDuracionPrivilegio() != null ? actualizado.getDuracionPrivilegio() : "");
            return ResponseEntity.ok(resp);
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
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

    // Endpoint para habilitar o inhabilitar un usuario (cambio de estado Activo/Inactivo) con motivo y evidencia opcional
    @PatchMapping("/{id}/estado")
    public ResponseEntity<?> cambiarEstado(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof UsuarioDetails details)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autenticado"));
        }
        String nuevoEstado = body != null ? body.get("estado") : null;
        if (nuevoEstado == null || (!nuevoEstado.equalsIgnoreCase("Activo") && !nuevoEstado.equalsIgnoreCase("Inactivo"))) {
            return ResponseEntity.badRequest().body(Map.of("error", "El estado debe ser Activo o Inactivo"));
        }
        String motivo = body != null ? body.get("motivo") : null;
        String evidencia = body != null ? body.get("evidencia") : null;
        try {
            Usuario actualizado = usuarioService.cambiarEstado(details.getUsuario(), id, nuevoEstado, motivo, evidencia);
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

    // Endpoint para que la administración responda a una apelación (aprobar/habilitar o rechazar/mantener inactivo)
    @PostMapping("/{id}/responder-apelacion")
    public ResponseEntity<?> responderApelacion(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof UsuarioDetails details)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No autenticado"));
        }
        String respuesta = body != null ? body.get("respuesta") : null;
        String evidencia = body != null ? body.get("evidencia") : null;
        String decision = body != null ? body.get("decision") : "MANTENER_INACTIVO";
        try {
            Usuario actualizado = usuarioService.responderApelacion(details.getUsuario(), id, respuesta, evidencia, decision);
            return ResponseEntity.ok(Map.of(
                    "mensaje", "Resolución de apelación guardada correctamente",
                    "id", actualizado.getId(),
                    "estado", actualizado.getEstado(),
                    "estadoApelacion", actualizado.getEstadoApelacion()
            ));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Endpoint público para que un cliente inhabilitado envíe una apelación (máximo 1 cada 7 días)
    @PostMapping("/apelar")
    public ResponseEntity<?> apelar(@RequestBody Map<String, String> body) {
        String email = body != null ? body.get("email") : null;
        String mensaje = body != null ? body.get("mensaje") : null;
        try {
            Usuario usuario = usuarioService.apelar(email, mensaje);
            return ResponseEntity.ok(Map.of(
                    "mensaje", "Tu solicitud de apelación ha sido enviada con éxito. El equipo de administración revisará tu caso.",
                    "id", usuario.getId(),
                    "estadoApelacion", usuario.getEstadoApelacion()
            ));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Error al procesar la apelación"));
        }
    }

    // Endpoint público para consultar el estado de cuenta y datos de apelación de un usuario por email
    @GetMapping("/estado-cuenta")
    public ResponseEntity<?> consultarEstadoCuenta(@RequestParam String email) {
        try {
            Map<String, Object> estado = usuarioService.obtenerEstadoCuenta(email);
            return ResponseEntity.ok(estado);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
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
