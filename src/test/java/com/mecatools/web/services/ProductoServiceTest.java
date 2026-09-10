package com.mecatools.web.services;

import com.mecatools.web.models.Categoria;
import com.mecatools.web.models.Producto;
import com.mecatools.web.repositories.CategoriaRepository;
import com.mecatools.web.repositories.ProductoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)

class ProductoServiceTest {

    // Ambos repositorios son simulados: la prueba se concentra en ProductoService.
    @Mock
    private ProductoRepository productoRepository;

    @Mock
    private CategoriaRepository categoriaRepository;

    // Inyecta los mocks en el servicio real que se está evaluando.
    @InjectMocks
    private ProductoService productoService;

    @Test
    void debeListarProductosPorCategoria() {
        // Arrange: se prepara la respuesta para la categoría solicitada.
        List<Producto> productos = List.of(crearProducto("Pastillas de freno"));
        when(productoRepository.findByCategoria_Id(2L)).thenReturn(productos);
        // Act.
        List<Producto> resultado = productoService.listarPorCategoria(2L);
        // Assert: se usa el filtro correcto y se devuelve su resultado.
        assertEquals(productos, resultado);
        verify(productoRepository).findByCategoria_Id(2L);
    }

    @Test
    void debeCrearProductoConCategoriaExistente() {
        // Arrange: el producto referencia una categoría válida y existente.
        Categoria categoria = crearCategoria(2L);
        Producto producto = crearProducto("Pastillas de freno");
        producto.setCategoria(categoria);
        when(categoriaRepository.findById(2L)).thenReturn(Optional.of(categoria));
        when(productoRepository.save(producto)).thenReturn(producto);
        // Act.
        Producto resultado = productoService.crear(producto);
        // Assert: se conserva la categoría gestionada y se guarda el producto.
        assertEquals(categoria, resultado.getCategoria());
        verify(productoRepository).save(producto);
    }

    @Test
    void debeRechazarProductoSinCategoria() {
        // Un producto sin categoría no puede pasar la validación del servicio.
        Producto producto = crearProducto("Pastillas de freno");
        // Act + Assert.
        assertThrows(IllegalArgumentException.class, () -> productoService.crear(producto));
        // La validación falla antes de consultar categorías o guardar.
        verify(categoriaRepository, never()).findById(org.mockito.ArgumentMatchers.anyLong());
        verify(productoRepository, never()).save(producto);
    }

    @Test
    void debeRechazarProductoConCategoriaInexistente() {
        // Arrange: el producto tiene un id de categoría que no existe.
        Producto producto = crearProducto("Pastillas de freno");
        producto.setCategoria(crearCategoria(99L));
        when(categoriaRepository.findById(99L)).thenReturn(Optional.empty());
        // Act + Assert: se rechaza la referencia inválida.
        assertThrows(IllegalArgumentException.class, () -> productoService.crear(producto));
        // No se guarda un producto cuya categoría no fue validada.
        verify(productoRepository, never()).save(producto);
    }

    @Test
    void debeRechazarEdicionDeProductoInexistente() {
        // Arrange: no existe el producto que se intenta editar.
        when(productoRepository.findById(99L)).thenReturn(Optional.empty());
        // Act + Assert.
        assertThrows(NoSuchElementException.class, () -> productoService.editar(99L, crearProducto("Nuevo producto")));
        // No debe guardarse ninguna entidad si la búsqueda inicial falla.
        verify(productoRepository, never()).save(org.mockito.ArgumentMatchers.any(Producto.class));
    }

    // Auxiliares para preparar entidades sin repetir código irrelevante.
    private Producto crearProducto(String nombre) {
        Producto producto = new Producto();
        producto.setNombre(nombre);
        return producto;
    }

    private Categoria crearCategoria(Long id) {
        Categoria categoria = new Categoria();
        categoria.setId(id);
        categoria.setNombre("Categoria " + id);
        return categoria;
    }

}
