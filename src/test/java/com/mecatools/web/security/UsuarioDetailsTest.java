package com.mecatools.web.security;

import com.mecatools.web.models.Rol;
import com.mecatools.web.models.Usuario;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;

import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;

class UsuarioDetailsTest {

    @Test
    void administradorRecibeAutoridadesDeClienteYAdministrador() {
        Usuario usuario = new Usuario();
        usuario.setRol("administrador");
        usuario.agregarRol(new Rol("administrador"));

        assertEquals(Set.of("cliente", "administrador"), autoridadesDe(usuario));
    }

    @Test
    void gerenteRecibeLosTresRolesDeLaJerarquia() {
        Usuario usuario = new Usuario();
        usuario.setRol("gerente");
        usuario.agregarRol(new Rol("cliente"));
        usuario.agregarRol(new Rol("administrador"));
        usuario.agregarRol(new Rol("gerente"));

        assertEquals(Set.of("cliente", "administrador", "gerente"), autoridadesDe(usuario));
    }

    private Set<String> autoridadesDe(Usuario usuario) {
        return new UsuarioDetails(usuario).getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());
    }
}
