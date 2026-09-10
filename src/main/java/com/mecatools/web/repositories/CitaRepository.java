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

    // Comprueba si ya existe una cita en una fecha y hora concretas
    boolean existsByFechaAndHora(LocalDate fecha, String hora);

}
