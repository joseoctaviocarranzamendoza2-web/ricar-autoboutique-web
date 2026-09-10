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

    @GetMapping("/servicios")
    public String servicios() {
        return "navbar/servicios";
    }

    @GetMapping("/productos")
    public String productos() {
        return "navbar/productos";
    }

    @GetMapping("/nosotros")
    public String nosotros() {
        return "navbar/nosotros";
    }

    @GetMapping("/contacto")
    public String contacto() {
        return "navbar/contacto";
    }

}
