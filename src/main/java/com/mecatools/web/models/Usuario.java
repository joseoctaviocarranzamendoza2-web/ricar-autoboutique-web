// Paquete de entidades de dominio para el modelo de datos
package com.mecatools.web.models;

// Imports para JPA, validación y control de serialización del usuario
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

// Marca la clase como entidad JPA
@Entity
// Tabla de usuarios registrados
@Table(name = "usuarios")
// Lombok genera getters
@Getter
// Lombok genera setters
@Setter

// Entidad JPA que representa un usuario registrado en el sistema
public class Usuario {

    // Identificador auto generado del usuario
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Nombre del usuario
    @NotBlank(message = "El nombre es obligatorio")
    @Size(min = 2, max = 50, message = "Entre 2 y 50 caracteres")
    @Column(nullable = false)
    private String nombres;
    
    // Apellidos del usuario
    @NotBlank(message = "El apellido es obligatorio")
    @Size(min = 2, max = 50, message = "Entre 2 y 50 caracteres")
    @Column(nullable = false)
    private String apellidos;

    // Correo electrónico único del usuario
    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "Debe ser un correo válido")
    @Column(nullable = false, unique = true)
    private String email;

    // Contraseña almacenada como texto cifrado/hasheado
    @NotBlank(message = "La contraseña es obligatoria")
    @Column(nullable = false, length = 255)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;

    // Número de teléfono del usuario
    @NotBlank(message = "El teléfono es obligatorio")
    @Pattern(regexp = "9\\d{8}", message = "El teléfono debe empezar con 9 y tener 9 dígitos")
    @Column(nullable = false)
    private String telefono;

    // Valida que el teléfono no sea el valor prohibido de broma
    @AssertTrue(message = "No te creas payaso")
    public boolean isTelefonoValido() {
        return telefono != null && !telefono.equals("987654321");
    }

    // Ciudad opcional del usuario
    @Column
    private String ciudad;

    // Rol del usuario dentro del sistema (cliente, gerente, administrador)
    @Column(nullable = false)
    private String rol;

}
