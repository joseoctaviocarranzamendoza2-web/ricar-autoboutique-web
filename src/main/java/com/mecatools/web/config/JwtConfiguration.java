package com.mecatools.web.config;

import com.mecatools.web.security.JwtTokenService;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import com.nimbusds.jose.jwk.source.ImmutableSecret;

@Configuration
public class JwtConfiguration {

    private static final Logger LOGGER = LoggerFactory.getLogger(JwtConfiguration.class);
    private static final int MINIMUM_KEY_BYTES = 32;

    @Bean
    SecretKey jwtSecretKey(@Value("${app.jwt.secret:}") String configuredSecret, Environment environment)
            throws GeneralSecurityException {
        if (configuredSecret == null || configuredSecret.isBlank()) {
            if (environment.acceptsProfiles(Profiles.of("prod"))) {
                throw new IllegalStateException("JWT_SECRET es obligatorio cuando está activo el perfil prod");
            }
            KeyGenerator keyGenerator = KeyGenerator.getInstance("HmacSHA256");
            keyGenerator.init(256, new SecureRandom());
            LOGGER.warn("JWT_SECRET no está configurado; se usará una clave temporal de desarrollo que cambiará al reiniciar.");
            return keyGenerator.generateKey();
        }

        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(configuredSecret);
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("JWT_SECRET debe contener una clave codificada en Base64", exception);
        }
        if (keyBytes.length < MINIMUM_KEY_BYTES) {
            throw new IllegalStateException("JWT_SECRET debe representar al menos 32 bytes (256 bits)");
        }
        return new SecretKeySpec(keyBytes, "HmacSHA256");
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKey jwtSecretKey) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(jwtSecretKey));
    }

    @Bean
    JwtDecoder jwtDecoder(SecretKey jwtSecretKey) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(jwtSecretKey)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(JwtTokenService.ISSUER));
        return decoder;
    }
}
