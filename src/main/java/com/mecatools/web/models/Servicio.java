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

    // Relación ManyToOne con la entidad CategoriaServicio (Normalización en 3FN)
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_categoria_servicio", nullable = true)
    private CategoriaServicio categoriaServicio;

    // Nombre de la categoría para sincronización y retrocompatibilidad
    @Column(name = "categoria", nullable = true)
    private String categoria;

    // Retorna el nombre de la categoría normalizada o el valor en texto
    public String getCategoria() {
        if (categoriaServicio != null && categoriaServicio.getNombre() != null) {
            return categoriaServicio.getNombre();
        }
        return (categoria != null && !categoria.isBlank()) ? categoria : "";
    }

    public void setCategoria(String categoria) {
        this.categoria = categoria;
    }

    public void setCategoriaServicio(CategoriaServicio categoriaServicio) {
        this.categoriaServicio = categoriaServicio;
        if (categoriaServicio != null && categoriaServicio.getNombre() != null) {
            this.categoria = categoriaServicio.getNombre();
        }
    }

    // Precio base del servicio
    @NotNull(message = "El precio base no puede estar vacío")
    @DecimalMin(value = "0.0", message = "El precio base no puede ser negativo")
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
    @Column(columnDefinition = "MEDIUMTEXT")
    private String imagen;

}
