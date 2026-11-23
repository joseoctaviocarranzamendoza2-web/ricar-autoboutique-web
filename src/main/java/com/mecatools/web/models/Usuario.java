// Paquete de entidades de dominio para el modelo de datos
package com.mecatools.web.models;

// Imports para JPA, validación y control de serialización del usuario
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;

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

    // Normalización en 3FN: Auditoría desacoplada en tabla usuario_auditoria (evita sobrecargar la tabla usuario con campos LOB)
    @OneToOne(mappedBy = "usuario", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private UsuarioAuditoria auditoria;

    // Helper para asegurar la existencia de la entidad de auditoría
    private UsuarioAuditoria asegurarAuditoria() {
        if (this.auditoria == null) {
            this.auditoria = new UsuarioAuditoria();
            this.auditoria.setUsuario(this);
        }
        return this.auditoria;
    }

    public UsuarioAuditoria getAuditoria() {
        return this.auditoria;
    }

    public void setAuditoria(UsuarioAuditoria auditoria) {
        this.auditoria = auditoria;
        if (auditoria != null) {
            auditoria.setUsuario(this);
        }
    }

    // Getters y Setters delegados para retrocompatibilidad total y serialización JSON sin sobrecargar la entidad base
    public String getMotivoBloqueo() {
        return auditoria != null ? auditoria.getMotivoBloqueo() : null;
    }

    public void setMotivoBloqueo(String motivoBloqueo) {
        asegurarAuditoria().setMotivoBloqueo(motivoBloqueo);
    }

    public String getEvidenciaBloqueo() {
        return auditoria != null ? auditoria.getEvidenciaBloqueo() : null;
    }

    public void setEvidenciaBloqueo(String evidenciaBloqueo) {
        asegurarAuditoria().setEvidenciaBloqueo(evidenciaBloqueo);
    }

    public java.time.LocalDateTime getFechaBloqueo() {
        return auditoria != null ? auditoria.getFechaBloqueo() : null;
    }

    public void setFechaBloqueo(java.time.LocalDateTime fechaBloqueo) {
        asegurarAuditoria().setFechaBloqueo(fechaBloqueo);
    }

    public String getMensajeApelacion() {
        return auditoria != null ? auditoria.getMensajeApelacion() : null;
    }

    public void setMensajeApelacion(String mensajeApelacion) {
        asegurarAuditoria().setMensajeApelacion(mensajeApelacion);
    }

    public java.time.LocalDateTime getFechaApelacion() {
        return auditoria != null ? auditoria.getFechaApelacion() : null;
    }

    public void setFechaApelacion(java.time.LocalDateTime fechaApelacion) {
        asegurarAuditoria().setFechaApelacion(fechaApelacion);
    }

    public String getEstadoApelacion() {
        return auditoria != null ? auditoria.getEstadoApelacion() : null;
    }

    public void setEstadoApelacion(String estadoApelacion) {
        asegurarAuditoria().setEstadoApelacion(estadoApelacion);
    }

    public String getRespuestaApelacion() {
        return auditoria != null ? auditoria.getRespuestaApelacion() : null;
    }

    public void setRespuestaApelacion(String respuestaApelacion) {
        asegurarAuditoria().setRespuestaApelacion(respuestaApelacion);
    }

    public String getEvidenciaRespuesta() {
        return auditoria != null ? auditoria.getEvidenciaRespuesta() : null;
    }

    public void setEvidenciaRespuesta(String evidenciaRespuesta) {
        asegurarAuditoria().setEvidenciaRespuesta(evidenciaRespuesta);
    }

    public java.time.LocalDateTime getFechaRespuestaApelacion() {
        return auditoria != null ? auditoria.getFechaRespuestaApelacion() : null;
    }

    public void setFechaRespuestaApelacion(java.time.LocalDateTime fechaRespuestaApelacion) {
        asegurarAuditoria().setFechaRespuestaApelacion(fechaRespuestaApelacion);
    }

    public String getMensajeHabilitacion() {
        return auditoria != null ? auditoria.getMensajeHabilitacion() : null;
    }

    public void setMensajeHabilitacion(String mensajeHabilitacion) {
        asegurarAuditoria().setMensajeHabilitacion(mensajeHabilitacion);
    }

    public String getEvidenciaHabilitacion() {
        return auditoria != null ? auditoria.getEvidenciaHabilitacion() : null;
    }

    public void setEvidenciaHabilitacion(String evidenciaHabilitacion) {
        asegurarAuditoria().setEvidenciaHabilitacion(evidenciaHabilitacion);
    }

    public java.time.LocalDateTime getFechaHabilitacion() {
        return auditoria != null ? auditoria.getFechaHabilitacion() : null;
    }

    public void setFechaHabilitacion(java.time.LocalDateTime fechaHabilitacion) {
        asegurarAuditoria().setFechaHabilitacion(fechaHabilitacion);
    }

    // Fecha de registro del usuario usada en reportes semanales, mensuales y anuales
    @Column(name = "fecha_registro")
    private LocalDate fechaRegistro;

    @PrePersist
    public void asignarFechaRegistroPorDefecto() {
        if (this.fechaRegistro == null) {
            this.fechaRegistro = LocalDate.now();
        }
    }

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
