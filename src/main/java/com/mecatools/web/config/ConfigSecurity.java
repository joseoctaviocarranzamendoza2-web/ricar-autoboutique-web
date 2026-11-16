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
import com.mecatools.web.repositories.UsuarioRepository;
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
    private final UsuarioRepository usuarioRepository;

    public ConfigSecurity(UsuarioDetailsService usuarioDetailsService, JwtTokenService jwtTokenService,
            ObjectMapper objectMapper, UsuarioRepository usuarioRepository) {
        this.usuarioDetailsService = usuarioDetailsService;
        this.jwtTokenService = jwtTokenService;
        this.objectMapper = objectMapper;
        this.usuarioRepository = usuarioRepository;
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
        // En pre-checks no validamos isEnabled para que Spring Security valide primero la contraseña.
        // Esto evita revelar si una cuenta existe o está inhabilitada si la contraseña es incorrecta.
        provider.setPreAuthenticationChecks(user -> {
            if (!user.isAccountNonLocked()) {
                throw new org.springframework.security.authentication.LockedException("Cuenta bloqueada");
            }
            if (!user.isAccountNonExpired()) {
                throw new org.springframework.security.authentication.AccountExpiredException("Cuenta expirada");
            }
        });
        // En post-checks (se ejecuta estrictamente DESPUÉS de verificar la contraseña):
        // Si las credenciales fueron correctas pero la cuenta está inhabilitada, lanzamos DisabledException.
        provider.setPostAuthenticationChecks(user -> {
            if (!user.isEnabled()) {
                throw new org.springframework.security.authentication.DisabledException(
                        "Tu cuenta se encuentra inhabilitada.\nContacta con administración.");
            }
            if (!user.isCredentialsNonExpired()) {
                throw new org.springframework.security.authentication.CredentialsExpiredException("Credenciales expiradas");
            }
        });
        return provider;
    }

    @Bean
    @Order(1)
    public SecurityFilterChain apiSecurityFilterChain(HttpSecurity http) throws Exception {
        http.securityMatcher("/api/**")
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/usuarios/registro", "/api/usuarios/apelar", "/api/auth/refresh", "/api/usuarios/refresh").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/usuarios/estado-cuenta").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/productos", "/api/productos/**",
                                "/api/servicios", "/api/servicios/**",
                                "/api/categorias", "/api/categorias/**",
                                "/api/comentarios", "/api/comentarios/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/usuarios/roles-disponibles").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/usuarios", "/api/usuarios/**").hasAnyAuthority("administrador", "gerente")
                        .requestMatchers(HttpMethod.PUT, "/api/usuarios", "/api/usuarios/**").hasAnyAuthority("administrador", "cliente")
                        .requestMatchers(HttpMethod.PATCH, "/api/usuarios", "/api/usuarios/**").hasAnyAuthority("administrador", "gerente")
                        .requestMatchers(HttpMethod.POST, "/api/usuarios/*/responder-apelacion").hasAnyAuthority("administrador", "gerente")
                        .requestMatchers(HttpMethod.DELETE, "/api/usuarios", "/api/usuarios/**").hasAuthority("administrador")
                        .requestMatchers(HttpMethod.POST, "/api/productos", "/api/productos/**", "/api/servicios", "/api/servicios/**", "/api/categorias", "/api/categorias/**", "/api/upload/**")
                        .hasAnyAuthority("administrador", "gerente")
                        .requestMatchers(HttpMethod.PUT, "/api/productos", "/api/productos/**", "/api/servicios", "/api/servicios/**", "/api/categorias", "/api/categorias/**")
                        .hasAnyAuthority("administrador", "gerente")
                        .requestMatchers(HttpMethod.DELETE, "/api/productos", "/api/productos/**", "/api/servicios", "/api/servicios/**",
                                "/api/categorias", "/api/categorias/**").hasAuthority("administrador")
                        .requestMatchers("/api/citas", "/api/citas/**", "/api/compras", "/api/compras/**", "/api/mensajes", "/api/mensajes/**").hasAnyAuthority("cliente", "administrador", "gerente")
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
            String tipo = jwt.getClaimAsString("type");
            if ("refresh".equalsIgnoreCase(tipo)) {
                throw new org.springframework.security.oauth2.jwt.BadJwtException("Un refresh token no puede utilizarse como access token");
            }
            UsuarioDetails usuario = (UsuarioDetails) usuarioDetailsService.loadUserByUsername(jwt.getSubject());
            return new UsernamePasswordAuthenticationToken(usuario, jwt, usuario.getAuthorities());
        };
    }

    @Bean
    public JwtCookieAuthenticationFilter jwtCookieAuthenticationFilter(JwtDecoder jwtDecoder) {
        return new JwtCookieAuthenticationFilter(jwtDecoder, usuarioDetailsService, webSecurityContextRepository(), jwtTokenService);
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
                                "/contacto", "/contacto/login", "/contacto/register", "/css/**", "/js/**", "/img/**", "/uploads/**",
                                "/api/auth/refresh", "/api/usuarios/refresh")
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
                        // Handler que devuelve JSON en login exitoso y emite cookie de 20m y refresh token
                        .successHandler(successHandler())
                        // Handler que devuelve JSON en login fallido
                        .failureHandler(failureHandler()).permitAll())
                .logout(logout -> logout
                        // Ruta de logout personalizada
                        .logoutUrl("/logout")
                        .deleteCookies("JSESSIONID", "access_token", "jwt_token", "refresh_token", "rol_activo")
                        // Redirige a /inicio tras cerrar sesión
                        .logoutSuccessUrl("/inicio").permitAll())
                // Si no hay sesión ni token válido, responde 401 JSON; si no tiene permisos, responde 403 JSON
                .exceptionHandling(ex -> ex.authenticationEntryPoint(authenticationEntryPoint())
                        .accessDeniedHandler(accessDeniedHandler()));
        return http.build();
    }

    // Bean que devuelve JSON cuando el login es exitoso y emite la cookie JWT de 20 minutos y Refresh Token de 7 días
    @Bean
    public AuthenticationSuccessHandler successHandler() {
        return new AuthenticationSuccessHandler() {
            @Override
            public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                    Authentication authentication) throws java.io.IOException {
                UsuarioDetails details = (UsuarioDetails) authentication.getPrincipal();
                Usuario u = details.getUsuario();
                String token = jwtTokenService.generarToken(u);
                String refreshToken = jwtTokenService.generarRefreshToken(u);

                // Emite cookie con el JWT de 20 minutos para que persista la autenticación en todas las vistas web
                ResponseCookie cookie = ResponseCookie.from("access_token", token)
                        .path("/")
                        .maxAge(JwtTokenService.TOKEN_LIFETIME)
                        .httpOnly(false)
                        .sameSite("Lax")
                        .build();
                response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

                // Emite cookie con el Refresh Token de 7 días para renovación silenciosa por actividad
                ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", refreshToken)
                        .path("/")
                        .maxAge(JwtTokenService.REFRESH_TOKEN_LIFETIME)
                        .httpOnly(false)
                        .sameSite("Lax")
                        .build();
                response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

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
                body.put("rolBase", u.getRolBase());
                body.put("roles", u.getNombresRoles());
                body.put("estado", u.getEstado());
                body.put("token", token);
                body.put("refreshToken", refreshToken);
                body.put("tokenType", "Bearer");
                body.put("expiresIn", JwtTokenService.TOKEN_LIFETIME.toSeconds());
                body.put("refreshExpiresIn", JwtTokenService.REFRESH_TOKEN_LIFETIME.toSeconds());
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
                String mensaje = "Correo o contraseña incorrectos";
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("status", HttpStatus.UNAUTHORIZED.value());
                body.put("error", HttpStatus.UNAUTHORIZED.getReasonPhrase());

                if (exception instanceof org.springframework.security.authentication.DisabledException) {
                    mensaje = "Tu cuenta se encuentra inhabilitada.\nContacta con administración.";
                    body.put("inhabilitado", true);
                    String email = request.getParameter("email");
                    if (email != null && !email.isBlank()) {
                        Usuario u = usuarioRepository.findByEmail(email.trim().toLowerCase()).orElse(null);
                        if (u != null) {
                            body.put("email", u.getEmail());
                            body.put("nombres", u.getNombres() + " " + u.getApellidos());
                            body.put("motivoBloqueo", u.getMotivoBloqueo());
                            body.put("evidenciaBloqueo", u.getEvidenciaBloqueo());
                            body.put("fechaBloqueo", u.getFechaBloqueo() != null ? u.getFechaBloqueo().toString() : null);
                            body.put("mensajeApelacion", u.getMensajeApelacion());
                            body.put("fechaApelacion", u.getFechaApelacion() != null ? u.getFechaApelacion().toString() : null);
                            body.put("estadoApelacion", u.getEstadoApelacion());
                            body.put("respuestaApelacion", u.getRespuestaApelacion());
                            body.put("evidenciaRespuesta", u.getEvidenciaRespuesta());
                            body.put("fechaRespuestaApelacion", u.getFechaRespuestaApelacion() != null ? u.getFechaRespuestaApelacion().toString() : null);
                            body.put("mensajeHabilitacion", u.getMensajeHabilitacion());
                            body.put("evidenciaHabilitacion", u.getEvidenciaHabilitacion());
                            body.put("fechaHabilitacion", u.getFechaHabilitacion() != null ? u.getFechaHabilitacion().toString() : null);

                            boolean puedeApelar = true;
                            long diasRestantes = 0;
                            if (u.getFechaApelacion() != null) {
                                java.time.LocalDateTime proxima = u.getFechaApelacion().plusDays(7);
                                java.time.LocalDateTime ahora = java.time.LocalDateTime.now();
                                if (ahora.isBefore(proxima)) {
                                    puedeApelar = false;
                                    diasRestantes = java.time.Duration.between(ahora, proxima).toDays() + 1;
                                }
                            }
                            body.put("puedeApelar", puedeApelar);
                            body.put("diasRestantes", diasRestantes);
                        }
                    }
                }
                body.put("message", mensaje);
                response.setStatus(HttpStatus.UNAUTHORIZED.value());
                objectMapper.writeValue(response.getWriter(), body);
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
