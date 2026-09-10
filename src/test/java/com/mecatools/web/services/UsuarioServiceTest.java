package com.mecatools.web.services;

import com.mecatools.web.models.Cita;
import com.mecatools.web.models.Compra;
import com.mecatools.web.models.Usuario;
import com.mecatools.web.repositories.CitaRepository;
import com.mecatools.web.repositories.CompraRepository;
import com.mecatools.web.repositories.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)

class UsuarioServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private CitaRepository citaRepository;

    @Mock
    private CompraRepository compraRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UsuarioService usuarioService;

    @Test
    void debeRegistrarClienteConValoresPredeterminadosYContrasenaCifrada() {
        // Arrange: se omiten rol y ciudad para comprobar sus valores por defecto.
        Usuario usuario = crearUsuario();
        usuario.setPassword("clave123");
        when(usuarioRepository.findByEmail("cliente@test.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("clave123")).thenReturn("hash-clave");
        when(usuarioRepository.save(usuario)).thenReturn(usuario);
        // Act.
        Usuario resultado = usuarioService.registrar(usuario);
        // Assert: se aplican rol, ciudad y contraseña cifrada.
        assertEquals("cliente", resultado.getRol());
        assertEquals("Trujillo", resultado.getCiudad());
        assertEquals("hash-clave", resultado.getPassword());
        verify(usuarioRepository).save(usuario);
    }

    @Test
    void debeRechazarContrasenaCorta() {
        // Arrange.
        Usuario usuario = crearUsuario();
        usuario.setPassword("1234567");
        // Act + Assert: la longitud se valida antes de consultar el repositorio.
        assertThrows(IllegalArgumentException.class, () -> usuarioService.registrar(usuario));
        verify(usuarioRepository, never()).findByEmail(org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void debeRechazarEmailDuplicado() {
        // Arrange: el correo ya pertenece a otro usuario.
        Usuario usuario = crearUsuario();
        usuario.setPassword("clave123");
        when(usuarioRepository.findByEmail("cliente@test.com")).thenReturn(Optional.of(crearUsuario()));
        // Act + Assert.
        assertThrows(IllegalStateException.class, () -> usuarioService.registrar(usuario));
        verify(usuarioRepository, never()).save(usuario);
    }

    @Test
    void debeEditarPerfilExistente() {
        // Arrange.
        Usuario usuario = crearUsuario();
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuario));
        when(usuarioRepository.save(usuario)).thenReturn(usuario);
        // Act: solo se actualizan los campos enviados en el mapa.
        Usuario resultado = usuarioService.editarPerfil(1L, Map.of("ciudad", "Lima"));
        // Assert.
        assertEquals("Lima", resultado.getCiudad());
        verify(usuarioRepository).save(usuario);
    }

    @Test
    void debeRechazarEliminacionConRegistrosAsociadosSiNoSeFuerza() {
        // Arrange: el cliente tiene una cita y una compra.
        Usuario usuario = crearUsuario();
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuario));
        when(citaRepository.findByUsuario_Id(1L)).thenReturn(List.of(new Cita()));
        when(compraRepository.findByUsuario_Id(1L)).thenReturn(List.of(new Compra()));
        // Act + Assert: se conserva la información para evitar una eliminación accidental.
        assertThrows(UsuarioService.RegistrosAsociadosException.class, () -> usuarioService.eliminarCliente(1L, false));
        verify(usuarioRepository, never()).deleteById(1L);
    }

    private Usuario crearUsuario() {
        Usuario usuario = new Usuario();
        usuario.setId(1L);
        usuario.setNombres("Ana");
        usuario.setApellidos("Perez");
        usuario.setEmail("cliente@test.com");
        usuario.setRol("cliente");
        return usuario;
    }

}
