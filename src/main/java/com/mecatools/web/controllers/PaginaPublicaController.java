package com.mecatools.web.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller

// Clase de controlador para manejar las rutas y vistas de las páginas públicas.
public class PaginaPublicaController {

    @GetMapping("/")
    public String index() {
        return "navbar/inicio";
    }

    @GetMapping("/inicio")
    public String inicio() {
        return "navbar/inicio";
    }

    @GetMapping("/inicio/login")
    public String inicioLogin() {
        return "navbar/inicio";
    }

    @GetMapping("/inicio/registro")
    public String inicioRegistro() {
        return "navbar/inicio";
    }

    @GetMapping("/servicios")
    public String servicios() {
        return "navbar/servicios";
    }

    @GetMapping("/servicios/login")
    public String serviciosLogin() {
        return "navbar/servicios";
    }

    @GetMapping("/servicios/registro")
    public String serviciosRegistro() {
        return "navbar/servicios";
    }

    @GetMapping("/productos")
    public String productos() {
        return "navbar/productos";
    }

    @GetMapping("/productos/login")
    public String productosLogin() {
        return "navbar/productos";
    }

    @GetMapping("/productos/registro")
    public String productosRegistro() {
        return "navbar/productos";
    }

    @GetMapping("/nosotros")
    public String nosotros() {
        return "navbar/nosotros";
    }

    @GetMapping("/nosotros/login")
    public String nosotrosLogin() {
        return "navbar/nosotros";
    }

    @GetMapping("/nosotros/registro")
    public String nosotrosRegistro() {
        return "navbar/nosotros";
    }

    @GetMapping("/contacto")
    public String contacto() {
        return "navbar/contacto";
    }

    @GetMapping("/contacto/login")
    public String contactoLogin() {
        return "navbar/contacto";
    }

    @GetMapping("/contacto/registro")
    public String contactoRegistro() {
        return "navbar/contacto";
    }

}
