package com.mecatools.web.controllers;

import com.mecatools.web.models.Usuario;
import com.mecatools.web.security.UsuarioDetails;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

// Controlador para renderizar la vista de selección de rol
@Controller
public class RolController {

    @GetMapping({"/rol", "/rol.html", "/setupRole", "/seleccionar-rol"})
    public String seleccionarRol(Authentication auth, Model model) {
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof UsuarioDetails details)) {
            return "redirect:/inicio";
        }
        Usuario usuario = details.getUsuario();

        if (!usuario.tieneRol("administrador") && !usuario.tieneRol("gerente")) {
            return "redirect:/cliente/" + usuario.getId();
        }

        model.addAttribute("usuario", usuario);
        return "roles/rol";
    }

}
