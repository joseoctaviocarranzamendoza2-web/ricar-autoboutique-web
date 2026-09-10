// Paquete de entidades de dominio para el modelo de datos
package com.mecatools.web.models;

// Imports para JPA, validación y serialización de la entidad Compra
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

// Marca la clase como entidad JPA
@Entity
// Asigna la entidad a la tabla compras
@Table(name = "compras")
// Lombok genera getters
@Getter
// Lombok genera setters
@Setter

// Entidad JPA que representa una compra realizada por un usuario
public class Compra {

    // Identificador auto generado
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Fecha de la compra almacenada como texto
    @NotBlank(message = "La fecha no puede estar vacía")
    @Column(nullable = false)
    private String fecha;

    // Total de la compra debe ser mayor a cero
    @NotNull(message = "El total no puede estar vacío")
    @DecimalMin(value = "0.1", message = "El total debe ser mayor a 0")
    @Column(nullable = false)
    private Double total;

    // Estado de la compra
    @NotBlank(message = "El estado no puede estar vacío")
    @Column(nullable = false)
    private String estado;

    // Método de pago opcional
    @Column
    private String metodoPago;

    // Relación ManyToOne con el usuario que realizó la compra
    @ManyToOne
    @JoinColumn(name = "id_usuario", nullable = false)
    @JsonIgnoreProperties({ "compras", "citas", "password" })
    private Usuario usuario;

    // Detalles de la compra en cascada con carga eager
    @OneToMany(mappedBy = "compra", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private List<DetalleCompra> detalles = new ArrayList<>();

}
