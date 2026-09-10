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

// Clase de controlador para manejar las rutas y vistas del panel del gerente.
public class PaginaGerenteController {

    // Inyección de dependencia del validador de sesión para verificar la autenticidad y el rol del usuario.
    private final SesionValidator sesionValidator;
    private static final String ROL = "gerente";

    // ---- Navbar: páginas públicas con contexto de sesión ----

    @GetMapping("/inicio/gerente/{id}")
    public String inicio(@PathVariable Long id, Authentication auth) {
        return sesionValidator.esValida(auth, ROL, id) ? "navbar/inicio" : "redirect:/inicio";
    }

    @GetMapping("/servicios/gerente/{id}")
    public String servicios(@PathVariable Long id, Authentication auth) {
        return sesionValidator.esValida(auth, ROL, id) ? "navbar/servicios" : "redirect:/inicio";
    }

    @GetMapping("/productos/gerente/{id}")
    public String productos(@PathVariable Long id, Authentication auth) {
        return sesionValidator.esValida(auth, ROL, id) ? "navbar/productos" : "redirect:/inicio";
    }

    @GetMapping("/nosotros/gerente/{id}")
    public String nosotros(@PathVariable Long id, Authentication auth) {
        return sesionValidator.esValida(auth, ROL, id) ? "navbar/nosotros" : "redirect:/inicio";
    }

    @GetMapping("/contacto/gerente/{id}")
    public String contacto(@PathVariable Long id, Authentication auth) {
        return sesionValidator.esValida(auth, ROL, id) ? "navbar/contacto" : "redirect:/inicio";
    }

    // ---- Sidebar: panel del gerente ----

    // Ruta raíz del panel: redirige al resumen general por defecto
    @GetMapping("/gerente/{id}")
    public String panel(@PathVariable Long id, Authentication auth) {
        if (!sesionValidator.esValida(auth, ROL, id))
            return "redirect:/inicio";
        return "redirect:/panel/gerente/" + id + "/general/resumen";
    }

    @GetMapping("/panel/gerente/{id}/general/resumen")
    public String panelResumen(@PathVariable Long id, Authentication auth, Model model) {
        if (!sesionValidator.esValida(auth, ROL, id))
            return "redirect:/inicio";
        model.addAttribute("seccionActiva", "dashboard");
        return "roles/gerente";
    }

    @GetMapping("/panel/gerente/{id}/analisis/ventas")
    public String panelVentas(@PathVariable Long id, Authentication auth, Model model) {
        if (!sesionValidator.esValida(auth, ROL, id))
            return "redirect:/inicio";
        model.addAttribute("seccionActiva", "ventas");
        return "roles/gerente";
    }

    @GetMapping("/panel/gerente/{id}/analisis/reportes")
    public String panelReportes(@PathVariable Long id, Authentication auth, Model model) {
        if (!sesionValidator.esValida(auth, ROL, id))
            return "redirect:/inicio";
        model.addAttribute("seccionActiva", "reportes");
        return "roles/gerente";
    }

}
