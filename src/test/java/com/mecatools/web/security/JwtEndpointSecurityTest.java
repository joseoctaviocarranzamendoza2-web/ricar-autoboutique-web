package com.mecatools.web.security;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.mecatools.web.api.ProductoApiController;
import com.mecatools.web.config.ConfigSecurity;
import com.mecatools.web.config.JwtConfiguration;
import com.mecatools.web.models.Usuario;
import com.mecatools.web.services.ProductoService;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ProductoApiController.class)
@Import({ConfigSecurity.class, JwtConfiguration.class, JwtTokenService.class})
class JwtEndpointSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtEncoder jwtEncoder;

    @MockitoBean
    private UsuarioDetailsService usuarioDetailsService;

    @MockitoBean
    private ProductoService productoService;

    @BeforeEach
    void configurarUsuarioAdmin() {
        Usuario usuario = new Usuario();
        usuario.setId(7L);
        usuario.setEmail("admin@ricar.com");
        usuario.setRol("administrador");
        when(usuarioDetailsService.loadUserByUsername("admin@ricar.com"))
                .thenReturn(new UsuarioDetails(usuario));
    }

    @Test
    void rechazaSolicitudPrivadaSinToken() throws Exception {
        mockMvc.perform(delete("/api/productos/8"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rechazaTokenInvalido() throws Exception {
        mockMvc.perform(delete("/api/productos/8")
                        .header("Authorization", "Bearer token.invalido"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void permiteOperacionConTokenYRolAutorizado() throws Exception {
        mockMvc.perform(delete("/api/productos/8")
                        .header("Authorization", "Bearer " + crearToken("admin@ricar.com")))
                .andExpect(status().isOk());

        verify(productoService).eliminar(8L);
    }

    @Test
    void rechazaOperacionSiElRolNoTienePermiso() throws Exception {
        Usuario cliente = new Usuario();
        cliente.setId(9L);
        cliente.setEmail("cliente@ricar.com");
        cliente.setRol("cliente");
        when(usuarioDetailsService.loadUserByUsername("cliente@ricar.com"))
                .thenReturn(new UsuarioDetails(cliente));

        mockMvc.perform(post("/api/productos")
                        .header("Authorization", "Bearer " + crearToken("cliente@ricar.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    private String crearToken(String email) {
        Instant ahora = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(JwtTokenService.ISSUER)
                .issuedAt(ahora)
                .expiresAt(ahora.plusSeconds(300))
                .subject(email)
                .claim("uid", 7L)
                .claim("roles", List.of("cliente", "administrador"))
                .build();
        return jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(),
                claims)).getTokenValue();
    }
}
