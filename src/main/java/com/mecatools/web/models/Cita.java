// Paquete de entidades de dominio para el modelo de datos
package com.mecatools.web.models;

// Imports para JPA, validación y serialización de la entidad Cita
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

// Marca la clase como entidad JPA
@Entity
// Asigna la entidad a la tabla citas
@Table(name = "citas")
// Lombok genera getters
@Getter
// Lombok genera setters
@Setter

// Entidad JPA que representa una cita agendada
public class Cita {

    // Identificador auto generado
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Fecha de la cita que debe ser futura
    @NotNull(message = "La fecha no puede estar vacía")
    @Future(message = "La fecha debe ser una fecha futura")
    @Column(nullable = false)
    private LocalDate fecha;

    // Evita que el usuario reserve una cita para la fecha actual cuando ya se ha pasado el horario.
    @AssertTrue(message = "La fecha debe ser posterior al día actual")
    public boolean isFechaPosteriorAlDiaActual() {
        return fecha != null && fecha.isAfter(LocalDate.now());
    }

    // Hora de la cita obligatoria
    @NotBlank(message = "La hora no puede estar vacía")
    @Column(nullable = false)
    private String hora;

    // Nombre del vehículo obligatorio
    @NotBlank(message = "El vehículo no puede estar vacío")
    @Size(min = 3, max = 100, message = "Entre 3 y 100 caracteres")
    @Column(nullable = false)
    private String vehiculo;

    // Notas opcionales de la cita
    @Size(max = 400, message = "Máximo 400 caracteres")
    @Column
    private String notas;

    // Estado de la cita con valores permitidos
    @NotBlank(message = "El estado no puede estar vacío")
    @Pattern(regexp = "Pendiente|Confirmada|Completada|Cancelada", message = "Estado inválido")
    @Column(nullable = false)
    private String estado;

    // Relación ManyToOne hacia el usuario que solicita la cita
    @ManyToOne
    @JoinColumn(name = "id_usuario", nullable = false)
    @JsonIgnoreProperties({ "compras", "citas", "password" })
    private Usuario usuario;

    // Relación ManyToOne hacia el servicio reservado
    @ManyToOne
    @JoinColumn(name = "id_servicio", nullable = false)
    @JsonIgnoreProperties({ "citas" })
    private Servicio servicio;

}
