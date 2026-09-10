package com.mecatools.web.repositories;

import com.mecatools.web.models.Categoria;
import com.mecatools.web.models.Producto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;

@DataJpaTest(properties = { "spring.datasource.url=jdbc:h2:mem:mecatools-productos-test", "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=", "spring.jpa.hibernate.ddl-auto=create-drop" })

class ProductoRepositoryTest {

    private final ProductoRepository productoRepository;
    private final CategoriaRepository categoriaRepository;

    @Autowired
    ProductoRepositoryTest(ProductoRepository productoRepository, CategoriaRepository categoriaRepository) {
        this.productoRepository = productoRepository;
        this.categoriaRepository = categoriaRepository;
    }

    @Test
    void debeEncontrarProductosPorCategoria() {
        // Arrange: se persiste un producto vinculado a una categoría.
        Categoria categoria = new Categoria();
        categoria.setNombre("Lubricantes");
        categoria = categoriaRepository.save(categoria);
        Producto producto = new Producto();
        producto.setNombre("Aceite sintetico");
        producto.setPrecio(80.0);
        producto.setStock(10);
        producto.setCategoria(categoria);
        productoRepository.save(producto);
        // Act: se filtran productos por la categoría relacionada.
        List<Producto> resultado = productoRepository.findByCategoria_Id(categoria.getId());
        // Assert: el producto pertenece a la categoría solicitada.
        assertEquals(1, resultado.size());
        assertEquals("Aceite sintetico", resultado.get(0).getNombre());
    }

}
