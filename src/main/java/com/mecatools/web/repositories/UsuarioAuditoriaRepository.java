// Paquete de repositorios de acceso a datos
package com.mecatools.web.repositories;

import com.mecatools.web.models.UsuarioAuditoria;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

// Repositorio Spring Data JPA para la entidad UsuarioAuditoria (3FN)
public interface UsuarioAuditoriaRepository extends JpaRepository<UsuarioAuditoria, Long> {
    Optional<UsuarioAuditoria> findByUsuarioId(Long usuarioId);
}
