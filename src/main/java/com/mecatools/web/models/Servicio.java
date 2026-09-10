// Paquete de entidades de dominio para el modelo de datos
package com.mecatools.web.models;

// Imports para JPA y validación de la entidad Servicio
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

// Marca la clase como entidad JPA
@Entity
// Tabla de servicios ofrecidos por la empresa
@Table(name = "servicios")
// Lombok genera getters
@Getter
// Lombok genera setters
@Setter

// Entidad JPA que representa un servicio ofrecido por la empresa
public class Servicio {

    // Identificador auto generado del servicio
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Nombre obligatorio del servicio
    @NotBlank(message = "El nombre no puede estar vacío")
    @Size(min = 2, max = 100, message = "Entre 2 y 100 caracteres")
    @Column(nullable = false)
    private String nombre;

    // Categoría textual del servicio
    @NotBlank(message = "La categoría no puede estar vacía")
    @Column(nullable = false)
    private String categoria;

    // Precio base del servicio
    @NotNull(message = "El precio base no puede estar vacío")
    @DecimalMin(value = "0.1", message = "El precio debe ser mayor a 0")
    @Column(nullable = false)
    private Double precioBase;

    // Duración estimada del servicio en minutos
    @NotNull(message = "La duración no puede estar vacía")
    @Min(value = 1, message = "Mínimo 1 minuto")
    @Column(nullable = false)
    private Integer duracionMinutos;

    // Descripción opcional del servicio
    @Size(max = 300, message = "Máximo 300 caracteres")
    @Column
    private String descripcion;

    // Estado del servicio: Activo o Inactivo
    @NotBlank(message = "El estado no puede estar vacío")
    @Pattern(regexp = "Activo|Inactivo", message = "Estado debe ser Activo o Inactivo")
    @Column(nullable = false)
    private String estado;

}
