package com.mecatools.web.controllers;

import com.mecatools.web.security.UsuarioDetails;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

// Controlador para renderizar la vista de selección de rol
@Controller
public class RolController {

    /**
     * Sirve la página de selección de rol para cualquier usuario autenticado.
     * Si la sesión del servidor expiró pero el usuario tiene datos en
     * sessionStorage,
     * el JS (rol.js) manejará la autenticación usando los datos locales del
     * navegador.
     * Se eliminó la restricción de solo admin/gerente: cualquier usuario con
     * múltiples
     * roles (incluyendo clientes con roles adicionales) puede acceder a esta
     * pantalla.
     */
    @GetMapping({ "/rol", "/rol.html", "/setupRole", "/seleccionar-rol" })
    public String seleccionarRol(Authentication auth, Model model) {
        // Si hay sesión del servidor, usar los datos del usuario para el template
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UsuarioDetails details) {
            model.addAttribute("usuario", details.getUsuario());
        }
        // Servir la página siempre: si no hay sesión, el JS la manejará con
        // sessionStorage
        return "roles/rol";
    }

}
