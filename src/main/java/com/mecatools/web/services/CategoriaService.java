package com.mecatools.web.services;

import com.mecatools.web.models.Categoria;
import com.mecatools.web.repositories.CategoriaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
@RequiredArgsConstructor

// Clase de servicio para manejar operaciones relacionadas con la entidad Categoria.
public class CategoriaService {

    // Inyección de dependencia del repositorio de categorías para interactuar con la base de datos.
    private final CategoriaRepository categoriaRepository;

    // Método para listar todas las categorías disponibles en la base de datos.
    public List<Categoria> listar() {
        return categoriaRepository.findAll();
    }

    // Método para obtener una categoría por su ID. Devuelve un Optional que puede estar vacío si no se encuentra la categoría.
    public Optional<Categoria> obtenerPorId(Long id) {
        return categoriaRepository.findById(id);
    }

    // Método para crear una nueva categoría. Si ya existe una categoría con el mismo nombre, lanza una excepción.
    public Categoria crear(Categoria categoria) {
        if (categoriaRepository.findByNombre(categoria.getNombre()).isPresent()) {
            throw new IllegalStateException("Ya existe una categoría con ese nombre");
        }
        return categoriaRepository.save(categoria);
    }

    // Método para editar una categoría existente. Si la categoría no existe, lanza una excepción.
    public Categoria editar(Long id, Categoria datos) {
        Categoria categoria = categoriaRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Categoría no encontrada"));
        categoria.setNombre(datos.getNombre());
        categoria.setDescripcion(datos.getDescripcion());
        return categoriaRepository.save(categoria);
    }

    // Método para eliminar una categoría por su ID. Si la categoría no existe, lanza una excepción.
    public void eliminar(Long id) {
        if (!categoriaRepository.existsById(id)) {
            throw new NoSuchElementException("Categoría no encontrada");
        }
        categoriaRepository.deleteById(id);
    }

}
