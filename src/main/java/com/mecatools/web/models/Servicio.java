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
@Table(name = "servicio")
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

    // Duración estimada del servicio en horas (o minutos en registros heredados)
    @NotNull(message = "La duración no puede estar vacía")
    @Min(value = 1, message = "La duración debe ser al menos de 1 hora")
    @Column(nullable = false)
    private Integer duracionMinutos;

    // Obtiene la duración en horas (calcula si el registro histórico estaba en minutos >= 15)
    public Integer getDuracionHoras() {
        if (duracionMinutos == null) return 1;
        if (duracionMinutos >= 15) {
            return Math.max(1, Math.round((float) duracionMinutos / 60.0f));
        }
        return Math.max(1, duracionMinutos);
    }

    // Permite asignar la duración en horas directamente
    public void setDuracionHoras(Integer horas) {
        if (horas != null && horas >= 1) {
            this.duracionMinutos = horas;
        }
    }

    // Descripción opcional del servicio
    @Size(max = 300, message = "Máximo 300 caracteres")
    @Column
    private String descripcion;

    // Estado del servicio: Activo o Inactivo
    @NotBlank(message = "El estado no puede estar vacío")
    @Pattern(regexp = "Activo|Inactivo", message = "Estado debe ser Activo o Inactivo")
    @Column(nullable = false)
    private String estado;

    // Nombre de archivo o URL de la imagen del servicio
    @Column
    private String imagen;

}
