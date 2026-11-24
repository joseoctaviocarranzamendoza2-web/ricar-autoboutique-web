package com.mecatools.web.api;

import com.mecatools.web.models.Usuario;
import com.mecatools.web.repositories.UsuarioRepository;
import com.mecatools.web.security.JwtTokenService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Controlador API para autenticación y renovación de tokens (Refresh Token).
 * Permite que los clientes renueven su token JWT de 20 minutos de forma transparente
 * mientras permanezcan activos en la plataforma.
 */
@RestController
@RequestMapping({"/api/auth", "/api/usuarios"})
public class AuthApiController {

    private static final Logger LOGGER = LoggerFactory.getLogger(AuthApiController.class);

    private final JwtDecoder jwtDecoder;
    private final JwtTokenService jwtTokenService;
    private final UsuarioRepository usuarioRepository;

    public AuthApiController(JwtDecoder jwtDecoder,
                             JwtTokenService jwtTokenService,
                             UsuarioRepository usuarioRepository) {
        this.jwtDecoder = jwtDecoder;
        this.jwtTokenService = jwtTokenService;
        this.usuarioRepository = usuarioRepository;
    }

    /**
     * Endpoint para renovar el Access Token mediante un Refresh Token válido.
     * Lee el refresh token desde el cuerpo JSON, la cabecera X-Refresh-Token o la cookie refresh_token.
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody(required = false) Map<String, String> body,
                                     @RequestHeader(value = "X-Refresh-Token", required = false) String headerRefreshToken,
                                     HttpServletRequest request,
                                     HttpServletResponse response) {
        String tokenCandidato = null;

        // 1. Extraer desde cuerpo JSON
        if (body != null && StringUtils.hasText(body.get("refreshToken"))) {
            tokenCandidato = body.get("refreshToken").trim();
        }

        // 2. Extraer desde cabecera HTTP
        if (!StringUtils.hasText(tokenCandidato) && StringUtils.hasText(headerRefreshToken)) {
            tokenCandidato = headerRefreshToken.trim();
        }

        // 3. Extraer desde cookies del navegador
        if (!StringUtils.hasText(tokenCandidato)) {
            Cookie[] cookies = request.getCookies();
            if (cookies != null) {
                for (Cookie cookie : cookies) {
                    if ("refresh_token".equals(cookie.getName()) && StringUtils.hasText(cookie.getValue())) {
                        tokenCandidato = cookie.getValue().trim();
                        break;
                    }
                }
            }
        }

        if (!StringUtils.hasText(tokenCandidato)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "No se proporcionó ningún Refresh Token válido"));
        }

        try {
            Jwt jwt = jwtDecoder.decode(tokenCandidato);
            String tipo = jwt.getClaimAsString("type");

            // Valida que el token sea de tipo refresh y no un access token
            if (tipo != null && !"refresh".equalsIgnoreCase(tipo)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "El token proporcionado no es un Refresh Token"));
            }

            String email = jwt.getSubject();
            if (!StringUtils.hasText(email)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Sujeto no válido en Refresh Token"));
            }

            Optional<Usuario> usuarioOpt = usuarioRepository.findByEmailIgnoreCase(email);
            if (usuarioOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Usuario no encontrado"));
            }

            Usuario usuario = usuarioOpt.get();
            if (usuario.getEstado() != null && !"Activo".equalsIgnoreCase(usuario.getEstado())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "La cuenta se encuentra inactiva o inhabilitada"));
            }

            // Genera nuevo par de tokens (Access Token de 20m y Refresh Token de 7 días)
            String nuevoAccessToken = jwtTokenService.generarToken(usuario);
            String nuevoRefreshToken = jwtTokenService.generarRefreshToken(usuario);

            // Emite cookie de access_token con duración de 20 minutos
            ResponseCookie cookieAcceso = ResponseCookie.from("access_token", nuevoAccessToken)
                    .path("/")
                    .maxAge(JwtTokenService.TOKEN_LIFETIME)
                    .httpOnly(false)
                    .sameSite("Lax")
                    .build();
            response.addHeader(HttpHeaders.SET_COOKIE, cookieAcceso.toString());

            // Emite cookie de refresh_token con duración de 7 días
            ResponseCookie cookieRefresh = ResponseCookie.from("refresh_token", nuevoRefreshToken)
                    .path("/")
                    .maxAge(JwtTokenService.REFRESH_TOKEN_LIFETIME)
                    .httpOnly(false)
                    .sameSite("Lax")
                    .build();
            response.addHeader(HttpHeaders.SET_COOKIE, cookieRefresh.toString());

            // Si el usuario tiene un solo rol, sincroniza también la cookie de rol_activo
            if (usuario.getNombresRoles().size() == 1) {
                ResponseCookie rolCookie = ResponseCookie.from("rol_activo", usuario.getRol().toLowerCase())
                        .path("/")
                        .maxAge(JwtTokenService.TOKEN_LIFETIME)
                        .httpOnly(false)
                        .sameSite("Lax")
                        .build();
                response.addHeader(HttpHeaders.SET_COOKIE, rolCookie.toString());
            }

            Map<String, Object> respuesta = new LinkedHashMap<>();
            respuesta.put("token", nuevoAccessToken);
            respuesta.put("refreshToken", nuevoRefreshToken);
            respuesta.put("tokenType", "Bearer");
            respuesta.put("expiresIn", JwtTokenService.TOKEN_LIFETIME.toSeconds());
            respuesta.put("refreshExpiresIn", JwtTokenService.REFRESH_TOKEN_LIFETIME.toSeconds());
            respuesta.put("usuario", Map.of(
                    "id", usuario.getId(),
                    "nombres", usuario.getNombres(),
                    "apellidos", usuario.getApellidos(),
                    "email", usuario.getEmail(),
                    "telefono", usuario.getTelefono() != null ? usuario.getTelefono() : "",
                    "ciudad", usuario.getCiudad() != null ? usuario.getCiudad() : "Trujillo",
                    "rol", usuario.getRol(),
                    "roles", usuario.getNombresRoles(),
                    "estado", usuario.getEstado()
            ));

            LOGGER.info("Token JWT renovado exitosamente para el usuario: {}", email);
            return ResponseEntity.ok(respuesta);

        } catch (JwtException e) {
            LOGGER.warn("Intento de renovación con Refresh Token inválido o expirado: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Refresh Token inválido o expirado"));
        } catch (Exception e) {
            LOGGER.error("Error inesperado en renovación de token: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno al renovar credenciales"));
        }
    }
}

