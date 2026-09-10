// Paquete de entidades de dominio para el modelo de datos
package com.mecatools.web.models;

// Imports para JPA, validación y serialización de la entidad DetalleCompra
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

// Marca la clase como entidad JPA
@Entity
// Tabla de detalles de compra
@Table(name = "detalle_compras")
// Lombok genera getters
@Getter
// Lombok genera setters
@Setter

// Entidad JPA que representa un detalle de línea dentro de una compra
public class DetalleCompra {

    // Identificador auto generado del detalle
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Cantidad de unidades compradas
    @NotNull(message = "La cantidad no puede estar vacía")
    @Min(value = 1, message = "Mínimo 1 unidad")
    @Column(nullable = false)
    private Integer cantidad;

    // Precio unitario aplicado en esta línea
    @NotNull(message = "El precio no puede estar vacío")
    @DecimalMin(value = "0.1", message = "El precio debe ser mayor a 0")
    @Column(nullable = false)
    private Double precioUnitario;

    // Referencia a la compra a la que pertenece este detalle
    @ManyToOne
    @JoinColumn(name = "id_compra", nullable = false)
    @JsonIgnoreProperties({ "detalles", "usuario" })
    private Compra compra;

    // Producto asociado a este detalle de compra
    @ManyToOne
    @JoinColumn(name = "id_producto", nullable = false)
    @JsonIgnoreProperties({ "categoria" })
    private Producto producto;

}
