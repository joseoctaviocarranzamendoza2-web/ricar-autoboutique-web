// Paquete que agrupa las interfaces de acceso a datos (repositorios)
package com.mecatools.web.repositories;

// Importa la entidad Servicio usada por este repositorio y la interfaz base de Spring Data JPA para operaciones CRUD
import com.mecatools.web.models.Servicio;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

// Repositorio Spring Data para la entidad Servicio
public interface ServicioRepository extends JpaRepository<Servicio, Long> {

    // Obtiene los servicios según su estado activo o inactivo
    List<Servicio> findByEstado(String estado);

}
