// Paquete de entidades de dominio para el modelo de datos
package com.mecatools.web.models;

// Imports para JPA, validación y serialización de la entidad Comentario
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

// Marca la clase como entidad JPA
@Entity
// Tabla comentarios con restricción única por usuario
@Table(name = "comentarios", uniqueConstraints = @UniqueConstraint(columnNames = "usuario_id"))
// Lombok genera getters
@Getter
// Lombok genera setters
@Setter

// Entidad JPA que representa un comentario de cliente
public class Comentario {

    // Identificador auto generado
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Texto obligatorio con mínimo y máximo de caracteres
    @NotBlank
    @Size(min = 20, max = 300)
    @Column(nullable = false, length = 300)
    private String texto;

    // Vehículo asociado al comentario
    @NotBlank
    @Size(min = 3, max = 60)
    @Column(nullable = false, length = 60)
    private String vehiculo;

    // Calificación de 1 a 5 estrellas
    @Min(1)
    @Max(5)
    @Column(nullable = false)
    private Integer estrellas;

    // Relación ManyToOne hacia el usuario propietario del comentario
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private Usuario usuario;

}
