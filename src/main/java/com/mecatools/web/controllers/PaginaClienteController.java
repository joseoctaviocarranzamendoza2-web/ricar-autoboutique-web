package com.mecatools.web.controllers;

import com.mecatools.web.controllers.util.SesionValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
@RequiredArgsConstructor

// Clase de controlador para manejar las rutas y vistas del panel del cliente.
public class PaginaClienteController {

    // Inyección de dependencia del validador de sesión para verificar la autenticidad y el rol del usuario.
    private final SesionValidator sesionValidator;
    private static final String ROL = "cliente";

    // ---- Navbar 1: páginas públicas con contexto de sesión ----

    @GetMapping("/inicio/cliente/{id}")
    public String inicio(@PathVariable Long id, Authentication auth) {
        return sesionValidator.esValida(auth, ROL, id) ? "navbar/inicio" : "redirect:/inicio";
    }

    @GetMapping("/servicios/cliente/{id}")
    public String servicios(@PathVariable Long id, Authentication auth) {
        return sesionValidator.esValida(auth, ROL, id) ? "navbar/servicios" : "redirect:/inicio";
    }

    @GetMapping("/productos/cliente/{id}")
    public String productos(@PathVariable Long id, Authentication auth) {
        return sesionValidator.esValida(auth, ROL, id) ? "navbar/productos" : "redirect:/inicio";
    }

    @GetMapping("/nosotros/cliente/{id}")
    public String nosotros(@PathVariable Long id, Authentication auth) {
        return sesionValidator.esValida(auth, ROL, id) ? "navbar/nosotros" : "redirect:/inicio";
    }

    @GetMapping("/contacto/cliente/{id}")
    public String contacto(@PathVariable Long id, Authentication auth) {
        return sesionValidator.esValida(auth, ROL, id) ? "navbar/contacto" : "redirect:/inicio";
    }

    // ---- Navbar 2: panel del cliente con pestañas ----

    // Ruta raíz del panel: redirige a la pestaña de perfil por defecto
    @GetMapping("/cliente/{id}")
    public String panel(@PathVariable Long id, Authentication auth) {
        if (!sesionValidator.esValida(auth, ROL, id))
            return "redirect:/inicio";
        return "redirect:/panel/cliente/" + id + "/perfil";
    }

    @GetMapping("/panel/cliente/{id}/perfil")
    public String panelPerfil(@PathVariable Long id, Authentication auth, Model model) {
        if (!sesionValidator.esValida(auth, ROL, id))
            return "redirect:/inicio";
        model.addAttribute("tabActiva", "tab-perfil");
        return "roles/cliente";
    }

    @GetMapping("/panel/cliente/{id}/compras")
    public String panelCompras(@PathVariable Long id, Authentication auth, Model model) {
        if (!sesionValidator.esValida(auth, ROL, id))
            return "redirect:/inicio";
        model.addAttribute("tabActiva", "tab-compras");
        return "roles/cliente";
    }

    @GetMapping("/panel/cliente/{id}/servicios")
    public String panelServicios(@PathVariable Long id, Authentication auth, Model model) {
        if (!sesionValidator.esValida(auth, ROL, id))
            return "redirect:/inicio";
        model.addAttribute("tabActiva", "tab-servicios");
        return "roles/cliente";
    }

    @GetMapping("/panel/cliente/{id}/historial")
    public String panelHistorial(@PathVariable Long id, Authentication auth, Model model) {
        if (!sesionValidator.esValida(auth, ROL, id))
            return "redirect:/inicio";
        model.addAttribute("tabActiva", "tab-historial");
        return "roles/cliente";
    }

}
