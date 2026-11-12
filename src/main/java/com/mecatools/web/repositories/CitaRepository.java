// Paquete que agrupa las interfaces de acceso a datos (repositorios)
package com.mecatools.web.repositories;

// Importa la entidad Cita usada por este repositorio y la interfaz base de Spring Data JPA para operaciones CRUD
import com.mecatools.web.models.Cita;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

// Repositorio Spring Data para la entidad Cita
public interface CitaRepository extends JpaRepository<Cita, Long> {

    // Obtiene todas las citas de un usuario específico por su id
    List<Cita> findByUsuario_Id(Long idUsuario);

    // Obtiene todas las citas activas de una fecha excluyendo un estado (ej. Cancelada)
    List<Cita> findByFechaAndEstadoNot(LocalDate fecha, String estadoExcluido);

}
