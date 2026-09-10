// Paquete de entidades de dominio para el modelo de datos
package com.mecatools.web.models;

// Imports para JPA, validación y serialización de la entidad Categoria
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;

// Marca la clase como entidad JPA
@Entity
// Tabla asociada a la entidad
@Table(name = "categorias")
// Lombok genera getters
@Getter
// Lombok genera setters
@Setter

// Entidad JPA que representa una categoría de producto
public class Categoria {

    // Identificador autoincremental de la categoría
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Nombre obligatorio y único de la categoría
    @NotBlank(message = "El nombre no puede estar vacío")
    @Size(min = 2, max = 50, message = "Entre 2 y 50 caracteres")
    @Column(nullable = false, unique = true)
    private String nombre;

    // Descripción opcional de la categoría
    @Size(max = 200, message = "Máximo 200 caracteres")
    @Column
    private String descripcion;

    // Relación con productos pertenecientes a esta categoría
    @OneToMany(mappedBy = "categoria")
    @JsonIgnore
    private List<Producto> productos;

}
