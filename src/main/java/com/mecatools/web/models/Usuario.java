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
@Table(name = "usuario")
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

    // Valida que el teléfono no sea el valor prohibido
    @AssertTrue(message = "Por favor ingresa un número de teléfono válido")
    public boolean isTelefonoValido() {
        return telefono != null && !telefono.equals("987654321");
    }

    // Ciudad opcional del usuario
    @Column
    private String ciudad;

    // Relación ManyToMany para 3FN: Tabla de unión usuario_rol que correlaciona usuarios con múltiples roles
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "usuario_rol",
        joinColumns = @JoinColumn(name = "usuario_id"),
        inverseJoinColumns = @JoinColumn(name = "rol_id")
    )
    private java.util.Set<Rol> roles = new java.util.HashSet<>();

    // Columna rol en tabla usuarios para sincronización directa y compatibilidad
    @Column(name = "rol", nullable = true)
    private String rol;

    // Estado del usuario: Activo o Inactivo (controla si puede acceder al sistema)
    @Column(name = "estado")
    private String estado = "Activo";

    public String getEstado() {
        return (estado != null && !estado.isBlank()) ? estado : "Activo";
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public boolean isActivo() {
        return "Activo".equalsIgnoreCase(getEstado());
    }

    // Devuelve el rol base con el que fue creada la cuenta
    public String getRolBase() {
        return getRol();
    }

    // Helper para verificar si el usuario posee un rol específico considerando la jerarquía normalizada (3FN)
    public boolean tieneRol(String nombreRol) {
        if (nombreRol == null) return false;
        if (roles != null && roles.stream().anyMatch(r -> nombreRol.equalsIgnoreCase(r.getNombre()))) {
            return true;
        }
        if (this.rol != null) {
            String r = this.rol.toLowerCase();
            if ("gerente".equalsIgnoreCase(nombreRol)) return r.contains("gerente");
            if ("administrador".equalsIgnoreCase(nombreRol)) return r.contains("admin") || r.contains("gerente");
            if ("cliente".equalsIgnoreCase(nombreRol)) return true;
        }
        return false;
    }

    // Devuelve los nombres de todos los roles asociados al usuario según jerarquía:
    // Gerente: cliente, administrador, gerente (3 roles)
    // Administrador: cliente, administrador (2 roles)
    // Cliente: cliente (1 rol)
    public java.util.List<String> getNombresRoles() {
        if (tieneRol("gerente") || (this.rol != null && this.rol.toLowerCase().contains("gerente"))) {
            return java.util.List.of("cliente", "administrador", "gerente");
        }
        if (tieneRol("administrador") || (this.rol != null && this.rol.toLowerCase().contains("admin"))) {
            return java.util.List.of("cliente", "administrador");
        }
        return java.util.List.of("cliente");
    }

    // Devuelve el rol principal para compatibilidad con código existente
    public String getRol() {
        if (tieneRol("gerente") || (this.rol != null && this.rol.toLowerCase().contains("gerente"))) {
            return "gerente";
        }
        if (tieneRol("administrador") || (this.rol != null && this.rol.toLowerCase().contains("admin"))) {
            return "administrador";
        }
        return "cliente";
    }

    public void setRol(String rol) {
        this.rol = rol;
    }

    // Agrega un rol al conjunto de roles del usuario
    public void agregarRol(Rol rol) {
        if (this.roles == null) {
            this.roles = new java.util.HashSet<>();
        }
        this.roles.add(rol);
    }

}
