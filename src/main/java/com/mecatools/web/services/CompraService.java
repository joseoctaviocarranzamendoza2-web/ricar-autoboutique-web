package com.mecatools.web.services;

import com.mecatools.web.dto.CrearCompraDTO;
import com.mecatools.web.dto.ItemCarritoDTO;
import com.mecatools.web.models.Compra;
import com.mecatools.web.models.DetalleCompra;
import com.mecatools.web.models.Producto;
import com.mecatools.web.models.Usuario;
import com.mecatools.web.repositories.CompraRepository;
import com.mecatools.web.repositories.ProductoRepository;
import com.mecatools.web.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor

// Clase de servicio para manejar operaciones relacionadas con la entidad Compra.
public class CompraService {

    // Inyección de dependencia de los repositorios necesarios para interactuar con la base de datos.
    private final CompraRepository compraRepository;
    private final ProductoRepository productoRepository;
    private final UsuarioRepository usuarioRepository;

    // Método para listar todas las compras realizadas por un usuario específico. Devuelve una lista de compras asociadas al ID del usuario proporcionado.
    public List<Compra> listarPorUsuario(Long idUsuario) {
        return compraRepository.findByUsuario_Id(idUsuario);
    }

    // Método para listar todas las compras disponibles en la base de datos. Devuelve una lista completa de todas las compras registradas.
    public List<Compra> listarTodas() {
        return compraRepository.findAll();
    }

    // Método para procesar una nueva compra. Valida la existencia del usuario y los productos, verifica el stock disponible, calcula el total de la compra y guarda la información en la base de datos.
    public Compra procesarCompra(CrearCompraDTO dto) {
        Usuario usuario = usuarioRepository.findById(dto.idUsuario()).orElseThrow(() -> new IllegalArgumentException("Usuario no válido"));
        Compra compra = new Compra();
        compra.setUsuario(usuario);
        compra.setFecha(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
        String metodoPago = (dto.metodoPago() != null && !dto.metodoPago().isBlank()) ? dto.metodoPago() : "No especificado";
        compra.setMetodoPago(metodoPago);
        compra.setEstado("Efectivo".equalsIgnoreCase(metodoPago) ? "Sin pagar" : "Por entregar");
        double total = 0.0;
        for (ItemCarritoDTO item : dto.items()) {
            Producto producto = productoRepository.findById(item.idProducto()).orElseThrow(() -> new IllegalArgumentException("Producto con id " + item.idProducto() + " no encontrado"));
            if (producto.getStock() < item.cantidad()) {
                throw new IllegalStateException("Stock insuficiente para: " + producto.getNombre());
            }
            DetalleCompra detalle = new DetalleCompra();
            detalle.setCompra(compra);
            detalle.setProducto(producto);
            detalle.setCantidad(item.cantidad());
            detalle.setPrecioUnitario(producto.getPrecio());
            compra.getDetalles().add(detalle);
            total += producto.getPrecio() * item.cantidad();
            producto.setStock(producto.getStock() - item.cantidad());
            productoRepository.save(producto);
        }
        compra.setTotal(total);
        return compraRepository.save(compra);
    }

    // Método para cambiar el estado de una compra existente. Valida que el nuevo estado no sea nulo o vacío y actualiza la información en la base de datos.
    public Compra cambiarEstado(Long id, String nuevoEstado) {
        if (nuevoEstado == null || nuevoEstado.isBlank()) {
            throw new IllegalArgumentException("Estado requerido");
        }
        Compra compra = compraRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Compra no encontrada"));
        compra.setEstado(nuevoEstado);
        return compraRepository.save(compra);
    }
    
}
