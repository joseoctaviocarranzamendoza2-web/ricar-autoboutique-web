package com.mecatools.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.mecatools.web.models.Rol;
import com.mecatools.web.models.Usuario;
import com.mecatools.web.repositories.RolRepository;
import com.mecatools.web.repositories.UsuarioRepository;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:web-session-security;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.jwt.secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="
})
class WebSessionSecurityIntegrationTest {

    private static final String PASSWORD = "PruebaSegura123!";

    @LocalServerPort
    private int port;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Usuario gerente;

    @BeforeEach
    void crearGerente() {
        gerente = new Usuario();
        gerente.setNombres("Usuario");
        gerente.setApellidos("Prueba");
        gerente.setEmail("gerente-" + UUID.randomUUID() + "@example.test");
        gerente.setPassword(passwordEncoder.encode(PASSWORD));
        gerente.setTelefono("912345678");
        gerente.setCiudad("Trujillo");
        gerente.setRol("gerente");
        gerente.getRoles().add(rol("cliente"));
        gerente.getRoles().add(rol("administrador"));
        gerente.getRoles().add(rol("gerente"));
        gerente = usuarioRepository.saveAndFlush(gerente);
    }

    @Test
    void loginPersistsSessionAcrossRoleRoutesAndInvalidUserIdReturns403() throws Exception {
        HttpClient client = clienteConCookies();
        HttpResponse<String> login = iniciarSesion(client);

        assertEquals(200, login.statusCode());
        assertTrue(login.headers().firstValue("Set-Cookie").orElse("").contains("JSESSIONID"));

        List<String> routes = List.of(
                "/cliente/" + gerente.getId(),
                "/administrador/" + gerente.getId(),
                "/gerente/" + gerente.getId(),
                "/gerente/" + gerente.getId());
        for (String route : routes) {
            HttpResponse<String> response = get(client, route);
            assertEquals(302, response.statusCode(), route);
            String activeRole = route.split("/")[1];
            String defaultSection = switch (activeRole) {
                case "cliente" -> "perfil";
                case "administrador" -> "reservas/citas";
                default -> "general/resumen";
            };
            assertTrue(response.headers().firstValue("Location").orElse("")
                    .endsWith("/panel/" + activeRole + "/" + gerente.getId() + "/" + defaultSection), route);
        }

        HttpResponse<String> forbidden = get(client, "/gerente/" + (gerente.getId() + 1000));
        assertEquals(403, forbidden.statusCode());
        assertTrue(forbidden.body().contains("\"status\":403"));
        assertTrue(forbidden.body().contains("\"error\":\"Forbidden\""));
    }

    @Test
    void protectedRouteWithoutSessionReturns401Json() throws Exception {
        HttpResponse<String> response = get(clienteConCookies(), "/cliente/" + gerente.getId());

        assertEquals(401, response.statusCode());
        assertTrue(response.body().contains("\"status\":401"));
        assertTrue(response.body().contains("\"error\":\"Unauthorized\""));
    }

    @Test
    void clientSessionSurvivesRepeatedProfileNavigationAndManagerRouteReturns403() throws Exception {
        Usuario cliente = crearUsuario("cliente", List.of("cliente"));
        HttpClient client = clienteConCookies();
        HttpResponse<String> login = iniciarSesion(client, cliente);

        assertEquals(200, login.statusCode());
        for (int i = 0; i < 5; i++) {
            HttpResponse<String> response = get(client, "/cliente/" + cliente.getId());
            assertEquals(302, response.statusCode());
            assertTrue(response.headers().firstValue("Location").orElse("")
                    .endsWith("/panel/cliente/" + cliente.getId() + "/perfil"));
        }

        HttpResponse<String> forbidden = get(client, "/gerente/" + cliente.getId());
        assertEquals(403, forbidden.statusCode());
        assertTrue(forbidden.body().contains("\"status\":403"));
    }

    @Test
    void jwtCookieAuthenticatesWebRoutesEvenWithoutHttpSession() throws Exception {
        HttpClient client = clienteConCookies();
        HttpResponse<String> login = iniciarSesion(client);
        assertEquals(200, login.statusCode());

        // Extraer token del JSON de login
        String body = login.body();
        int tokenStart = body.indexOf("\"token\":\"") + 9;
        int tokenEnd = body.indexOf("\"", tokenStart);
        String token = body.substring(tokenStart, tokenEnd);

        // Cliente nuevo SIN JSESSIONID (simula sesión de servidor reiniciada o expirada)
        HttpClient clientSinSesion = HttpClient.newHttpClient();
        HttpRequest reqGerente = HttpRequest.newBuilder(uri("/gerente/" + gerente.getId()))
                .header("Cookie", "access_token=" + token)
                .GET()
                .build();
        HttpResponse<String> respGerente = clientSinSesion.send(reqGerente, HttpResponse.BodyHandlers.ofString());
        assertEquals(302, respGerente.statusCode());
        assertTrue(respGerente.headers().firstValue("Location").orElse("").contains("/panel/gerente/"));

        HttpRequest reqAdmin = HttpRequest.newBuilder(uri("/administrador/" + gerente.getId()))
                .header("Cookie", "access_token=" + token)
                .GET()
                .build();
        HttpResponse<String> respAdmin = clientSinSesion.send(reqAdmin, HttpResponse.BodyHandlers.ofString());
        assertEquals(302, respAdmin.statusCode());
        assertTrue(respAdmin.headers().firstValue("Location").orElse("").contains("/panel/administrador/"));

        HttpRequest reqCliente = HttpRequest.newBuilder(uri("/cliente/" + gerente.getId()))
                .header("Cookie", "access_token=" + token)
                .GET()
                .build();
        HttpResponse<String> respCliente = clientSinSesion.send(reqCliente, HttpResponse.BodyHandlers.ofString());
        assertEquals(302, respCliente.statusCode());
        assertTrue(respCliente.headers().firstValue("Location").orElse("").contains("/panel/cliente/"));
    }

    @Test
    void browserHtmlRequestWithoutAuthRedirectsToLoginInsteadOfRawJson() throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest req = HttpRequest.newBuilder(uri("/cliente/" + gerente.getId()))
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .GET()
                .build();
        HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
        assertEquals(302, resp.statusCode());
        assertTrue(resp.headers().firstValue("Location").orElse("").contains("/inicio/login"));
    }

    private Usuario crearUsuario(String rolPrincipal, List<String> roles) {
        Usuario usuario = new Usuario();
        usuario.setNombres("Usuario");
        usuario.setApellidos("Prueba");
        usuario.setEmail(rolPrincipal + "-" + UUID.randomUUID() + "@example.test");
        usuario.setPassword(passwordEncoder.encode(PASSWORD));
        usuario.setTelefono("912345678");
        usuario.setCiudad("Trujillo");
        usuario.setRol(rolPrincipal);
        roles.stream().map(this::rol).forEach(usuario.getRoles()::add);
        return usuarioRepository.saveAndFlush(usuario);
    }

    private Rol rol(String nombre) {
        return rolRepository.findByNombreIgnoreCase(nombre).orElseThrow();
    }

    private HttpClient clienteConCookies() {
        return HttpClient.newBuilder()
                .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
                .build();
    }

    private HttpResponse<String> iniciarSesion(HttpClient client) throws Exception {
        return iniciarSesion(client, gerente);
    }

    private HttpResponse<String> iniciarSesion(HttpClient client, Usuario usuario) throws Exception {
        String form = "email=" + URLEncoder.encode(usuario.getEmail(), StandardCharsets.UTF_8)
                + "&password=" + URLEncoder.encode(PASSWORD, StandardCharsets.UTF_8);
        HttpRequest request = HttpRequest.newBuilder(uri("/login"))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build();
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> get(HttpClient client, String path) throws Exception {
        return client.send(HttpRequest.newBuilder(uri(path)).GET().build(), HttpResponse.BodyHandlers.ofString());
    }

    private URI uri(String path) {
        return URI.create("http://localhost:" + port + path);
    }
}
