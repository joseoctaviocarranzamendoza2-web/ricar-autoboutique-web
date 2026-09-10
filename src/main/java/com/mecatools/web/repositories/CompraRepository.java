// Paquete que agrupa las interfaces de acceso a datos (repositorios)
package com.mecatools.web.repositories;

// Importa la entidad Compra usada por este repositorio Y la interfaz base de Spring Data JPA para operaciones CRUD
import com.mecatools.web.models.Compra;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

// Repositorio Spring Data para la entidad Compra
public interface CompraRepository extends JpaRepository<Compra, Long> {

    // Obtiene todas las compras realizadas por un usuario específico
    List<Compra> findByUsuario_Id(Long idUsuario);

}
