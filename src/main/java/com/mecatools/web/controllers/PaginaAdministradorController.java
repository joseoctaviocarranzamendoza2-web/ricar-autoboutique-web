package com.mecatools.web.controllers;

import com.mecatools.web.controllers.util.SesionValidator;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
// Clase de controlador para manejar las rutas y vistas del panel de administración.
public class PaginaAdministradorController {

    // Inyección de dependencia del validador de sesión para verificar la autenticidad y el rol del usuario.
    private final SesionValidator sesionValidator;
    private static final String ROL = "administrador";

    public PaginaAdministradorController(SesionValidator sesionValidator) {
        this.sesionValidator = sesionValidator;
    }

    // ---- Navbar: páginas públicas con contexto de sesión ----

    @GetMapping("/inicio/administrador/{id}")
    public String inicio(@PathVariable Long id, Authentication auth) {
        sesionValidator.validarAcceso(auth, ROL, id);
        return "navbar/inicio";
    }

    @GetMapping("/servicios/administrador/{id}")
    public String servicios(@PathVariable Long id, Authentication auth) {
        sesionValidator.validarAcceso(auth, ROL, id);
        return "navbar/servicios";
    }

    @GetMapping("/productos/administrador/{id}")
    public String productos(@PathVariable Long id, Authentication auth) {
        sesionValidator.validarAcceso(auth, ROL, id);
        return "navbar/productos";
    }

    @GetMapping("/nosotros/administrador/{id}")
    public String nosotros(@PathVariable Long id, Authentication auth) {
        sesionValidator.validarAcceso(auth, ROL, id);
        return "navbar/nosotros";
    }

    @GetMapping("/contacto/administrador/{id}")
    public String contacto(@PathVariable Long id, Authentication auth) {
        sesionValidator.validarAcceso(auth, ROL, id);
        return "navbar/contacto";
    }

    // ---- Sidebar: panel del administrador ----

    // Ruta raíz del panel: redirige a la sección de citas por defecto
    @GetMapping("/administrador/{id}")
    public String panel(@PathVariable Long id, Authentication auth) {
        sesionValidator.validarAcceso(auth, ROL, id);
        return "redirect:/panel/administrador/" + id + "/reservas/citas";
    }

    @GetMapping("/panel/administrador/{id}/reservas/citas")
    public String panelCitas(@PathVariable Long id, Authentication auth, Model model) {
        sesionValidator.validarAcceso(auth, ROL, id);
        model.addAttribute("seccionActiva", "citas");
        return "roles/administrador";
    }

    @GetMapping("/panel/administrador/{id}/catalogo/productos")
    public String panelProductos(@PathVariable Long id, Authentication auth, Model model) {
        sesionValidator.validarAcceso(auth, ROL, id);
        model.addAttribute("seccionActiva", "productos");
        return "roles/administrador";
    }

    @GetMapping("/panel/administrador/{id}/catalogo/servicios")
    public String panelServicios(@PathVariable Long id, Authentication auth, Model model) {
        sesionValidator.validarAcceso(auth, ROL, id);
        model.addAttribute("seccionActiva", "servicios");
        return "roles/administrador";
    }

    @GetMapping("/panel/administrador/{id}/catalogo/categorias")
    public String panelCategorias(@PathVariable Long id, Authentication auth, Model model) {
        sesionValidator.validarAcceso(auth, ROL, id);
        model.addAttribute("seccionActiva", "categorias");
        return "roles/administrador";
    }

    @GetMapping("/panel/administrador/{id}/gestion/clientes")
    public String panelClientes(@PathVariable Long id, Authentication auth, Model model) {
        sesionValidator.validarAcceso(auth, ROL, id);
        model.addAttribute("seccionActiva", "clientes");
        return "roles/administrador";
    }

}
