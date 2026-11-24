package com.mecatools.web.services;

import com.mecatools.web.models.Cita;
import com.mecatools.web.models.Compra;
import com.mecatools.web.models.Rol;
import com.mecatools.web.models.Usuario;
import com.mecatools.web.repositories.CitaRepository;
import com.mecatools.web.repositories.CompraRepository;
import com.mecatools.web.repositories.RolRepository;
import com.mecatools.web.repositories.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service

// Clase de servicio para manejar operaciones relacionadas con la entidad Usuario.
public class UsuarioService {

    // Inyección de dependencia de los repositorios necesarios para interactuar con la base de datos y el codificador de contraseñas.
    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final CitaRepository citaRepository;
    private final CompraRepository compraRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository, RolRepository rolRepository,
            CitaRepository citaRepository, CompraRepository compraRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.citaRepository = citaRepository;
        this.compraRepository = compraRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // Método para listar usuarios (incluye clientes, administradores y gerentes para control de privilegios)
    // Ordena de forma descendente por ID: El último usuario registrado se muestra primero en la lista
    public List<Usuario> listarClientes() {
        List<Usuario> usuarios = usuarioRepository.findAllByOrderByIdDesc();
        for (Usuario u : usuarios) {
            verificarYActualizarExpiracionPrivilegio(u);
        }
        return usuarios;
    }

    // Método para obtener un usuario por su ID. Devuelve un Optional que puede estar vacío si no se encuentra el usuario.
    public Optional<Usuario> obtenerPorId(Long id) {
        return usuarioRepository.findById(id);
    }

    // Método para verificar si un correo electrónico ya existe registrado en la base de datos (ignorando mayúsculas/minúsculas)
    @Transactional(readOnly = true)
    public boolean existePorEmail(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        return usuarioRepository.existsByEmailIgnoreCase(email.trim());
    }

    // Método para registrar un nuevo usuario con roles normalizados (3FN).
    // Asigna roles acumulativos según jerarquía:
    // - cliente: rol cliente
    // - administrador: rol cliente + administrador
    // - gerente: rol cliente + administrador + gerente
    @Transactional
    public Usuario registrar(Usuario usuario) {
        if (usuario.getPassword() == null || usuario.getPassword().length() < 8 || usuario.getPassword().length() > 30) {
            throw new IllegalArgumentException("La contraseña debe tener entre 8 y 30 caracteres");
        }
        if (usuarioRepository.existsByEmailIgnoreCase(usuario.getEmail())) {
            throw new IllegalStateException("Email ya registrado");
        }
        // El autoregistro público asigna estrictamente el rol base de cliente
        usuario.setRol("cliente");
        usuario.setPrivilegioIndefinido(true);
        usuario.setDuracionPrivilegio("Indefinido");
        String rolPedido = "cliente";
        if (usuario.getCiudad() == null || usuario.getCiudad().isBlank()) {
            usuario.setCiudad("Trujillo");
        }
        if (usuario.getEstado() == null || usuario.getEstado().isBlank()) {
            usuario.setEstado("Activo");
        }
        if (usuario.getFechaRegistro() == null) {
            usuario.setFechaRegistro(LocalDate.now());
        }
        usuario.setPassword(passwordEncoder.encode(usuario.getPassword()));

        // Asigna la correlación de roles en la tabla usuario_rol para cumplir con 3FN
        asignarRolesSegunJerarquia(usuario, rolPedido);

        return usuarioRepository.save(usuario);
    }

    // Método para cambiar el estado (Activo / Inactivo) de un usuario según la jerarquía de roles de creación:
    // - Un usuario con cuenta creada como gerente no puede inhabilitar a otro gerente (solo administradores o clientes).
    // - Un usuario con cuenta creada como administrador solo puede inhabilitar clientes (no administradores ni gerentes).
    // - Ningún usuario puede inhabilitar su propia cuenta.
    @Transactional
    public Usuario cambiarEstado(Usuario usuarioAutenticado, Long idTarget, String nuevoEstado) {
        return cambiarEstado(usuarioAutenticado, idTarget, nuevoEstado, null, null);
    }

    // Cambia el estado del usuario registrando motivo y evidencia opcional de inhabilitación o habilitación
    @Transactional
    public Usuario cambiarEstado(Usuario usuarioAutenticado, Long idTarget, String nuevoEstado, String motivo, String evidencia) {
        if (usuarioAutenticado != null && usuarioAutenticado.getId().equals(idTarget)) {
            throw new IllegalArgumentException("No puedes inhabilitar o cambiar el estado de tu propia cuenta");
        }
        Usuario target = usuarioRepository.findById(idTarget)
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado"));

        if (usuarioAutenticado != null) {
            boolean authEsGerente = usuarioAutenticado.tieneRol("gerente");
            boolean authEsAdmin = usuarioAutenticado.tieneRol("administrador");

            boolean targetEsGerente = target.tieneRol("gerente");
            boolean targetEsAdmin = target.tieneRol("administrador");

            if (authEsGerente) {
                if (targetEsGerente) {
                    throw new SecurityException("Un usuario con cuenta creada como gerente no puede inhabilitar a otro gerente");
                }
            } else if (authEsAdmin) {
                if (targetEsAdmin || targetEsGerente) {
                    throw new SecurityException("Un usuario con cuenta creada como administrador no puede inhabilitar a un administrador o gerente");
                }
            } else {
                throw new SecurityException("No tienes permisos para modificar el estado de usuarios");
            }
        }

        target.setEstado(nuevoEstado);
        LocalDateTime ahora = LocalDateTime.now();

        if ("Inactivo".equalsIgnoreCase(nuevoEstado)) {
            target.setMotivoBloqueo(motivo != null && !motivo.isBlank() ? motivo.trim() : "Cuenta inhabilitada por administración");
            if (evidencia != null && !evidencia.isBlank()) {
                target.setEvidenciaBloqueo(evidencia.trim());
            } else {
                target.setEvidenciaBloqueo(null);
            }
            target.setFechaBloqueo(ahora);
            // Si tenía apelación previa se reinicia para este nuevo bloqueo
            target.setEstadoApelacion(null);
            target.setMensajeApelacion(null);
            target.setFechaApelacion(null);
            target.setRespuestaApelacion(null);
            target.setEvidenciaRespuesta(null);
            target.setFechaRespuestaApelacion(null);
        } else if ("Activo".equalsIgnoreCase(nuevoEstado)) {
            target.setMensajeHabilitacion(motivo != null && !motivo.isBlank() ? motivo.trim() : "Cuenta habilitada por administración");
            if (evidencia != null && !evidencia.isBlank()) {
                target.setEvidenciaHabilitacion(evidencia.trim());
            } else {
                target.setEvidenciaHabilitacion(null);
            }
            target.setFechaHabilitacion(ahora);
            // Si existía apelación pendiente, se marca como respondida
            if ("PENDIENTE".equalsIgnoreCase(target.getEstadoApelacion())) {
                target.setEstadoApelacion("RESPONDIDO");
                target.setRespuestaApelacion(motivo != null && !motivo.isBlank() ? motivo.trim() : "Tu cuenta ha sido reactivada satisfactoriamente.");
                target.setFechaRespuestaApelacion(ahora);
            }
        }

        return usuarioRepository.save(target);
    }

    // Responde a la apelación de un cliente inhabilitado
    @Transactional
    public Usuario responderApelacion(Usuario usuarioAutenticado, Long idTarget, String respuesta, String evidencia, String decision) {
        if (usuarioAutenticado == null || (!usuarioAutenticado.tieneRol("administrador") && !usuarioAutenticado.tieneRol("gerente"))) {
            throw new SecurityException("No tienes permisos para resolver apelaciones");
        }
        Usuario target = usuarioRepository.findById(idTarget)
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado"));

        LocalDateTime ahora = LocalDateTime.now();
        target.setRespuestaApelacion(respuesta != null ? respuesta.trim() : "");
        target.setEvidenciaRespuesta(evidencia != null && !evidencia.isBlank() ? evidencia.trim() : null);
        target.setFechaRespuestaApelacion(ahora);
        target.setEstadoApelacion("RESPONDIDO");

        if ("HABILITAR".equalsIgnoreCase(decision)) {
            target.setEstado("Activo");
            target.setMensajeHabilitacion(respuesta != null ? respuesta.trim() : "Cuenta habilitada tras evaluación de apelación");
            target.setEvidenciaHabilitacion(evidencia != null && !evidencia.isBlank() ? evidencia.trim() : null);
            target.setFechaHabilitacion(ahora);
        }

        return usuarioRepository.save(target);
    }

    // Registra una solicitud de apelación enviada por un cliente inhabilitado (máximo 1 cada 7 días)
    @Transactional
    public Usuario apelar(String email, String mensaje) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("El correo es obligatorio");
        }
        if (mensaje == null || mensaje.trim().length() < 5) {
            throw new IllegalArgumentException("Debes redactar un motivo de apelación detallado (mínimo 5 caracteres)");
        }
        Usuario usuario = usuarioRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new NoSuchElementException("No se encontró ningún usuario con ese correo"));

        if (!"Inactivo".equalsIgnoreCase(usuario.getEstado())) {
            throw new IllegalStateException("Tu cuenta ya se encuentra activa");
        }

        // Validación de 7 días entre apelaciones
        if (usuario.getFechaApelacion() != null) {
            LocalDateTime proximaFecha = usuario.getFechaApelacion().plusDays(7);
            LocalDateTime ahora = LocalDateTime.now();
            if (ahora.isBefore(proximaFecha)) {
                long dias = Duration.between(ahora, proximaFecha).toDays() + 1;
                throw new IllegalStateException("Solo puedes enviar una apelación cada 7 días. Podrás apelar nuevamente en " + dias + " día(s)");
            }
        }

        usuario.setMensajeApelacion(mensaje.trim());
        usuario.setFechaApelacion(LocalDateTime.now());
        usuario.setEstadoApelacion("PENDIENTE");
        usuario.setRespuestaApelacion(null);
        usuario.setEvidenciaRespuesta(null);
        usuario.setFechaRespuestaApelacion(null);

        return usuarioRepository.save(usuario);
    }

    // Consulta el estado de cuenta y datos de apelación de forma pública por email
    @Transactional(readOnly = true)
    public Map<String, Object> obtenerEstadoCuenta(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("El correo es obligatorio");
        }
        Usuario u = usuarioRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado"));

        boolean inactivo = "Inactivo".equalsIgnoreCase(u.getEstado());
        boolean puedeApelar = true;
        long diasRestantes = 0;
        if (u.getFechaApelacion() != null) {
            LocalDateTime proxima = u.getFechaApelacion().plusDays(7);
            LocalDateTime ahora = LocalDateTime.now();
            if (ahora.isBefore(proxima)) {
                puedeApelar = false;
                diasRestantes = Duration.between(ahora, proxima).toDays() + 1;
            }
        }

        Map<String, Object> map = new java.util.LinkedHashMap<>();
        map.put("id", u.getId());
        map.put("nombres", u.getNombres() + " " + u.getApellidos());
        map.put("email", u.getEmail());
        map.put("estado", u.getEstado());
        map.put("inactivo", inactivo);
        map.put("motivoBloqueo", u.getMotivoBloqueo());
        map.put("evidenciaBloqueo", u.getEvidenciaBloqueo());
        map.put("fechaBloqueo", u.getFechaBloqueo() != null ? u.getFechaBloqueo().toString() : null);
        map.put("mensajeApelacion", u.getMensajeApelacion());
        map.put("fechaApelacion", u.getFechaApelacion() != null ? u.getFechaApelacion().toString() : null);
        map.put("estadoApelacion", u.getEstadoApelacion());
        map.put("respuestaApelacion", u.getRespuestaApelacion());
        map.put("evidenciaRespuesta", u.getEvidenciaRespuesta());
        map.put("fechaRespuestaApelacion", u.getFechaRespuestaApelacion() != null ? u.getFechaRespuestaApelacion().toString() : null);
        map.put("mensajeHabilitacion", u.getMensajeHabilitacion());
        map.put("evidenciaHabilitacion", u.getEvidenciaHabilitacion());
        map.put("fechaHabilitacion", u.getFechaHabilitacion() != null ? u.getFechaHabilitacion().toString() : null);
        map.put("puedeApelar", puedeApelar);
        map.put("diasRestantes", diasRestantes);
        return map;
    }

    // Correlaciona los roles de un usuario según la jerarquía establecida por los requerimientos
    public void asignarRolesSegunJerarquia(Usuario usuario, String rolPrincipal) {
        usuario.getRoles().clear();
        Rol rolCliente = obtenerOCrearRol("cliente");
        usuario.agregarRol(rolCliente);

        if ("administrador".equalsIgnoreCase(rolPrincipal)) {
            Rol rolAdmin = obtenerOCrearRol("administrador");
            usuario.agregarRol(rolAdmin);
        } else if ("gerente".equalsIgnoreCase(rolPrincipal)) {
            Rol rolAdmin = obtenerOCrearRol("administrador");
            Rol rolGerente = obtenerOCrearRol("gerente");
            usuario.agregarRol(rolAdmin);
            usuario.agregarRol(rolGerente);
        }
        usuario.setRol(rolPrincipal.toLowerCase());
    }

    // Obtiene un rol de la base de datos o lo crea si aún no existe
    public Rol obtenerOCrearRol(String nombre) {
        return rolRepository.findByNombreIgnoreCase(nombre)
                .orElseGet(() -> rolRepository.save(new Rol(nombre.toLowerCase())));
    }

    // Método para editar el perfil de un usuario existente. Permite actualizar nombres, apellidos, teléfono y ciudad.
    @Transactional
    public Usuario editarPerfil(Long id, Map<String, String> body) {
        Usuario u = usuarioRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Usuario no encontrado"));
        if (body.containsKey("nombres")) u.setNombres(body.get("nombres"));
        if (body.containsKey("apellidos")) u.setApellidos(body.get("apellidos"));
        if (body.containsKey("telefono")) u.setTelefono(body.get("telefono"));
        if (body.containsKey("ciudad")) u.setCiudad(body.get("ciudad"));
        return usuarioRepository.save(u);
    }

    // Método para eliminar un usuario con rol de cliente. Valida la existencia del usuario, verifica que sea un cliente y maneja la eliminación de citas y compras asociadas según el parámetro 'forzar'.
    @Transactional
    public void eliminarCliente(Long id, boolean forzar) {
        Usuario usuario = usuarioRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Usuario no encontrado"));
        if (!usuario.tieneRol("cliente")) {
            throw new IllegalArgumentException("Solo se pueden eliminar usuarios con rol cliente");
        }
        List<Cita> citas = citaRepository.findByUsuario_Id(id);
        List<Compra> compras = compraRepository.findByUsuario_Id(id);
        boolean tieneRegistros = !citas.isEmpty() || !compras.isEmpty();
        if (tieneRegistros && !forzar) {
            throw new RegistrosAsociadosException(citas.size(), compras.size());
        }
        if (tieneRegistros) {
            citaRepository.deleteAll(citas);
            compraRepository.deleteAll(compras);
        }
        usuarioRepository.deleteById(id);
    }

    // Tarea programada en segundo plano que revisa periódicamente privilegios vencidos y los revierte a cliente
    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 60000)
    @Transactional
    public void revisarYExpirarPrivilegios() {
        List<Usuario> usuarios = usuarioRepository.findAll();
        for (Usuario u : usuarios) {
            if (!u.esGerenteSupremo() && u.tienePrivilegioVencido()) {
                revertirACliente(u);
            }
        }
    }

    // Comprueba de forma inmediata si los privilegios del usuario vencieron y revierte su rol a cliente
    @Transactional
    public void verificarYActualizarExpiracionPrivilegio(Usuario u) {
        if (u != null && !u.esGerenteSupremo() && u.tienePrivilegioVencido()) {
            revertirACliente(u);
        }
    }

    // Revoca los privilegios y revierte al usuario al rol estándar de cliente
    @Transactional
    public void revertirACliente(Usuario u) {
        Rol rolCliente = rolRepository.findByNombreIgnoreCase("cliente")
                .orElseGet(() -> rolRepository.save(new Rol("cliente")));
        u.getRoles().clear();
        u.getRoles().add(rolCliente);
        u.setRol("cliente");
        u.setPrivilegioIndefinido(true);
        u.setFechaFinPrivilegio(null);
        u.setDuracionPrivilegio(null);
        usuarioRepository.save(u);
    }

    // Asignación de roles y privilegios por tiempo gestionada exclusivamente por el Gerente Supremo
    @Transactional
    public Usuario asignarPrivilegios(Usuario adminAuth, Long idTarget, List<String> rolesNombres,
                                      Boolean indefinido, Integer anios, Integer meses, Integer semanas,
                                      Integer dias, Integer horas, String duracionTexto) {
        if (adminAuth == null || !adminAuth.esGerenteSupremo()) {
            throw new SecurityException("Solo el Gerente Supremo puede gestionar y asignar privilegios a los usuarios");
        }
        Usuario target = usuarioRepository.findById(idTarget)
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado"));

        if (target.esGerenteSupremo()) {
            throw new IllegalArgumentException("No se pueden alterar los privilegios de la cuenta Gerente Supremo");
        }

        if (rolesNombres == null || rolesNombres.isEmpty()) {
            rolesNombres = List.of("cliente");
        }

        target.getRoles().clear();
        for (String rNombre : rolesNombres) {
            String rNorm = rNombre.trim().toLowerCase();
            Rol rol = rolRepository.findByNombreIgnoreCase(rNorm)
                    .orElseGet(() -> rolRepository.save(new Rol(rNorm)));
            target.getRoles().add(rol);
        }

        // Determina el rol más alto en base a la jerarquía cliente < administrador < gerente
        if (rolesNombres.stream().anyMatch(r -> r.equalsIgnoreCase("gerente"))) {
            target.setRol("gerente");
        } else if (rolesNombres.stream().anyMatch(r -> r.equalsIgnoreCase("administrador"))) {
            target.setRol("administrador");
        } else {
            target.setRol("cliente");
        }

        boolean esSoloCliente = target.getRoles().size() == 1 && target.tieneRol("cliente");
        if (esSoloCliente || Boolean.TRUE.equals(indefinido)) {
            target.setPrivilegioIndefinido(true);
            target.setFechaFinPrivilegio(null);
            target.setDuracionPrivilegio("Indefinido");
        } else {
            target.setPrivilegioIndefinido(false);
            int y = anios != null ? Math.max(0, anios) : 0;
            int m = meses != null ? Math.max(0, meses) : 0;
            int w = semanas != null ? Math.max(0, semanas) : 0;
            int d = dias != null ? Math.max(0, dias) : 0;
            int h = horas != null ? Math.max(0, horas) : 0;

            java.time.LocalDateTime expira = java.time.LocalDateTime.now()
                    .plusYears(y)
                    .plusMonths(m)
                    .plusWeeks(w)
                    .plusDays(d)
                    .plusHours(h);

            target.setFechaFinPrivilegio(expira);
            target.setDuracionPrivilegio(duracionTexto != null && !duracionTexto.isBlank() ? duracionTexto : "Temporal");
        }

        return usuarioRepository.save(target);
    }

    // Excepción específica para el caso 409 con datos adicionales (cantidad de citas/compras)
    public static class RegistrosAsociadosException extends RuntimeException {
        public final int citas;
        public final int compras;
        public RegistrosAsociadosException(int citas, int compras) {
            super("Este cliente tiene citas o compras registradas");
            this.citas = citas;
            this.compras = compras;
        }
    }

}
