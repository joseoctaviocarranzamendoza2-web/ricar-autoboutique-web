// Paquete de entidades de dominio para el modelo de datos
package com.mecatools.web.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;

// Entidad JPA para normalización en 3FN: Almacena las categorías de servicios de manera independiente
@Entity
@Table(name = "categoria_servicio")
@Getter
@Setter
public class CategoriaServicio {

    // Identificador autoincremental de la categoría de servicio
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Nombre obligatorio y único de la categoría de servicio
    @NotBlank(message = "El nombre no puede estar vacío")
    @Size(min = 2, max = 50, message = "Entre 2 y 50 caracteres")
    @Column(nullable = false, unique = true)
    private String nombre;

    // Descripción opcional de la categoría de servicio
    @Size(max = 200, message = "Máximo 200 caracteres")
    @Column
    private String descripcion;

    // Discriminador de tipo para serialización uniforme
    @Column(name = "tipo", length = 20)
    private String tipo = "SERVICIO";

    // Relación con los servicios pertenecientes a esta categoría
    @OneToMany(mappedBy = "categoriaServicio")
    @JsonIgnore
    private List<Servicio> servicios;

    public CategoriaServicio() {
        this.tipo = "SERVICIO";
    }

    public CategoriaServicio(String nombre, String descripcion) {
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.tipo = "SERVICIO";
    }
}
