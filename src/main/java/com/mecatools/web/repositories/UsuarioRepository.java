// Paquete que agrupa las interfaces de acceso a datos (repositorios)
package com.mecatools.web.repositories;

// Importa la entidad Usuario usada por este repositorio y la interfaz base de Spring Data JPA para operaciones CRUD
import com.mecatools.web.models.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

// Repositorio Spring Data para la entidad Usuario
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    // Busca un usuario por su correo electrónico
    Optional<Usuario> findByEmail(String email);

    // Obtiene el usuario con correo y contraseña para autenticación básica
    Optional<Usuario> findByEmailAndPassword(String email, String password);

    // Lista todos los usuarios con un rol específico
    List<Usuario> findByRol(String rol);

}
