package com.mecatools.web.repositories;

import com.mecatools.web.models.Compra;
import com.mecatools.web.models.Usuario;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;

@DataJpaTest(properties = { "spring.datasource.url=jdbc:h2:mem:mecatools-compras-test", "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=", "spring.jpa.hibernate.ddl-auto=create-drop" })

class CompraRepositoryTest {

    private final CompraRepository compraRepository;
    private final UsuarioRepository usuarioRepository;

    @Autowired
    CompraRepositoryTest(CompraRepository compraRepository, UsuarioRepository usuarioRepository) {
        this.compraRepository = compraRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Test
    void debeEncontrarComprasPorUsuario() {
        // Arrange: se registra una compra asociada al usuario consultado.
        Usuario usuario = usuarioRepository.save(usuarioValido());
        Compra compra = new Compra();
        compra.setFecha("2030-03-20");
        compra.setTotal(125.50);
        compra.setEstado("Pendiente");
        compra.setMetodoPago("Tarjeta");
        compra.setUsuario(usuario);
        compraRepository.save(compra);
        // Act: se ejecuta el filtro por la relación usuario.id.
        List<Compra> resultado = compraRepository.findByUsuario_Id(usuario.getId());
        // Assert: se devuelve la compra del usuario solicitado.
        assertEquals(1, resultado.size());
        assertEquals(125.50, resultado.get(0).getTotal());
    }

    private Usuario usuarioValido() {
        Usuario usuario = new Usuario();
        usuario.setNombres("Maria");
        usuario.setApellidos("Lopez");
        usuario.setEmail("compra@test.com");
        usuario.setPassword("hash");
        usuario.setTelefono("912345680");
        usuario.setRol("CLIENTE");
        return usuario;
    }

}
