// Paquete de clases de seguridad de Spring Security para la autenticación de usuarios
package com.mecatools.web.security;

// Imports necesarios para mapear el usuario del dominio a los detalles de seguridad de Spring Security
import com.mecatools.web.models.Usuario;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import java.util.Collection;
import java.util.List;

// Implementa UserDetails para que Spring Security pueda leer la información de usuario
public class UsuarioDetails implements UserDetails {

    // Guarda el usuario del dominio para exponer datos como email, password y rol
    private final Usuario usuario;

    // Constructor recibe el usuario del dominio de la aplicación
    public UsuarioDetails(Usuario usuario) {
        this.usuario = usuario;
    }

    // Expone la entidad Usuario completa cuando otras clases necesitan datos adicionales
    public Usuario getUsuario() {
        return usuario;
    }

    // Devuelve los roles/autoridades del usuario en el formato que Spring Security requiere
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(usuario.getRol().toLowerCase()));
    }

    // Devuelve la contraseña del usuario para la autenticación
    @Override
    public String getPassword() {
        return usuario.getPassword();
    }

    // Devuelve el nombre de usuario utilizado por Spring Security para iniciar sesión
    @Override
    public String getUsername() {
        return usuario.getEmail();
    }

    // Indica si la cuenta no ha expirado; siempre true para este modelo simple
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    // Indica si la cuenta no está bloqueada; siempre true en esta implementación
    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    // Indica si las credenciales no han expirado; siempre true aquí
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    // Indica si el usuario está habilitado para iniciar sesión; siempre true en este caso
    @Override
    public boolean isEnabled() {
        return true;
    }

}
