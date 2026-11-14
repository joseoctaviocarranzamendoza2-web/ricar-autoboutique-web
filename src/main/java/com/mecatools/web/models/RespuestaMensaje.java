package com.mecatools.web.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "respuesta_mensaje")
@Getter @Setter
public class RespuestaMensaje {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "id_mensaje", nullable = false)
    @JsonIgnoreProperties({"usuario"})
    private MensajeContacto mensajeContacto;

    @ManyToOne
    @JoinColumn(name = "id_administrador", nullable = false)
    @JsonIgnoreProperties({"password","roles","compras","citas"})
    private Usuario administrador;

    @NotBlank @Size(max = 2000)
    @Column(nullable = false, columnDefinition = "TEXT")
    private String respuesta;

    @Column(nullable = false)
    private LocalDateTime fechaRespuesta = LocalDateTime.now();

    @PrePersist
    public void asignarFecha() {
        if (this.fechaRespuesta == null) this.fechaRespuesta = LocalDateTime.now();
    }
}
