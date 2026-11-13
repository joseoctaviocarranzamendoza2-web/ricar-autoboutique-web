package com.mecatools.web.config;

import com.mecatools.web.models.Cita;
import com.mecatools.web.models.Rol;
import com.mecatools.web.models.Servicio;
import com.mecatools.web.models.Usuario;
import com.mecatools.web.repositories.CitaRepository;
import com.mecatools.web.repositories.RolRepository;
import com.mecatools.web.repositories.ServicioRepository;
import com.mecatools.web.repositories.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private final RolRepository rolRepository;
    private final UsuarioRepository usuarioRepository;
    private final ServicioRepository servicioRepository;
    private final CitaRepository citaRepository;

    public DataInitializer(RolRepository rolRepository, UsuarioRepository usuarioRepository,
                           ServicioRepository servicioRepository, CitaRepository citaRepository) {
        this.rolRepository = rolRepository;
        this.usuarioRepository = usuarioRepository;
        this.servicioRepository = servicioRepository;
        this.citaRepository = citaRepository;
    }

    @Override
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

        // Sincroniza y correlaciona usuarios existentes con la tabla de unión
        // usuario_rol
        List<Usuario> usuarios = usuarioRepository.findAll();
        for (Usuario u : usuarios) {
            String rolStr = (u.getRol() != null ? u.getRol() : "").toLowerCase();
            String email = (u.getEmail() != null ? u.getEmail() : "").toLowerCase();

            boolean esGerente = rolStr.contains("gerente") || email.contains("gerente");
            boolean esAdmin = rolStr.contains("admin") || email.contains("admin");

            if (u.getEstado() == null || u.getEstado().isBlank()) {
                u.setEstado("Activo");
            }
            if (u.getFechaRegistro() == null) {
                u.setFechaRegistro(LocalDate.now());
            }

            if (esGerente) {
                u.getRoles().add(rolCliente);
                u.getRoles().add(rolAdmin);
                u.getRoles().add(rolGerente);
                u.setRol("gerente");
                usuarioRepository.save(u);
            } else if (esAdmin) {
                u.getRoles().add(rolCliente);
                u.getRoles().add(rolAdmin);
                u.setRol("administrador");
                usuarioRepository.save(u);
            } else {
                if (u.getRoles().isEmpty()) {
                    u.getRoles().add(rolCliente);
                    u.setRol("cliente");
                    usuarioRepository.save(u);
                } else {
                    usuarioRepository.save(u);
                }
            }
        }
    }

    private Rol obtenerOCrearRol(String nombre) {
        return rolRepository.findByNombreIgnoreCase(nombre)
                .orElseGet(() -> rolRepository.save(new Rol(nombre.toLowerCase())));
    }
}
