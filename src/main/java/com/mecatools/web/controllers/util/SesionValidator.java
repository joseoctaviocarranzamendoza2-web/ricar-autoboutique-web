package com.mecatools.web.controllers.util;

import com.mecatools.web.models.Usuario;
import com.mecatools.web.security.UsuarioDetails;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component

// Clase que valida la sesión activa del usuario
public class SesionValidator {

    // Verifica que la sesión activa corresponda al rol e id esperados
    public boolean esValida(Authentication authentication, String rolEsperado, Long id) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof UsuarioDetails details)) {
            return false;
        }
        Usuario u = details.getUsuario();
        return u.getId().equals(id) && u.getRol().equalsIgnoreCase(rolEsperado);
    }

}
