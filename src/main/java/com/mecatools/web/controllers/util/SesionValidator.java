package com.mecatools.web.controllers.util;

import com.mecatools.web.models.Usuario;
import com.mecatools.web.security.UsuarioDetails;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

@Component

// Clase que valida la sesión activa del usuario
public class SesionValidator {

    // Valida que la sesión activa corresponda al usuario y rol esperados.
    public void validarAcceso(Authentication authentication, String rolEsperado, Long id) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AuthenticationCredentialsNotFoundException("Se requiere una sesión autenticada");
        }
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof UsuarioDetails details)) {
            throw new AccessDeniedException("La identidad autenticada no corresponde a un usuario del sistema");
        }
        Usuario u = details.getUsuario();
        if (u.getId() == null || !u.getId().equals(id)) {
            throw new AccessDeniedException("No tienes permisos para acceder a este recurso");
        }
        boolean tieneAutoridad = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equalsIgnoreCase(rolEsperado));
        if (!tieneAutoridad) {
            throw new AccessDeniedException("No tienes permisos para acceder a este recurso");
        }
    }

}
