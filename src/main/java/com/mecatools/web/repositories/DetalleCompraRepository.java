// Paquete que agrupa las interfaces de acceso a datos (repositorios)
package com.mecatools.web.repositories;

// Importa la entidad DetalleCompra usada por este repositorio y la interfaz base de Spring Data JPA para operaciones CRUD
import com.mecatools.web.models.DetalleCompra;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

// Repositorio Spring Data para la entidad DetalleCompra
public interface DetalleCompraRepository extends JpaRepository<DetalleCompra, Long> {

    // Obtiene todos los detalles de compra para una compra específica
    List<DetalleCompra> findByCompra_Id(Long idCompra);

}
