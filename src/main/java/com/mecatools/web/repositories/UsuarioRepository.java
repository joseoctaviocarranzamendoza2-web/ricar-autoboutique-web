// Paquete que agrupa las interfaces de acceso a datos (repositorios)
package com.mecatools.web.repositories;

// Importa la entidad Usuario usada por este repositorio y la interfaz base de Spring Data JPA para operaciones CRUD
import com.mecatools.web.models.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

// Repositorio Spring Data para la entidad Usuario
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    // Busca un usuario por su correo electrónico
    Optional<Usuario> findByEmail(String email);

    // Obtiene el usuario con correo y contraseña para autenticación básica
    Optional<Usuario> findByEmailAndPassword(String email, String password);

    // Lista todos los usuarios con un rol específico a través de la tabla de correlación usuario_rol (3FN)
    @Query("SELECT DISTINCT u FROM Usuario u JOIN u.roles r WHERE LOWER(r.nombre) = LOWER(:rol)")
    List<Usuario> findByRol(@Param("rol") String rol);

    // Lista clientes estándar que no tienen roles de administrador ni gerente
    @Query("SELECT DISTINCT u FROM Usuario u JOIN u.roles r WHERE LOWER(r.nombre) = 'cliente' AND NOT EXISTS (SELECT r2 FROM u.roles r2 WHERE LOWER(r2.nombre) IN ('administrador', 'gerente'))")
    List<Usuario> findClientesPuros();

}
