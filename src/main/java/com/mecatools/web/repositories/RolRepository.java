package com.mecatools.web.repositories;

import com.mecatools.web.models.Rol;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

// Repositorio Spring Data JPA para la entidad Rol
public interface RolRepository extends JpaRepository<Rol, Long> {

    // Busca un rol por su nombre ignorando mayúsculas y minúsculas
    Optional<Rol> findByNombreIgnoreCase(String nombre);

    // Verifica si ya existe un rol con determinado nombre
    boolean existsByNombreIgnoreCase(String nombre);
}
