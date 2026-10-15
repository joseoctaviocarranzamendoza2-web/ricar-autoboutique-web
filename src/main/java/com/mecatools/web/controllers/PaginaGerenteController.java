package com.mecatools.web.controllers;

import com.mecatools.web.controllers.util.SesionValidator;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
// Clase de controlador para manejar las rutas y vistas del panel del gerente.
public class PaginaGerenteController {

    // Inyección de dependencia del validador de sesión para verificar la autenticidad y el rol del usuario.
    private final SesionValidator sesionValidator;
    private static final String ROL = "gerente";

    public PaginaGerenteController(SesionValidator sesionValidator) {
        this.sesionValidator = sesionValidator;
    }

    // ---- Navbar: páginas públicas con contexto de sesión ----

    @GetMapping("/inicio/gerente/{id}")
    public String inicio(@PathVariable Long id, Authentication auth) {
        sesionValidator.validarAcceso(auth, ROL, id);
        return "navbar/inicio";
    }

    @GetMapping("/servicios/gerente/{id}")
    public String servicios(@PathVariable Long id, Authentication auth) {
        sesionValidator.validarAcceso(auth, ROL, id);
        return "navbar/servicios";
    }

    @GetMapping("/productos/gerente/{id}")
    public String productos(@PathVariable Long id, Authentication auth) {
        sesionValidator.validarAcceso(auth, ROL, id);
        return "navbar/productos";
    }

    @GetMapping("/nosotros/gerente/{id}")
    public String nosotros(@PathVariable Long id, Authentication auth) {
        sesionValidator.validarAcceso(auth, ROL, id);
        return "navbar/nosotros";
    }

    @GetMapping("/contacto/gerente/{id}")
    public String contacto(@PathVariable Long id, Authentication auth) {
        sesionValidator.validarAcceso(auth, ROL, id);
        return "navbar/contacto";
    }

    // ---- Sidebar: panel del gerente ----

    // Ruta raíz del panel: redirige al resumen general por defecto
    @GetMapping("/gerente/{id}")
    public String panel(@PathVariable Long id, Authentication auth) {
        sesionValidator.validarAcceso(auth, ROL, id);
        return "redirect:/panel/gerente/" + id + "/general/resumen";
    }

    @GetMapping("/panel/gerente/{id}/general/resumen")
    public String panelResumen(@PathVariable Long id, Authentication auth, Model model) {
        sesionValidator.validarAcceso(auth, ROL, id);
        model.addAttribute("seccionActiva", "dashboard");
        return "roles/gerente";
    }

    @GetMapping("/panel/gerente/{id}/analisis/ventas")
    public String panelVentas(@PathVariable Long id, Authentication auth, Model model) {
        sesionValidator.validarAcceso(auth, ROL, id);
        model.addAttribute("seccionActiva", "ventas");
        return "roles/gerente";
    }

    @GetMapping("/panel/gerente/{id}/analisis/reportes")
    public String panelReportes(@PathVariable Long id, Authentication auth, Model model) {
        sesionValidator.validarAcceso(auth, ROL, id);
        model.addAttribute("seccionActiva", "reportes");
        return "roles/gerente";
    }

}
