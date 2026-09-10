// Paquete para configuración de seguridad web
package com.mecatools.web.config;

// Librerías para configuración y handlers de Spring Security
import com.mecatools.web.models.Usuario;
import com.mecatools.web.security.UsuarioDetails;
import com.mecatools.web.security.UsuarioDetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.http.HttpStatus;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// Marca la clase como configuración de Spring
@Configuration
// Habilita la seguridad web de Spring Boot
@EnableWebSecurity
// Habilita seguridad en métodos con anotaciones
@EnableMethodSecurity
// Genera un constructor para inyectar dependencias finales
@RequiredArgsConstructor

// Clase que configura los filtros y proveedores de seguridad
public class ConfigSecurity {

    // Servicio que carga el usuario y sus autoridades
    private final UsuarioDetailsService usuarioDetailsService;

    // Bean para encriptar contraseñas usando BCrypt
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // Bean que expone el AuthenticationManager de Spring
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    // Bean proveedor de autenticación con usuario y codificador de contraseña
    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(usuarioDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    // Bean que define reglas de acceso, login y logout
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                    // Recursos estáticos y páginas públicas sin sesión
                    .requestMatchers("/", "/inicio", "/servicios", "/productos", "/nosotros", "/contacto", "/css/**", "/js/**", "/img/**").permitAll()
                    // Endpoints públicos de autenticación/registro
                    .requestMatchers("/api/usuarios/registro").permitAll()
                    // Lectura pública del catálogo (para que la página se muestre sin login)
                    .requestMatchers(HttpMethod.GET, "/api/productos/**", "/api/servicios/**", "/api/categorias/**", "/api/comentarios/**").permitAll()
                    // Páginas del navbar con sesión: /inicio/{rol}/{id}, /servicios/{rol}/{id}, etc.
                    .requestMatchers("/*/cliente/**").hasAuthority("cliente")
                    .requestMatchers("/*/administrador/**").hasAuthority("administrador")
                    .requestMatchers("/*/gerente/**").hasAuthority("gerente")
                    // Paneles por rol: /panel/{rol}/{id}/...
                    .requestMatchers("/panel/cliente/**").hasAuthority("cliente")
                    .requestMatchers("/panel/administrador/**").hasAuthority("administrador")
                    .requestMatchers("/panel/gerente/**").hasAuthority("gerente")
                    // Rutas de panel raíz sin prefijo /panel (ej. /cliente/{id}, /administrador/{id}, /gerente/{id})
                    .requestMatchers("/cliente/**").hasAuthority("cliente")
                    .requestMatchers("/administrador/**").hasAuthority("administrador")
                    .requestMatchers("/gerente/**").hasAuthority("gerente")
                    // Escritura del catálogo: solo administrador y gerente
                    .requestMatchers(HttpMethod.POST, "/api/productos/**", "/api/servicios/**", "/api/categorias/**").hasAnyAuthority("administrador", "gerente")
                    .requestMatchers(HttpMethod.PUT, "/api/productos/**", "/api/servicios/**", "/api/categorias/**").hasAnyAuthority("administrador", "gerente")
                    .requestMatchers(HttpMethod.DELETE, "/api/productos/**", "/api/servicios/**", "/api/categorias/**").hasAuthority("administrador")
                    // Lectura de clientes para los paneles de administración y gerencia
                    .requestMatchers(HttpMethod.GET, "/api/usuarios/**").hasAnyAuthority("administrador", "gerente")
                    // Gestión de clientes: solo administrador
                    .requestMatchers("/api/usuarios/**").hasAuthority("administrador")
                    // Citas, compras y comentarios: cualquier usuario autenticado (la propia clase valida el rol puntual)
                    .requestMatchers("/api/citas/**", "/api/compras/**", "/api/comentarios/**").authenticated()
                    // Cualquier otra petición requiere sesión iniciada
                    .anyRequest().authenticated())
                .formLogin(form -> form
                    // Ruta de procesamiento de login personalizada
                    .loginProcessingUrl("/login")
                    // Nombre del parámetro de usuario en el formulario
                    .usernameParameter("email")
                    // Nombre del parámetro de contraseña en el formulario
                    .passwordParameter("password")
                    // Handler que devuelve JSON en login exitoso
                    .successHandler(successHandler())
                    // Handler que devuelve JSON en login fallido
                    .failureHandler(failureHandler()).permitAll())
                .logout(logout -> logout
                    // Ruta de logout personalizada
                    .logoutUrl("/logout")
                    // Redirige a /inicio tras cerrar sesión
                    .logoutSuccessUrl("/inicio").permitAll())
                // Si no hay sesión y se pide un recurso protegido, responde 401 en vez de redirigir a una página de login HTML
                .exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)).accessDeniedHandler(accessDeniedHandler()));
        return http.build();
    }

    // Bean que devuelve JSON cuando el login es exitoso
    @Bean
    public AuthenticationSuccessHandler successHandler() {
        return new AuthenticationSuccessHandler() {
            @Override
            public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws java.io.IOException {
                UsuarioDetails details = (UsuarioDetails) authentication.getPrincipal();
                Usuario u = details.getUsuario();
                response.setContentType("application/json");
                response.setCharacterEncoding("UTF-8");
                response.getWriter().write(String.format("{\"id\":%d,\"nombres\":\"%s\",\"apellidos\":\"%s\",\"email\":\"%s\",\"telefono\":\"%s\",\"ciudad\":\"%s\",\"rol\":\"%s\"}", u.getId(), u.getNombres(), u.getApellidos(), u.getEmail(), u.getTelefono() != null ? u.getTelefono() : "", u.getCiudad() != null ? u.getCiudad() : "Trujillo", u.getRol()));
            }
        };
    }

    // Bean que devuelve JSON cuando el login falla
    @Bean
    public AuthenticationFailureHandler failureHandler() {
        return new AuthenticationFailureHandler() {
            @Override
            public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) throws java.io.IOException {
                response.setContentType("application/json");
                response.setCharacterEncoding("UTF-8");
                response.setStatus(401);
                response.getWriter().write("{\"error\":\"Credenciales incorrectas\"}");
            }
        };
    }

    // Bean que devuelve JSON 403 cuando un usuario autenticado no tiene el rol requerido
    @Bean
    public AccessDeniedHandler accessDeniedHandler() {
        return (request, response, accessDeniedException) -> {
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.setStatus(403);
            response.getWriter().write("{\"error\":\"No tienes permisos para acceder a este recurso\"}");
        };
    }

}
