package com.mecatools.web.services;

import com.mecatools.web.dto.CrearCompraDTO;
import com.mecatools.web.dto.ItemCarritoDTO;
import com.mecatools.web.models.Compra;
import com.mecatools.web.models.Producto;
import com.mecatools.web.models.Usuario;
import com.mecatools.web.repositories.CompraRepository;
import com.mecatools.web.repositories.ProductoRepository;
import com.mecatools.web.repositories.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)

class CompraServiceTest {

    @Mock
    private CompraRepository compraRepository;

    @Mock
    private ProductoRepository productoRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private CompraService compraService;

    @Test
    void debeProcesarCompraCalcularTotalYDescontarStock() {
        // Arrange: se prepara un usuario y un producto con stock suficiente.
        Usuario usuario = new Usuario();
        usuario.setId(1L);
        Producto producto = crearProducto(2L, "Filtro", 25.0, 10);
        CrearCompraDTO dto = new CrearCompraDTO(1L, List.of(new ItemCarritoDTO(2L, 2)), "Tarjeta");
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuario));
        when(productoRepository.findById(2L)).thenReturn(Optional.of(producto));
        when(productoRepository.save(producto)).thenReturn(producto);
        when(compraRepository.save(org.mockito.ArgumentMatchers.any(Compra.class))).thenAnswer(invocation -> invocation.getArgument(0));
        // Act.
        Compra resultado = compraService.procesarCompra(dto);
        // Assert: total, estado y stock reflejan la compra de dos unidades.
        assertEquals(50.0, resultado.getTotal());
        assertEquals("Por entregar", resultado.getEstado());
        assertEquals(8, producto.getStock());
        verify(productoRepository).save(producto);
    }

    @Test
    void debeRechazarCompraDeUsuarioInexistente() {
        // Arrange.
        CrearCompraDTO dto = new CrearCompraDTO(99L, List.of(new ItemCarritoDTO(2L, 1)), "Efectivo");
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());
        // Act + Assert.
        assertThrows(IllegalArgumentException.class, () -> compraService.procesarCompra(dto));
        verify(compraRepository, never()).save(org.mockito.ArgumentMatchers.any(Compra.class));
    }

    @Test
    void debeRechazarCompraConStockInsuficiente() {
        // Arrange: el producto tiene menos unidades que las solicitadas.
        Usuario usuario = new Usuario();
        usuario.setId(1L);
        Producto producto = crearProducto(2L, "Filtro", 25.0, 1);
        CrearCompraDTO dto = new CrearCompraDTO(1L, List.of(new ItemCarritoDTO(2L, 2)), "Efectivo");
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuario));
        when(productoRepository.findById(2L)).thenReturn(Optional.of(producto));
        // Act + Assert: no se procesa una compra que dejaría stock negativo.
        assertThrows(IllegalStateException.class, () -> compraService.procesarCompra(dto));
        verify(compraRepository, never()).save(org.mockito.ArgumentMatchers.any(Compra.class));
    }

    @Test
    void debeCambiarEstadoDeCompraExistente() {
        // Arrange.
        Compra compra = new Compra();
        when(compraRepository.findById(1L)).thenReturn(Optional.of(compra));
        when(compraRepository.save(compra)).thenReturn(compra);
        // Act.
        Compra resultado = compraService.cambiarEstado(1L, "Entregada");
        // Assert.
        assertEquals("Entregada", resultado.getEstado());
        verify(compraRepository).save(compra);
    }

    @Test
    void debeRechazarCambioAEstadoVacio() {
        // No se consulta la base cuando el nuevo estado es vacío.
        assertThrows(IllegalArgumentException.class, () -> compraService.cambiarEstado(1L, " "));
        verify(compraRepository, never()).findById(1L);
    }

    private Producto crearProducto(Long id, String nombre, double precio, int stock) {
        Producto producto = new Producto();
        producto.setId(id);
        producto.setNombre(nombre);
        producto.setPrecio(precio);
        producto.setStock(stock);
        return producto;
    }

}
