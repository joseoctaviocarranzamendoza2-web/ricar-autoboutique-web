package com.mecatools.web.repositories;

import com.mecatools.web.models.Comentario;
import com.mecatools.web.models.Usuario;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest(properties = { "spring.datasource.url=jdbc:h2:mem:mecatools-comentarios-test", "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=", "spring.jpa.hibernate.ddl-auto=create-drop" })

class ComentarioRepositoryTest {

    private final ComentarioRepository comentarioRepository;
    private final UsuarioRepository usuarioRepository;

    @Autowired
    ComentarioRepositoryTest(ComentarioRepository comentarioRepository, UsuarioRepository usuarioRepository) {
        this.comentarioRepository = comentarioRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Test
    void debeEncontrarComentarioPorUsuario() {
        // Arrange: se persiste un comentario con un usuario propietario.
        Usuario usuario = usuarioRepository.save(usuarioValido());
        Comentario comentario = new Comentario();
        comentario.setTexto("El servicio fue rapido y el personal muy amable.");
        comentario.setVehiculo("Honda Civic");
        comentario.setEstrellas(5);
        comentario.setUsuario(usuario);
        comentarioRepository.save(comentario);
        // Act: se busca el comentario mediante la propiedad anidada usuario.id.
        Optional<Comentario> resultado = comentarioRepository.findByUsuario_Id(usuario.getId());
        // Assert: se recupera el comentario del usuario correcto.
        assertTrue(resultado.isPresent());
        assertEquals("Honda Civic", resultado.get().getVehiculo());
    }

    @Test
    void debeEliminarComentarioPorUsuario() {
        // Arrange: se guarda el comentario que luego será eliminado por la consulta derivada.
        Usuario usuario = usuarioRepository.save(usuarioValido());
        Comentario comentario = new Comentario();
        comentario.setTexto("La atencion recibida supero todas mis expectativas.");
        comentario.setVehiculo("Kia Rio");
        comentario.setEstrellas(4);
        comentario.setUsuario(usuario);
        comentarioRepository.saveAndFlush(comentario);
        // Act: se elimina usando el id del usuario, no el id del comentario.
        comentarioRepository.deleteByUsuario_Id(usuario.getId());
        // Assert: la búsqueda posterior confirma que ya no existe.
        assertTrue(comentarioRepository.findByUsuario_Id(usuario.getId()).isEmpty());
    }

    private Usuario usuarioValido() {
        Usuario usuario = new Usuario();
        usuario.setNombres("Luis");
        usuario.setApellidos("Gomez");
        usuario.setEmail("comentario@test.com");
        usuario.setPassword("hash");
        usuario.setTelefono("912345679");
        usuario.setRol("CLIENTE");
        return usuario;
    }

}
