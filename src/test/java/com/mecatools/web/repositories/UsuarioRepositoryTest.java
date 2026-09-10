package com.mecatools.web.repositories;

import com.mecatools.web.models.Usuario;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest(properties = { "spring.datasource.url=jdbc:h2:mem:mecatools-usuarios-test", "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=", "spring.jpa.hibernate.ddl-auto=create-drop" })

class UsuarioRepositoryTest {

    private final UsuarioRepository usuarioRepository;

    @Autowired
    UsuarioRepositoryTest(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Test
    void debeEncontrarUsuarioPorEmailYPassword() {
        // Arrange: se registra un usuario con sus credenciales de autenticación.
        usuarioRepository.save(usuario("usuario@test.com", "secreto", "CLIENTE"));
        // Act: se consulta usando correo y contraseña.
        Optional<Usuario> resultado = usuarioRepository.findByEmailAndPassword("usuario@test.com", "secreto");
        // Assert: las credenciales correctas producen un usuario.
        assertTrue(resultado.isPresent());
        assertEquals("Ana", resultado.get().getNombres());
    }

    @Test
    void debeEncontrarUsuariosPorRolYDevolverVacioConCredencialesIncorrectas() {
        // Arrange: se guardan usuarios con roles diferentes.
        usuarioRepository.save(usuario("cliente@test.com", "uno", "CLIENTE"));
        usuarioRepository.save(usuario("admin@test.com", "dos", "ADMIN"));
        // Act: se filtra el rol y se prueba una contraseña incorrecta.
        List<Usuario> clientes = usuarioRepository.findByRol("CLIENTE");
        Optional<Usuario> sinCoincidencia = usuarioRepository.findByEmailAndPassword("cliente@test.com", "incorrecta");
        // Assert: solo se devuelve el rol pedido y no se autentica una contraseña distinta.
        assertEquals(1, clientes.size());
        assertEquals("cliente@test.com", clientes.get(0).getEmail());
        assertTrue(sinCoincidencia.isEmpty());
    }

    private Usuario usuario(String email, String password, String rol) {
        Usuario usuario = new Usuario();
        usuario.setNombres("Ana");
        usuario.setApellidos("Perez");
        usuario.setEmail(email);
        usuario.setPassword(password);
        usuario.setTelefono("912345682");
        usuario.setRol(rol);
        return usuario;
    }

}
