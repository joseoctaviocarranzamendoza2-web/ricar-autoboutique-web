// Paquete que agrupa las interfaces de acceso a datos (repositorios)
package com.mecatools.web.repositories;

// Importa la entidad Producto usada por este repositorio y la interfaz base de Spring Data JPA para operaciones CRUD
import com.mecatools.web.models.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

// Repositorio Spring Data para la entidad Producto
public interface ProductoRepository extends JpaRepository<Producto, Long> {
    
    // Obtiene todos los productos que pertenecen a una categoría específica
    List<Producto> findByCategoria_Id(Long idCategoria);

}
