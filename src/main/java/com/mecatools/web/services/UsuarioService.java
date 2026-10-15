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

    // Método para listar todos los clientes (incluye a administradores y gerentes que también tienen el rol de cliente)
    public List<Usuario> listarClientes() {
        return usuarioRepository.findByRol("cliente");
    }

    // Método para obtener un usuario por su ID. Devuelve un Optional que puede estar vacío si no se encuentra el usuario.
    public Optional<Usuario> obtenerPorId(Long id) {
        return usuarioRepository.findById(id);
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
        if (usuarioRepository.findByEmail(usuario.getEmail()).isPresent()) {
            throw new IllegalStateException("Email ya registrado");
        }
        String rolPedido = usuario.getRol();
        if (rolPedido == null || rolPedido.isBlank()) {
            rolPedido = "cliente";
        }
        if (usuario.getCiudad() == null || usuario.getCiudad().isBlank()) {
            usuario.setCiudad("Trujillo");
        }
        usuario.setPassword(passwordEncoder.encode(usuario.getPassword()));

        // Asigna la correlación de roles en la tabla usuario_rol para cumplir con 3FN
        asignarRolesSegunJerarquia(usuario, rolPedido);

        return usuarioRepository.save(usuario);
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
