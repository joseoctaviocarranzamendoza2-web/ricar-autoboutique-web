package com.mecatools.web.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "mensaje_contacto")
@Getter
@Setter
public class MensajeContacto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "id_usuario", nullable = false)
    @JsonIgnoreProperties({ "password", "roles", "compras", "citas" })
    private Usuario usuario;

    @NotBlank
    @Size(max = 100)
    @Column(nullable = false)
    private String nombreCompleto;

    @NotBlank
    @Pattern(regexp = "9\\d{8}")
    @Column(nullable = false)
    private String telefono;

    @NotBlank
    @Email
    @Size(max = 100)
    @Column(nullable = false)
    private String email;

    @NotBlank
    @Size(max = 100)
    @Column(nullable = false)
    private String asunto;

    @NotBlank
    @Size(max = 2000)
    @Column(nullable = false, columnDefinition = "TEXT")
    private String mensaje;

    @Column(nullable = false)
    private LocalDateTime fechaEnvio = LocalDateTime.now();

    @Column(nullable = false)
    private boolean leido = false;

    @Column(nullable = false)
    private boolean respondido = false;

    @PrePersist
    public void asignarFecha() {
        if (this.fechaEnvio == null)
            this.fechaEnvio = LocalDateTime.now();
    }
}
