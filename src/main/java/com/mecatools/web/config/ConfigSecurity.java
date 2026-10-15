// Paquete para configuración de seguridad web
package com.mecatools.web.config;

// Librerías para configuración y handlers de Spring Security
import com.mecatools.web.models.Usuario;
import com.mecatools.web.security.UsuarioDetails;
import com.mecatools.web.security.UsuarioDetailsService;
import tools.jackson.databind.ObjectMapper;
import com.mecatools.web.security.JwtTokenService;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.core.convert.converter.Converter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import com.mecatools.web.security.JwtCookieAuthenticationFilter;
import org.springframework.core.annotation.Order;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// Marca la clase como configuración de Spring
@Configuration
// Habilita la seguridad web de Spring Boot
@EnableWebSecurity
// Habilita seguridad en métodos con anotaciones
@EnableMethodSecurity
// Clase que configura los filtros y proveedores de seguridad
public class ConfigSecurity {

    // Servicio que carga el usuario y sus autoridades
    private final UsuarioDetailsService usuarioDetailsService;
    private final JwtTokenService jwtTokenService;
    private final ObjectMapper objectMapper;

    public ConfigSecurity(UsuarioDetailsService usuarioDetailsService, JwtTokenService jwtTokenService,
            ObjectMapper objectMapper) {
        this.usuarioDetailsService = usuarioDetailsService;
        this.jwtTokenService = jwtTokenService;
        this.objectMapper = objectMapper;
    }

    // Bean para encriptar contraseñas usando BCrypt
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityContextRepository webSecurityContextRepository() {
        return new HttpSessionSecurityContextRepository();
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

    @Bean
    @Order(1)
    public SecurityFilterChain apiSecurityFilterChain(HttpSecurity http) throws Exception {
        http.securityMatcher("/api/**")
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/usuarios/registro").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/productos/**", "/api/servicios/**",
                                "/api/categorias/**", "/api/comentarios/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/usuarios/roles-disponibles").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/usuarios/**").hasAnyAuthority("administrador", "gerente")
                        .requestMatchers(HttpMethod.PUT, "/api/usuarios/**").hasAnyAuthority("administrador", "cliente")
                        .requestMatchers(HttpMethod.DELETE, "/api/usuarios/**").hasAuthority("administrador")
                        .requestMatchers(HttpMethod.POST, "/api/productos/**", "/api/servicios/**", "/api/categorias/**")
                        .hasAnyAuthority("administrador", "gerente")
                        .requestMatchers(HttpMethod.PUT, "/api/productos/**", "/api/servicios/**", "/api/categorias/**")
                        .hasAnyAuthority("administrador", "gerente")
                        .requestMatchers(HttpMethod.DELETE, "/api/productos/**", "/api/servicios/**",
                                "/api/categorias/**").hasAuthority("administrador")
                        .requestMatchers("/api/citas/**", "/api/compras/**").hasAnyAuthority("cliente", "administrador", "gerente")
                        .anyRequest().authenticated())
                .oauth2ResourceServer(resourceServer -> resourceServer
                                .authenticationEntryPoint(authenticationEntryPoint())
                                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authenticationEntryPoint())
                        .accessDeniedHandler(accessDeniedHandler()));
        return http.build();
    }

    private Converter<Jwt, ? extends AbstractAuthenticationToken> jwtAuthenticationConverter() {
        return jwt -> {
            UsuarioDetails usuario = (UsuarioDetails) usuarioDetailsService.loadUserByUsername(jwt.getSubject());
            return new UsernamePasswordAuthenticationToken(usuario, jwt, usuario.getAuthorities());
        };
    }

    @Bean
    public JwtCookieAuthenticationFilter jwtCookieAuthenticationFilter(JwtDecoder jwtDecoder) {
        return new JwtCookieAuthenticationFilter(jwtDecoder, usuarioDetailsService, webSecurityContextRepository());
    }

    // Bean que define reglas de acceso, login y logout para las vistas web con sesión.
    @Bean
    @Order(2)
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtDecoder jwtDecoder) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .securityContext(context -> context
                        .securityContextRepository(webSecurityContextRepository())
                        .requireExplicitSave(false))
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .addFilterBefore(jwtCookieAuthenticationFilter(jwtDecoder), UsernamePasswordAuthenticationFilter.class)
                .authorizeHttpRequests(auth -> auth
                        // Recursos estáticos y páginas públicas sin sesión
                        .requestMatchers("/", "/inicio", "/inicio/login", "/inicio/register", "/servicios",
                                "/servicios/login", "/servicios/register", "/productos", "/productos/login",
                                "/productos/register", "/nosotros", "/nosotros/login", "/nosotros/register",
                                "/contacto", "/contacto/login", "/contacto/register", "/css/**", "/js/**", "/img/**")
                        .permitAll()
                        // Selección de rol: pública para que funcione aunque la sesión HTTP haya
                        // expirado. La autenticación real la gestiona rol.js via sessionStorage.
                        .requestMatchers("/setupRole", "/rol", "/seleccionar-rol").permitAll()
                        // Páginas del navbar con sesión: /inicio/{rol}/{id}, /servicios/{rol}/{id},
                        // etc.
                        .requestMatchers("/*/cliente/**").hasAuthority("cliente")
                        .requestMatchers("/*/administrador/**").hasAuthority("administrador")
                        .requestMatchers("/*/gerente/**").hasAuthority("gerente")
                        // Paneles por rol: /panel/{rol}/{id}/...
                        .requestMatchers("/panel/cliente/**").hasAuthority("cliente")
                        .requestMatchers("/panel/administrador/**").hasAuthority("administrador")
                        .requestMatchers("/panel/gerente/**").hasAuthority("gerente")
                        // Rutas de panel raíz sin prefijo /panel (ej. /cliente/{id},
                        // /administrador/{id}, /gerente/{id})
                        .requestMatchers("/cliente/**").hasAuthority("cliente")
                        .requestMatchers("/administrador/**").hasAuthority("administrador")
                        .requestMatchers("/gerente/**").hasAuthority("gerente")
                        // Cualquier otra petición requiere sesión iniciada
                        .anyRequest().authenticated())
                .formLogin(form -> form
                        .securityContextRepository(webSecurityContextRepository())
                        // Ruta de procesamiento de login personalizada
                        .loginProcessingUrl("/login")
                        // Nombre del parámetro de usuario en el formulario
                        .usernameParameter("email")
                        // Nombre del parámetro de contraseña en el formulario
                        .passwordParameter("password")
                        // Handler que devuelve JSON en login exitoso y emite cookie de 20m
                        .successHandler(successHandler())
                        // Handler que devuelve JSON en login fallido
                        .failureHandler(failureHandler()).permitAll())
                .logout(logout -> logout
                        // Ruta de logout personalizada
                        .logoutUrl("/logout")
                        .deleteCookies("JSESSIONID", "access_token", "jwt_token", "rol_activo")
                        // Redirige a /inicio tras cerrar sesión
                        .logoutSuccessUrl("/inicio").permitAll())
                // Si no hay sesión ni token válido, responde 401 JSON; si no tiene permisos, responde 403 JSON
                .exceptionHandling(ex -> ex.authenticationEntryPoint(authenticationEntryPoint())
                        .accessDeniedHandler(accessDeniedHandler()));
        return http.build();
    }

    // Bean que devuelve JSON cuando el login es exitoso y emite la cookie JWT de 20 minutos
    @Bean
    public AuthenticationSuccessHandler successHandler() {
        return new AuthenticationSuccessHandler() {
            @Override
            public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                    Authentication authentication) throws java.io.IOException {
                UsuarioDetails details = (UsuarioDetails) authentication.getPrincipal();
                Usuario u = details.getUsuario();
                String token = jwtTokenService.generarToken(u);

                // Emite cookie con el JWT de 20 minutos para que persista la autenticación en todas las vistas web
                ResponseCookie cookie = ResponseCookie.from("access_token", token)
                        .path("/")
                        .maxAge(JwtTokenService.TOKEN_LIFETIME)
                        .httpOnly(false)
                        .sameSite("Lax")
                        .build();
                response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

                if (u.getNombresRoles().size() == 1) {
                    ResponseCookie rolCookie = ResponseCookie.from("rol_activo", u.getRol().toLowerCase())
                            .path("/")
                            .maxAge(JwtTokenService.TOKEN_LIFETIME)
                            .httpOnly(false)
                            .sameSite("Lax")
                            .build();
                    response.addHeader(HttpHeaders.SET_COOKIE, rolCookie.toString());
                }

                response.setContentType("application/json");
                response.setCharacterEncoding("UTF-8");
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("id", u.getId());
                body.put("nombres", u.getNombres());
                body.put("apellidos", u.getApellidos());
                body.put("email", u.getEmail());
                body.put("telefono", u.getTelefono() != null ? u.getTelefono() : "");
                body.put("ciudad", u.getCiudad() != null ? u.getCiudad() : "Trujillo");
                body.put("rol", u.getRol());
                body.put("roles", u.getNombresRoles());
                body.put("token", token);
                body.put("tokenType", "Bearer");
                body.put("expiresIn", JwtTokenService.TOKEN_LIFETIME.toSeconds());
                objectMapper.writeValue(response.getWriter(), body);
            }
        };
    }

    // Bean que devuelve JSON cuando el login falla
    @Bean
    public AuthenticationFailureHandler failureHandler() {
        return new AuthenticationFailureHandler() {
            @Override
            public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
                    AuthenticationException exception) throws java.io.IOException {
                response.setContentType("application/json");
                response.setCharacterEncoding("UTF-8");
                escribirErrorJson(response, HttpStatus.UNAUTHORIZED, "Credenciales incorrectas");
            }
        };
    }

    @Bean
    public AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, authException) -> {
            escribirErrorJson(
                    response, HttpStatus.UNAUTHORIZED, "Se requiere autenticación válida para acceder a este recurso");
        };
    }

    // Bean que devuelve JSON 403 cuando un usuario autenticado no tiene el rol requerido
    @Bean
    public AccessDeniedHandler accessDeniedHandler() {
        return (request, response, accessDeniedException) -> {
            escribirErrorJson(response, HttpStatus.FORBIDDEN,
                    "No tienes permisos para acceder a este recurso");
        };
    }

    private void escribirErrorJson(HttpServletResponse response, HttpStatus status, String message)
            throws java.io.IOException {
        response.setStatus(status.value());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        objectMapper.writeValue(response.getWriter(), body);
    }

}

