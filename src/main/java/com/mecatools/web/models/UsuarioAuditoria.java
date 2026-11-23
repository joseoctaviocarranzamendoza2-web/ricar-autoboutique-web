// Paquete de entidades de dominio para el modelo de datos
package com.mecatools.web.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnore;

// Entidad JPA para normalización en 3FN: Desacopla la auditoría de bloqueos, apelaciones y habilitaciones de la entidad Usuario
@Entity
@Table(name = "usuario_auditoria")
@Getter
@Setter
public class UsuarioAuditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Relación OneToOne con Usuario (clave foránea usuario_id única)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false, unique = true)
    @JsonIgnore
    private Usuario usuario;

    // Motivo de inhabilitación o bloqueo registrado por administración
    @Column(name = "motivo_bloqueo", columnDefinition = "TEXT")
    private String motivoBloqueo;

    // Evidencia opcional (imagen) adjuntada al inhabilitar
    @Column(name = "evidencia_bloqueo", columnDefinition = "MEDIUMTEXT")
    private String evidenciaBloqueo;

    // Fecha y hora en la que se inhabilitó la cuenta
    @Column(name = "fecha_bloqueo")
    private LocalDateTime fechaBloqueo;

    // Mensaje de apelación enviado por el cliente para solicitar reactivación
    @Column(name = "mensaje_apelacion", columnDefinition = "TEXT")
    private String mensajeApelacion;

    // Fecha y hora del envío de la última apelación
    @Column(name = "fecha_apelacion")
    private LocalDateTime fechaApelacion;

    // Estado de la apelación: PENDIENTE, RESPONDIDO, null
    @Column(name = "estado_apelacion")
    private String estadoApelacion;

    // Respuesta o resolución de la administración frente a la apelación
    @Column(name = "respuesta_apelacion", columnDefinition = "TEXT")
    private String respuestaApelacion;

    // Evidencia opcional adjuntada en la respuesta de administración
    @Column(name = "evidencia_respuesta", columnDefinition = "MEDIUMTEXT")
    private String evidenciaRespuesta;

    // Fecha y hora de la respuesta de administración
    @Column(name = "fecha_respuesta_apelacion")
    private LocalDateTime fechaRespuestaApelacion;

    // Mensaje o resolución de habilitación de la cuenta
    @Column(name = "mensaje_habilitacion", columnDefinition = "TEXT")
    private String mensajeHabilitacion;

    // Evidencia opcional adjuntada al momento de habilitar la cuenta
    @Column(name = "evidencia_habilitacion", columnDefinition = "MEDIUMTEXT")
    private String evidenciaHabilitacion;

    // Fecha y hora en la que se habilitó la cuenta
    @Column(name = "fecha_habilitacion")
    private LocalDateTime fechaHabilitacion;
}
