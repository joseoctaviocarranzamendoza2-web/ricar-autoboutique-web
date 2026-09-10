// Paquete que agrupa las interfaces de acceso a datos (repositorios)
package com.mecatools.web.repositories;

// Importa la entidad Comentario usada por este repositorio y la interfaz base de Spring Data JPA para operaciones CRUD
import com.mecatools.web.models.Comentario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

// Repositorio Spring Data para la entidad Comentario
public interface ComentarioRepository extends JpaRepository<Comentario, Long> {

    // Obtiene el comentario asociado a un usuario por su id
    Optional<Comentario> findByUsuario_Id(Long usuarioId);

    // Elimina el comentario de un usuario específico por su id
    void deleteByUsuario_Id(Long usuarioId);

}
