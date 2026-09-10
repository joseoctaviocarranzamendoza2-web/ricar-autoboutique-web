// Paquete de clases de seguridad de Spring Security para la autenticación de usuarios
package com.mecatools.web.security;

// Imports necesarios para inyectar repositorios y conectar el dominio de Usuario con Spring Security
import com.mecatools.web.models.Usuario;
import com.mecatools.web.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

// Servicio de Spring que carga los detalles del usuario para el proceso de autenticación
@Service
// Lombok genera un constructor con los campos finales necesarios para la inyección de dependencias
@RequiredArgsConstructor

// Implementa UserDetailsService para que Spring Security pueda delegar la carga de usuarios
public class UsuarioDetailsService implements UserDetailsService {

    // Repositorio inyectado que permite consultar usuarios por email
    private final UsuarioRepository usuarioRepository;

    // Carga el usuario por email y lo transforma en un objeto UserDetails para Spring Security
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepository.findByEmail(email).orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + email));
        return new UsuarioDetails(usuario);
    }

}
