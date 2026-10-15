package com.mecatools.web.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Filtro de seguridad que autentica peticiones web y API a partir del JWT
 * almacenado en cookies (access_token / jwt_token) o en la cabecera Authorization: Bearer.
 * Garantiza que la sesión del usuario persista durante las 24 horas del JWT sin depender
 * exclusivamente de la sesión en memoria de Tomcat y aplica las autoridades del rol_activo seleccionado.
 */
public class JwtCookieAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(JwtCookieAuthenticationFilter.class);

    private final JwtDecoder jwtDecoder;
    private final UsuarioDetailsService usuarioDetailsService;
    private final SecurityContextRepository securityContextRepository;

    public JwtCookieAuthenticationFilter(JwtDecoder jwtDecoder,
                                        UsuarioDetailsService usuarioDetailsService,
                                        SecurityContextRepository securityContextRepository) {
        this.jwtDecoder = jwtDecoder;
        this.usuarioDetailsService = usuarioDetailsService;
        this.securityContextRepository = securityContextRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        Authentication authActual = SecurityContextHolder.getContext().getAuthentication();
        boolean yaAutenticado = authActual != null
                && authActual.isAuthenticated()
                && !"anonymousUser".equals(authActual.getPrincipal());

        if (yaAutenticado && authActual.getPrincipal() instanceof UsuarioDetails uDetails) {
            // Usuario ya autenticado en sesión: sincronizar sus autoridades con el rol_activo actual si fue cambiado
            String rolActivo = resolverRolActivo(request);
            if (StringUtils.hasText(rolActivo)) {
                Collection<? extends GrantedAuthority> autoridadesEsperadas = resolverAutoridadesActivas(uDetails, rolActivo);
                if (!tienenMismasAutoridades(authActual.getAuthorities(), autoridadesEsperadas)) {
                    UsernamePasswordAuthenticationToken authActualizada =
                            new UsernamePasswordAuthenticationToken(uDetails, authActual.getCredentials(), autoridadesEsperadas);
                    SecurityContext context = SecurityContextHolder.getContext();
                    context.setAuthentication(authActualizada);
                    if (securityContextRepository != null) {
                        securityContextRepository.saveContext(context, request, response);
                    }
                }
            }
        } else if (!yaAutenticado) {
            String token = resolverToken(request);
            if (StringUtils.hasText(token)) {
                try {
                    Jwt jwt = jwtDecoder.decode(token);
                    String email = jwt.getSubject();
                    if (StringUtils.hasText(email)) {
                        UserDetails userDetails = usuarioDetailsService.loadUserByUsername(email);
                        UsuarioDetails uDetails = (UsuarioDetails) userDetails;
                        String rolActivo = resolverRolActivo(request);
                        Collection<? extends GrantedAuthority> authorities = resolverAutoridadesActivas(uDetails, rolActivo);

                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(userDetails, jwt, authorities);

                        SecurityContext context = SecurityContextHolder.createEmptyContext();
                        context.setAuthentication(authentication);
                        SecurityContextHolder.setContext(context);
                        if (securityContextRepository != null) {
                            securityContextRepository.saveContext(context, request, response);
                        }
                    }
                } catch (Exception e) {
                    LOGGER.debug("Token JWT no procesable en {}: {}", request.getRequestURI(), e.getMessage());
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    private Collection<? extends GrantedAuthority> resolverAutoridadesActivas(UsuarioDetails uDetails, String rolActivo) {
        if (StringUtils.hasText(rolActivo)) {
            if (uDetails.getUsuario().tieneRol(rolActivo)) {
                return List.of(new SimpleGrantedAuthority(rolActivo.toLowerCase()));
            } else {
                return Collections.emptyList();
            }
        }
        if (uDetails.getUsuario().getNombresRoles().size() == 1) {
            return List.of(new SimpleGrantedAuthority(uDetails.getUsuario().getRol().toLowerCase()));
        }
        return uDetails.getAuthorities();
    }

    private boolean tienenMismasAutoridades(Collection<? extends GrantedAuthority> a1, Collection<? extends GrantedAuthority> a2) {
        if (a1 == null || a2 == null) return a1 == a2;
        if (a1.size() != a2.size()) return false;
        List<String> s1 = a1.stream().map(GrantedAuthority::getAuthority).sorted().toList();
        List<String> s2 = a2.stream().map(GrantedAuthority::getAuthority).sorted().toList();
        return s1.equals(s2);
    }

    private String resolverRolActivo(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("rol_activo".equals(cookie.getName()) && StringUtils.hasText(cookie.getValue())) {
                    return cookie.getValue().trim();
                }
            }
        }
        return null;
    }

    private String resolverToken(HttpServletRequest request) {
        // 1. Cabecera Authorization: Bearer <token>
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (StringUtils.hasText(authHeader) && authHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return authHeader.substring(7).trim();
        }

        // 2. Cookie 'access_token' o 'jwt_token'
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("access_token".equals(cookie.getName()) || "jwt_token".equals(cookie.getName())) {
                    if (StringUtils.hasText(cookie.getValue())) {
                        return cookie.getValue().trim();
                    }
                }
            }
        }

        return null;
    }
}
