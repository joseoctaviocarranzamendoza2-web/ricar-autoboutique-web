// Paquete de entidades de dominio para el modelo de datos
package com.mecatools.web.models;

// Imports para JPA y validación de la entidad Producto
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

// Marca la clase como entidad JPA
@Entity
// Tabla de productos disponibles en el sistema
@Table(name = "productos")
// Lombok genera getters
@Getter
// Lombok genera setters
@Setter

// Entidad JPA que representa un producto disponible en el catálogo
public class Producto {

    // Identificador autogenerado del producto
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Nombre obligatorio del producto
    @NotBlank(message = "El nombre no puede estar vacío")
    @Size(min = 2, max = 100, message = "Entre 2 y 100 caracteres")
    @Column(nullable = false)
    private String nombre;

    // Precio del producto debe ser positivo
    @NotNull(message = "El precio no puede estar vacío")
    @DecimalMin(value = "0.1", message = "El precio debe ser mayor a 0")
    @Column(nullable = false)
    private Double precio;

    // Cantidad disponible en inventario
    @NotNull(message = "El stock no puede estar vacío")
    @Min(value = 0, message = "El stock no puede ser negativo")
    @Column(nullable = false)
    private Integer stock;

    // Descripción opcional del producto
    @Size(max = 300, message = "Máximo 300 caracteres")
    @Column
    private String descripcion;

    // Etiqueta opcional para clasificar el producto
    @Column
    private String etiqueta;

    // Nombre de archivo o URL de la imagen del producto
    @Column
    private String imagen;

    // Relación ManyToOne con la categoría del producto
    @NotNull(message = "La categoría es obligatoria")
    @ManyToOne
    @JoinColumn(name = "id_categoria", nullable = false)
    private Categoria categoria;

}
