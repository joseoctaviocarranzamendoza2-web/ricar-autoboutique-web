// Paquete que agrupa las interfaces de acceso a datos (repositorios)
package com.mecatools.web.repositories;

// Importa la entidad Categoria usada por este repositorio y la interfaz base de Spring Data JPA para operaciones CRUD
import com.mecatools.web.models.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

// Repositorio Spring Data para la entidad Categoria
public interface CategoriaRepository extends JpaRepository<Categoria, Long> {
    
    // Busca una categoría por su nombre único
    Optional<Categoria> findByNombre(String nombre);

}
