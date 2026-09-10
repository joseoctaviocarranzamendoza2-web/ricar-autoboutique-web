package com.mecatools.web.services;

import com.mecatools.web.models.Comentario;
import com.mecatools.web.models.Usuario;
import com.mecatools.web.repositories.ComentarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)

class ComentarioServiceTest {

    @Mock
    private ComentarioRepository comentarioRepository;

    @InjectMocks
    private ComentarioService comentarioService;

    @Test
    void debeCrearComentarioSiElUsuarioEsCliente() {
        // Arrange: se prepara un cliente sin comentario previo.
        Usuario usuario = crearUsuario(1L, "cliente");
        Comentario comentario = crearComentario();
        when(comentarioRepository.findByUsuario_Id(1L)).thenReturn(Optional.empty());
        when(comentarioRepository.save(comentario)).thenReturn(comentario);
        // Act.
        Comentario resultado = comentarioService.crear(comentario, usuario);
        // Assert: el comentario queda asociado al usuario autenticado.
        assertEquals(usuario, resultado.getUsuario());
        verify(comentarioRepository).save(comentario);
    }

    @Test
    void debeRechazarComentarioDeUsuarioNoCliente() {
        // Arrange: los administradores o gerentes no pueden comentar.
        Usuario usuario = crearUsuario(1L, "administrador");
        // Act + Assert: la regla falla antes de consultar o guardar.
        assertThrows(IllegalArgumentException.class, () -> comentarioService.crear(crearComentario(), usuario));
        verify(comentarioRepository, never()).save(org.mockito.ArgumentMatchers.any(Comentario.class));
    }

    @Test
    void debeRechazarComentarioDuplicado() {
        // Arrange: el cliente ya tiene un comentario registrado.
        Usuario usuario = crearUsuario(1L, "cliente");
        when(comentarioRepository.findByUsuario_Id(1L)).thenReturn(Optional.of(crearComentario()));
        // Act + Assert.
        assertThrows(IllegalStateException.class, () -> comentarioService.crear(crearComentario(), usuario));
        verify(comentarioRepository, never()).save(org.mockito.ArgumentMatchers.any(Comentario.class));
    }

    @Test
    void debeActualizarComentarioPropio() {
        // Arrange: el usuario autenticado es propietario del comentario.
        Usuario usuario = crearUsuario(1L, "cliente");
        Comentario existente = crearComentario();
        Comentario datos = crearComentario();
        datos.setTexto("El servicio fue excelente y muy recomendable");
        when(comentarioRepository.findByUsuario_Id(1L)).thenReturn(Optional.of(existente));
        when(comentarioRepository.save(existente)).thenReturn(existente);
        // Act.
        Comentario resultado = comentarioService.actualizar(1L, datos, usuario);
        // Assert.
        assertEquals(datos.getTexto(), resultado.getTexto());
        verify(comentarioRepository).save(existente);
    }

    @Test
    void debeRechazarActualizacionDeOtroUsuario() {
        // Arrange: el id solicitado no pertenece al usuario autenticado.
        Usuario usuario = crearUsuario(2L, "cliente");
        // Act + Assert: la validación de propietario ocurre antes de buscar el comentario.
        assertThrows(SecurityException.class, () -> comentarioService.actualizar(1L, crearComentario(), usuario));
        verify(comentarioRepository, never()).findByUsuario_Id(1L);
    }

    private Usuario crearUsuario(Long id, String rol) {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        usuario.setRol(rol);
        return usuario;
    }

    private Comentario crearComentario() {
        Comentario comentario = new Comentario();
        comentario.setTexto("El servicio fue excelente y muy recomendable");
        comentario.setVehiculo("Toyota Corolla");
        comentario.setEstrellas(5);
        return comentario;
    }

}
