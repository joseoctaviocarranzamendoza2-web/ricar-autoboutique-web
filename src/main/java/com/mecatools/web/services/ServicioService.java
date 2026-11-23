package com.mecatools.web.services;

import com.mecatools.web.models.CategoriaServicio;
import com.mecatools.web.models.Servicio;
import com.mecatools.web.repositories.CategoriaServicioRepository;
import com.mecatools.web.repositories.ServicioRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
// Clase de servicio para manejar operaciones relacionadas con la entidad Servicio (3FN).
public class ServicioService {

    private final ServicioRepository servicioRepository;
    private final CategoriaServicioRepository categoriaServicioRepository;

    public ServicioService(ServicioRepository servicioRepository,
                           CategoriaServicioRepository categoriaServicioRepository) {
        this.servicioRepository = servicioRepository;
        this.categoriaServicioRepository = categoriaServicioRepository;
    }

    // Método para listar todos los servicios disponibles en la base de datos.
    public List<Servicio> listar() {
        return servicioRepository.findAll();
    }

    // Método para listar todos los servicios activos en la base de datos.
    public List<Servicio> listarActivos() {
        return servicioRepository.findByEstado("Activo");
    }

    // Método para obtener un servicio por su ID.
    public Optional<Servicio> obtenerPorId(Long id) {
        return servicioRepository.findById(id);
    }

    // Método para crear un nuevo servicio sincronizando la clave foránea a CategoriaServicio (3FN).
    public Servicio crear(Servicio servicio) {
        vincularCategoriaServicio(servicio);
        return servicioRepository.save(servicio);
    }

    // Método para editar un servicio existente sincronizando la categoría normalizada.
    public Servicio editar(Long id, Servicio datos) {
        Servicio s = servicioRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Servicio no encontrado"));
        s.setNombre(datos.getNombre());
        s.setCategoria(datos.getCategoria());
        vincularCategoriaServicio(s);
        s.setPrecioBase(datos.getPrecioBase());
        s.setDuracionMinutos(datos.getDuracionMinutos());
        s.setDescripcion(datos.getDescripcion());
        s.setEstado(datos.getEstado());
        s.setImagen(datos.getImagen());
        return servicioRepository.save(s);
    }

    // Método para eliminar un servicio por su ID.
    public void eliminar(Long id) {
        if (!servicioRepository.existsById(id)) {
            throw new NoSuchElementException("Servicio no encontrado");
        }
        servicioRepository.deleteById(id);
    }

    // Vincula automáticamente la entidad CategoriaServicio correspondiente según el nombre
    private void vincularCategoriaServicio(Servicio servicio) {
        String catNombre = servicio.getCategoria();
        if (catNombre != null && !catNombre.isBlank()) {
            CategoriaServicio cs = categoriaServicioRepository.findByNombreIgnoreCase(catNombre.trim())
                    .orElseGet(() -> {
                        CategoriaServicio nueva = new CategoriaServicio(catNombre.trim(), "Categoría de servicio: " + catNombre.trim());
                        return categoriaServicioRepository.save(nueva);
                    });
            servicio.setCategoriaServicio(cs);
        }
    }
}
