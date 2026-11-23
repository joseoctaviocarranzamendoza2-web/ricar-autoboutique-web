package com.mecatools.web.services;

import com.mecatools.web.models.Categoria;
import com.mecatools.web.models.CategoriaServicio;
import com.mecatools.web.repositories.CategoriaRepository;
import com.mecatools.web.repositories.CategoriaServicioRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
// Clase de servicio para manejar operaciones relacionadas con las entidades de Categorías (Productos y Servicios normalizados en 3FN).
public class CategoriaService {

    private final CategoriaRepository categoriaRepository;
    private final CategoriaServicioRepository categoriaServicioRepository;

    public CategoriaService(CategoriaRepository categoriaRepository,
                            CategoriaServicioRepository categoriaServicioRepository) {
        this.categoriaRepository = categoriaRepository;
        this.categoriaServicioRepository = categoriaServicioRepository;
    }

    // ==========================================
    // CATEGORÍAS DE PRODUCTOS
    // ==========================================

    // Lista todas las categorías de productos disponibles
    public List<Categoria> listar() {
        return categoriaRepository.findAll();
    }

    // Obtiene una categoría de producto por su ID
    public Optional<Categoria> obtenerPorId(Long id) {
        return categoriaRepository.findById(id);
    }

    // Crea una nueva categoría de producto
    public Categoria crear(Categoria categoria) {
        if (categoriaRepository.findByNombre(categoria.getNombre()).isPresent()) {
            throw new IllegalStateException("Ya existe una categoría con ese nombre");
        }
        if (categoria.getTipo() == null || categoria.getTipo().isBlank()) {
            categoria.setTipo("PRODUCTO");
        }
        return categoriaRepository.save(categoria);
    }

    // Edita una categoría de producto existente
    public Categoria editar(Long id, Categoria datos) {
        Categoria categoria = categoriaRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Categoría no encontrada"));
        Optional<Categoria> existente = categoriaRepository.findByNombre(datos.getNombre());
        if (existente.isPresent() && !existente.get().getId().equals(id)) {
            throw new IllegalStateException("Ya existe una categoría con ese nombre");
        }
        categoria.setNombre(datos.getNombre());
        categoria.setDescripcion(datos.getDescripcion());
        return categoriaRepository.save(categoria);
    }

    // Elimina una categoría de producto por su ID
    public void eliminar(Long id) {
        if (!categoriaRepository.existsById(id)) {
            throw new NoSuchElementException("Categoría no encontrada");
        }
        categoriaRepository.deleteById(id);
    }

    // ==========================================
    // CATEGORÍAS DE SERVICIOS (3FN)
    // ==========================================

    // Lista todas las categorías de servicios disponibles
    public List<CategoriaServicio> listarServicios() {
        return categoriaServicioRepository.findAll();
    }

    // Obtiene una categoría de servicio por su ID
    public Optional<CategoriaServicio> obtenerServicioPorId(Long id) {
        return categoriaServicioRepository.findById(id);
    }

    // Crea una nueva categoría de servicio
    public CategoriaServicio crearServicio(CategoriaServicio categoria) {
        if (categoriaServicioRepository.findByNombreIgnoreCase(categoria.getNombre()).isPresent()) {
            throw new IllegalStateException("Ya existe una categoría con ese nombre");
        }
        if (categoria.getTipo() == null || categoria.getTipo().isBlank()) {
            categoria.setTipo("SERVICIO");
        }
        return categoriaServicioRepository.save(categoria);
    }

    // Edita una categoría de servicio existente
    public CategoriaServicio editarServicio(Long id, CategoriaServicio datos) {
        CategoriaServicio cat = categoriaServicioRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Categoría de servicio no encontrada"));
        Optional<CategoriaServicio> existente = categoriaServicioRepository.findByNombreIgnoreCase(datos.getNombre());
        if (existente.isPresent() && !existente.get().getId().equals(id)) {
            throw new IllegalStateException("Ya existe una categoría con ese nombre");
        }
        cat.setNombre(datos.getNombre());
        cat.setDescripcion(datos.getDescripcion());
        return categoriaServicioRepository.save(cat);
    }

    // Elimina una categoría de servicio por su ID
    public void eliminarServicio(Long id) {
        if (!categoriaServicioRepository.existsById(id)) {
            throw new NoSuchElementException("Categoría de servicio no encontrada");
        }
        categoriaServicioRepository.deleteById(id);
    }

    // Obtiene o crea una categoría de servicio por nombre (utilizado en migraciones y sincronización)
    public CategoriaServicio obtenerOCrearServicio(String nombre, String descripcion) {
        return categoriaServicioRepository.findByNombreIgnoreCase(nombre)
                .orElseGet(() -> categoriaServicioRepository.save(new CategoriaServicio(nombre, descripcion)));
    }
}
