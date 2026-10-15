package com.mecatools.web.config;

import com.mecatools.web.models.Rol;
import com.mecatools.web.models.Usuario;
import com.mecatools.web.repositories.RolRepository;
import com.mecatools.web.repositories.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private final RolRepository rolRepository;
    private final UsuarioRepository usuarioRepository;

    public DataInitializer(RolRepository rolRepository, UsuarioRepository usuarioRepository) {
        this.rolRepository = rolRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public void run(String... args) {
        // Garantiza la existencia de los roles normalizados en la base de datos (3FN)
        Rol rolCliente = obtenerOCrearRol("cliente");
        Rol rolAdmin = obtenerOCrearRol("administrador");
        Rol rolGerente = obtenerOCrearRol("gerente");

        // Sincroniza y correlaciona usuarios existentes con la tabla de unión
        // usuario_rol
        List<Usuario> usuarios = usuarioRepository.findAll();
        for (Usuario u : usuarios) {
            String rolStr = (u.getRol() != null ? u.getRol() : "").toLowerCase();
            String email = (u.getEmail() != null ? u.getEmail() : "").toLowerCase();

            boolean esGerente = rolStr.contains("gerente") || email.contains("gerente");
            boolean esAdmin = rolStr.contains("admin") || email.contains("admin");

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
                }
            }
        }
    }

    private Rol obtenerOCrearRol(String nombre) {
        return rolRepository.findByNombreIgnoreCase(nombre)
                .orElseGet(() -> rolRepository.save(new Rol(nombre.toLowerCase())));
    }
}
