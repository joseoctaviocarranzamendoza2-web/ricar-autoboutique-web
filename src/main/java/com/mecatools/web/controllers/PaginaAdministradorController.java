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

// Clase de controlador para manejar las rutas y vistas del panel de administración.
public class PaginaAdministradorController {

    // Inyección de dependencia del validador de sesión para verificar la autenticidad y el rol del usuario.
    private final SesionValidator sesionValidator;
    private static final String ROL = "administrador";

    // ---- Navbar: páginas públicas con contexto de sesión ----

    @GetMapping("/inicio/administrador/{id}")
    public String inicio(@PathVariable Long id, Authentication auth) {
        return sesionValidator.esValida(auth, ROL, id) ? "navbar/inicio" : "redirect:/inicio";
    }

    @GetMapping("/servicios/administrador/{id}")
    public String servicios(@PathVariable Long id, Authentication auth) {
        return sesionValidator.esValida(auth, ROL, id) ? "navbar/servicios" : "redirect:/inicio";
    }

    @GetMapping("/productos/administrador/{id}")
    public String productos(@PathVariable Long id, Authentication auth) {
        return sesionValidator.esValida(auth, ROL, id) ? "navbar/productos" : "redirect:/inicio";
    }

    @GetMapping("/nosotros/administrador/{id}")
    public String nosotros(@PathVariable Long id, Authentication auth) {
        return sesionValidator.esValida(auth, ROL, id) ? "navbar/nosotros" : "redirect:/inicio";
    }

    @GetMapping("/contacto/administrador/{id}")
    public String contacto(@PathVariable Long id, Authentication auth) {
        return sesionValidator.esValida(auth, ROL, id) ? "navbar/contacto" : "redirect:/inicio";
    }

    // ---- Sidebar: panel del administrador ----

    // Ruta raíz del panel: redirige a la sección de citas por defecto
    @GetMapping("/administrador/{id}")
    public String panel(@PathVariable Long id, Authentication auth) {
        if (!sesionValidator.esValida(auth, ROL, id))
            return "redirect:/inicio";
        return "redirect:/panel/administrador/" + id + "/reservas/citas";
    }

    @GetMapping("/panel/administrador/{id}/reservas/citas")
    public String panelCitas(@PathVariable Long id, Authentication auth, Model model) {
        if (!sesionValidator.esValida(auth, ROL, id))
            return "redirect:/inicio";
        model.addAttribute("seccionActiva", "citas");
        return "roles/administrador";
    }

    @GetMapping("/panel/administrador/{id}/catalogo/productos")
    public String panelProductos(@PathVariable Long id, Authentication auth, Model model) {
        if (!sesionValidator.esValida(auth, ROL, id))
            return "redirect:/inicio";
        model.addAttribute("seccionActiva", "productos");
        return "roles/administrador";
    }

    @GetMapping("/panel/administrador/{id}/catalogo/servicios")
    public String panelServicios(@PathVariable Long id, Authentication auth, Model model) {
        if (!sesionValidator.esValida(auth, ROL, id))
            return "redirect:/inicio";
        model.addAttribute("seccionActiva", "servicios");
        return "roles/administrador";
    }

    @GetMapping("/panel/administrador/{id}/catalogo/categorias")
    public String panelCategorias(@PathVariable Long id, Authentication auth, Model model) {
        if (!sesionValidator.esValida(auth, ROL, id))
            return "redirect:/inicio";
        model.addAttribute("seccionActiva", "categorias");
        return "roles/administrador";
    }

    @GetMapping("/panel/administrador/{id}/gestion/clientes")
    public String panelClientes(@PathVariable Long id, Authentication auth, Model model) {
        if (!sesionValidator.esValida(auth, ROL, id))
            return "redirect:/inicio";
        model.addAttribute("seccionActiva", "clientes");
        return "roles/administrador";
    }

}
