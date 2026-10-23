package com.mecatools.web.services;

import com.mecatools.web.models.Categoria;
import com.mecatools.web.models.Producto;
import com.mecatools.web.repositories.CategoriaRepository;
import com.mecatools.web.repositories.ProductoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service

// Clase de servicio para manejar operaciones relacionadas con la entidad Producto.
public class ProductoService {

    // Inyección de dependencia de los repositorios necesarios para interactuar con la base de datos.
    private final ProductoRepository productoRepository;
    private final CategoriaRepository categoriaRepository;

    public ProductoService(ProductoRepository productoRepository, CategoriaRepository categoriaRepository) {
        this.productoRepository = productoRepository;
        this.categoriaRepository = categoriaRepository;
    }

    // Método para listar todos los productos disponibles en la base de datos.
    public List<Producto> listar() {
        return productoRepository.findAll();
    }

    // Método para listar todos los productos activos en la base de datos.
    public List<Producto> listarActivos() {
        return productoRepository.findActivos();
    }

    // Método para listar todos los productos asociados a una categoría específica. Devuelve una lista de productos filtrados por el ID de la categoría proporcionada.
    public List<Producto> listarPorCategoria(Long idCategoria) {
        return productoRepository.findByCategoria_Id(idCategoria);
    }

    @Transactional(readOnly = true)
    public List<Producto> buscar(String nombre, Long idCategoria) {
        String nombreNormalizado = nombre == null || nombre.isBlank() ? null : nombre.trim();
        return productoRepository.buscarCatalogo(nombreNormalizado, idCategoria);
    }

    // Método para obtener un producto por su ID. Devuelve un Optional que puede estar vacío si no se encuentra el producto.
    public Optional<Producto> obtenerPorId(Long id) {
        return productoRepository.findById(id);
    }

    // Método para crear un nuevo producto. Valida la existencia de la categoría referenciada y guarda la información en la base de datos.
    public Producto crear(Producto producto) {
        Categoria categoria = validarCategoria(producto);
        producto.setCategoria(categoria);
        if (producto.getEstado() == null || producto.getEstado().isBlank()) {
            producto.setEstado("Activo");
        }
        return productoRepository.save(producto);
    }

    // Método para editar un producto existente. Valida la existencia del producto y la categoría referenciada, y actualiza la información en la base de datos.
    public Producto editar(Long id, Producto datos) {
        Producto producto = productoRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Producto no encontrado"));
        producto.setNombre(datos.getNombre());
        producto.setPrecio(datos.getPrecio());
        producto.setStock(datos.getStock());
        producto.setDescripcion(datos.getDescripcion());
        producto.setEtiqueta(datos.getEtiqueta());
        producto.setImagen(datos.getImagen());
        if (datos.getEstado() != null && !datos.getEstado().isBlank()) {
            producto.setEstado(datos.getEstado());
        }
        if (datos.getCategoria() != null && datos.getCategoria().getId() != null) {
            producto.setCategoria(validarCategoria(datos));
        }
        return productoRepository.save(producto);
    }

    // Método para eliminar un producto por su ID. Valida la existencia del producto y lo elimina de la base de datos.
    public void eliminar(Long id) {
        if (!productoRepository.existsById(id)) {
            throw new NoSuchElementException("Producto no encontrado");
        }
        productoRepository.deleteById(id);
    }

    // Verifica que la categoría referenciada exista y la devuelve gestionada por JPA
    private Categoria validarCategoria(Producto producto) {
        if (producto.getCategoria() == null || producto.getCategoria().getId() == null) {
            throw new IllegalArgumentException("Categoría no válida");
        }
        return categoriaRepository.findById(producto.getCategoria().getId()).orElseThrow(() -> new IllegalArgumentException("Categoría no válida"));
    }

}
