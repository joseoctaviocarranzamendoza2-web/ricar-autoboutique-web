package com.mecatools.web.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.mecatools.web.models.Usuario;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.time.Duration;
import java.util.Base64;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

class JwtTokenServiceTest {

    private JwtTokenService tokenService;
    private JwtDecoder jwtDecoder;

    @BeforeEach
    void setUp() {
        byte[] keyBytes = Base64.getDecoder().decode("MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=");
        SecretKey key = new SecretKeySpec(keyBytes, "HmacSHA256");
        JwtEncoder encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(JwtTokenService.ISSUER));
        jwtDecoder = decoder;
        tokenService = new JwtTokenService(encoder);
    }

    @Test
    void generaTokenFirmadoConRolesYVigenciaDe24Horas() {
        Usuario usuario = new Usuario();
        usuario.setId(42L);
        usuario.setEmail("gerente@ricar.com");
        usuario.setRol("gerente");

        Jwt jwt = jwtDecoder.decode(tokenService.generarToken(usuario));

        assertEquals(JwtTokenService.ISSUER, jwt.getClaimAsString("iss"));
        assertEquals("gerente@ricar.com", jwt.getSubject());
        assertEquals(42L, ((Number) jwt.getClaim("uid")).longValue());
        assertEquals(
                java.util.List.of("cliente", "administrador", "gerente"),
                jwt.getClaimAsStringList("roles"));
        assertEquals(Duration.ofHours(24), Duration.between(jwt.getIssuedAt(), jwt.getExpiresAt()));
    }

    @Test
    void rechazaTokenConFirmaAlterada() {
        Usuario usuario = new Usuario();
        usuario.setId(42L);
        usuario.setEmail("cliente@ricar.com");
        usuario.setRol("cliente");
        String[] partes = tokenService.generarToken(usuario).split("\\.");
        char primerCaracter = partes[2].charAt(0);
        partes[2] = (primerCaracter == 'A' ? "B" : "A") + partes[2].substring(1);

        assertThrows(JwtException.class, () -> jwtDecoder.decode(String.join(".", partes)));
    }
}
