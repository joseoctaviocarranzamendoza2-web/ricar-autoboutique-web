// Paquete de repositorios de acceso a datos
package com.mecatools.web.repositories;

import com.mecatools.web.models.CategoriaServicio;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

// Repositorio Spring Data JPA para la entidad CategoriaServicio (3FN)
public interface CategoriaServicioRepository extends JpaRepository<CategoriaServicio, Long> {
    Optional<CategoriaServicio> findByNombre(String nombre);
    Optional<CategoriaServicio> findByNombreIgnoreCase(String nombre);
}
