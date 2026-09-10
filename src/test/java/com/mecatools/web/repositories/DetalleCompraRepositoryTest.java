package com.mecatools.web.repositories;

import com.mecatools.web.models.Compra;
import com.mecatools.web.models.DetalleCompra;
import com.mecatools.web.models.Producto;
import com.mecatools.web.models.Categoria;
import com.mecatools.web.models.Usuario;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;

@DataJpaTest(properties = { "spring.datasource.url=jdbc:h2:mem:mecatools-detalles-test", "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=", "spring.jpa.hibernate.ddl-auto=create-drop" })

class DetalleCompraRepositoryTest {

    private final DetalleCompraRepository detalleCompraRepository;
    private final CompraRepository compraRepository;
    private final UsuarioRepository usuarioRepository;
    private final CategoriaRepository categoriaRepository;
    private final ProductoRepository productoRepository;

    @Autowired
    DetalleCompraRepositoryTest(DetalleCompraRepository detalleCompraRepository, CompraRepository compraRepository, UsuarioRepository usuarioRepository, CategoriaRepository categoriaRepository, ProductoRepository productoRepository) {
        this.detalleCompraRepository = detalleCompraRepository;
        this.compraRepository = compraRepository;
        this.usuarioRepository = usuarioRepository;
        this.categoriaRepository = categoriaRepository;
        this.productoRepository = productoRepository;
    }

    @Test
    void debeEncontrarDetallesPorCompra() {
        // Arrange: se prepara toda la cadena de relaciones exigida por JPA.
        Usuario usuario = usuarioRepository.save(usuarioValido());
        Compra compra = new Compra();
        compra.setFecha("2030-04-10");
        compra.setTotal(40.0);
        compra.setEstado("Pagada");
        compra.setUsuario(usuario);
        compra = compraRepository.save(compra);
        Categoria categoria = categoriaRepository.save(categoriaValida());
        Producto producto = new Producto();
        producto.setNombre("Filtro de aire");
        producto.setPrecio(40.0);
        producto.setStock(8);
        producto.setCategoria(categoria);
        producto = productoRepository.save(producto);
        DetalleCompra detalle = new DetalleCompra();
        detalle.setCantidad(1);
        detalle.setPrecioUnitario(40.0);
        detalle.setCompra(compra);
        detalle.setProducto(producto);
        detalleCompraRepository.save(detalle);
        // Act: se consultan los detalles por el id de la compra.
        List<DetalleCompra> resultado = detalleCompraRepository.findByCompra_Id(compra.getId());
        // Assert: la consulta devuelve la línea de compra persistida.
        assertEquals(1, resultado.size());
        assertEquals(1, resultado.get(0).getCantidad());
    }

    private Usuario usuarioValido() {
        Usuario usuario = new Usuario();
        usuario.setNombres("Pedro");
        usuario.setApellidos("Diaz");
        usuario.setEmail("detalle@test.com");
        usuario.setPassword("hash");
        usuario.setTelefono("912345681");
        usuario.setRol("CLIENTE");
        return usuario;
    }

    private Categoria categoriaValida() {
        Categoria categoria = new Categoria();
        categoria.setNombre("Filtros");
        return categoria;
    }

}
