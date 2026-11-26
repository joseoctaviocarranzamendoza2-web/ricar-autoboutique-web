package com.mecatools.web.config;

import com.mecatools.web.models.CategoriaServicio;
import com.mecatools.web.models.Cita;
import com.mecatools.web.models.Rol;
import com.mecatools.web.models.Servicio;
import com.mecatools.web.models.Usuario;
import com.mecatools.web.repositories.CategoriaServicioRepository;
import com.mecatools.web.repositories.CitaRepository;
import com.mecatools.web.repositories.RolRepository;
import com.mecatools.web.repositories.ServicioRepository;
import com.mecatools.web.repositories.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
@Component
public class DataInitializer implements CommandLineRunner {

    private final RolRepository rolRepository;
    private final UsuarioRepository usuarioRepository;
    private final ServicioRepository servicioRepository;
    private final CitaRepository citaRepository;
    private final CategoriaServicioRepository categoriaServicioRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(RolRepository rolRepository, UsuarioRepository usuarioRepository,
                           ServicioRepository servicioRepository, CitaRepository citaRepository,
                           CategoriaServicioRepository categoriaServicioRepository,
                           PasswordEncoder passwordEncoder) {
        this.rolRepository = rolRepository;
        this.usuarioRepository = usuarioRepository;
        this.servicioRepository = servicioRepository;
        this.citaRepository = citaRepository;
        this.categoriaServicioRepository = categoriaServicioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        // Garantiza la existencia de los roles normalizados en la base de datos (3FN)
        Rol rolCliente = obtenerOCrearRol("cliente");
        Rol rolAdmin = obtenerOCrearRol("administrador");
        Rol rolGerente = obtenerOCrearRol("gerente");

        // Garantiza la existencia del servicio "Personalizado" para solicitudes especiales
        Servicio servPersonalizado = servicioRepository.findAll().stream()
                .filter(s -> s.getNombre() != null && s.getNombre().toLowerCase().contains("personalizad"))
                .findFirst()
                .orElseGet(() -> {
                    Servicio s = new Servicio();
                    s.setNombre("Personalizado");
                    s.setCategoria("Personalizado");
                    s.setPrecioBase(0.0);
                    s.setDuracionMinutos(1);
                    s.setEstado("Activo");
                    s.setDescripcion("Servicio a medida según cotización y diagnóstico personalizado.");
                    s.setImagen("");
                    return servicioRepository.save(s);
                });

        boolean actualizarPersonalizado = false;
        if (!"Personalizado".equalsIgnoreCase(servPersonalizado.getNombre())) {
            servPersonalizado.setNombre("Personalizado");
            actualizarPersonalizado = true;
        }
        if (servPersonalizado.getPrecioBase() == null) {
            servPersonalizado.setPrecioBase(0.0);
            actualizarPersonalizado = true;
        }
        if (actualizarPersonalizado) {
            servicioRepository.save(servPersonalizado);
        }

        // Sincroniza y normaliza las relaciones de los servicios regulares existentes con CategoriaServicio (3FN)
        List<Servicio> servicios = servicioRepository.findAll();
        for (Servicio s : servicios) {
            boolean esPersonalizado = s.getNombre() != null && s.getNombre().toLowerCase().contains("personalizad");
            if (!esPersonalizado && s.getCategoriaServicio() == null && s.getCategoria() != null && !s.getCategoria().isBlank()) {
                CategoriaServicio cs = categoriaServicioRepository.findByNombreIgnoreCase(s.getCategoria().trim())
                        .orElseGet(() -> categoriaServicioRepository.save(new CategoriaServicio(s.getCategoria().trim(), "Categoría de servicio: " + s.getCategoria().trim())));
                s.setCategoriaServicio(cs);
                servicioRepository.save(s);
            }
        }

        // Corrige citas existentes generadas desde el modal personalizado para asociarlas al servicio "Personalizado"
        List<Cita> citas = citaRepository.findAll();
        for (Cita c : citas) {
            String notas = c.getNotas() != null ? c.getNotas().toLowerCase() : "";
            if (notas.contains("servicio personalizado") || notas.contains("solicitud de servicio personalizado")) {
                if (c.getServicio() == null || !c.getServicio().getId().equals(servPersonalizado.getId())) {
                    c.setServicio(servPersonalizado);
                    citaRepository.save(c);
                }
            }
        }

        // Sincroniza y correlaciona usuarios existentes con la tabla de unión usuario_rol (3FN)
        List<Usuario> usuarios = usuarioRepository.findAll();
        for (Usuario u : usuarios) {
            if (u.getEstado() == null || u.getEstado().isBlank()) {
                u.setEstado("Activo");
            }
            if (u.getFechaRegistro() == null) {
                u.setFechaRegistro(LocalDate.now());
            }

            // Si el usuario no tiene roles asignados en usuario_rol, inicializa según rol o correo
            if (u.getRoles() == null || u.getRoles().isEmpty()) {
                String rolStr = (u.getRol() != null ? u.getRol() : "").toLowerCase();
                String email = (u.getEmail() != null ? u.getEmail() : "").toLowerCase();

                boolean esGerente = rolStr.contains("gerente") || email.contains("gerente");
                boolean esAdmin = rolStr.contains("admin") || email.contains("admin");

                if (esGerente) {
                    u.getRoles().add(rolCliente);
                    u.getRoles().add(rolAdmin);
                    u.getRoles().add(rolGerente);
                    u.setRol("gerente");
                } else if (esAdmin) {
                    u.getRoles().add(rolCliente);
                    u.getRoles().add(rolAdmin);
                    u.setRol("administrador");
                } else {
                    u.getRoles().add(rolCliente);
                    u.setRol("cliente");
                }
                usuarioRepository.save(u);
            } else {
                // Si ya tiene roles en usuario_rol, preserva todos sus roles y asegura el rol principal
                u.setRol(u.getRol());
                usuarioRepository.save(u);
            }
        }

        // Inicializa o actualiza la cuenta del Gerente Supremo (Autoridad Suprema del sistema con acceso a los 3 roles)
        String emailSupremo = "cmjose21@gmail.com";
        Usuario supremo = usuarioRepository.findByEmailIgnoreCase(emailSupremo).orElse(null);
        if (supremo == null) {
            supremo = new Usuario();
            supremo.setNombres("Jose Octavio");
            supremo.setApellidos("Carranza Mendoza");
            supremo.setEmail(emailSupremo);
            supremo.setPassword(passwordEncoder.encode("Octavio#21Carranza$21"));
            supremo.setTelefono("989879878");
            supremo.setCiudad("Trujillo");
            supremo.setEstado("Activo");
            supremo.setFechaRegistro(LocalDate.now());
            supremo.setPrivilegioIndefinido(true);
            supremo.setDuracionPrivilegio("Indefinido");
            supremo.setRol("gerente");
            supremo.getRoles().clear();
            supremo.getRoles().add(rolCliente);
            supremo.getRoles().add(rolAdmin);
            supremo.getRoles().add(rolGerente);
            usuarioRepository.save(supremo);
        } else {
            supremo.setPassword(passwordEncoder.encode("Octavio#21Carranza$21"));
            supremo.setEstado("Activo");
            supremo.setPrivilegioIndefinido(true);
            supremo.setDuracionPrivilegio("Indefinido");
            supremo.setRol("gerente");
            supremo.getRoles().add(rolCliente);
            supremo.getRoles().add(rolAdmin);
            supremo.getRoles().add(rolGerente);
            usuarioRepository.save(supremo);
        }
    }

    private Rol obtenerOCrearRol(String nombre) {
        return rolRepository.findByNombreIgnoreCase(nombre)
                .orElseGet(() -> rolRepository.save(new Rol(nombre.toLowerCase())));
    }
}
