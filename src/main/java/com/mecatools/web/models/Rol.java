// Paquete de entidades de dominio para el modelo de datos
package com.mecatools.web.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Marca la clase como entidad JPA
@Entity
// Tabla para normalización en 3FN: Almacena los roles del sistema de forma atómica e independiente
@Table(name = "rol")
@Getter
@Setter
@NoArgsConstructor
public class Rol {

    // Identificador autoincremental del rol
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Nombre único del rol (ej: cliente, administrador, gerente)
    @NotBlank(message = "El nombre del rol no puede estar vacío")
    @Column(nullable = false, unique = true, length = 50)
    private String nombre;

    public Rol(String nombre) {
        this.nombre = nombre;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Rol rol = (Rol) o;
        return nombre != null && nombre.equalsIgnoreCase(rol.nombre);
    }

    @Override
    public int hashCode() {
        return nombre != null ? nombre.toLowerCase().hashCode() : 0;
    }
}
