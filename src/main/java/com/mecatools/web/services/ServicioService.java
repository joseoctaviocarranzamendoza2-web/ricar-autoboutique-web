package com.mecatools.web.services;

import com.mecatools.web.models.Servicio;
import com.mecatools.web.repositories.ServicioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
@RequiredArgsConstructor

// Clase de servicio para manejar operaciones relacionadas con la entidad Servicio.
public class ServicioService {

    // Inyección de dependencia del repositorio de servicios para interactuar con la base de datos.
    private final ServicioRepository servicioRepository;

    // Método para listar todos los servicios disponibles en la base de datos.
    public List<Servicio> listar() {
        return servicioRepository.findAll();
    }

    // Método para listar todos los servicios activos en la base de datos.
    public List<Servicio> listarActivos() {
        return servicioRepository.findByEstado("Activo");
    }

    // Método para obtener un servicio por su ID. Devuelve un Optional que puede estar vacío si no se encuentra el servicio.
    public Optional<Servicio> obtenerPorId(Long id) {
        return servicioRepository.findById(id);
    }

    // Método para crear un nuevo servicio. Guarda la información en la base de datos.
    public Servicio crear(Servicio servicio) {
        return servicioRepository.save(servicio);
    }

    // Método para editar un servicio existente. Valida la existencia del servicio y actualiza la información en la base de datos.
    public Servicio editar(Long id, Servicio datos) {
        Servicio s = servicioRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Servicio no encontrado"));
        s.setNombre(datos.getNombre());
        s.setCategoria(datos.getCategoria());
        s.setPrecioBase(datos.getPrecioBase());
        s.setDuracionMinutos(datos.getDuracionMinutos());
        s.setDescripcion(datos.getDescripcion());
        s.setEstado(datos.getEstado());
        return servicioRepository.save(s);
    }

    // Método para eliminar un servicio por su ID. Valida la existencia del servicio y lo elimina de la base de datos.
    public void eliminar(Long id) {
        if (!servicioRepository.existsById(id)) {
            throw new NoSuchElementException("Servicio no encontrado");
        }
        servicioRepository.deleteById(id);
    }

}
