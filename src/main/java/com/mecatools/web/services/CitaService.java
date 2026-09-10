package com.mecatools.web.services;

import com.mecatools.web.models.Cita;
import com.mecatools.web.repositories.CitaRepository;
import com.mecatools.web.repositories.ServicioRepository;
import com.mecatools.web.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor

// Clase de servicio para manejar operaciones relacionadas con la entidad Cita.
public class CitaService {

    // Inyección de dependencia de los repositorios necesarios para interactuar con la base de datos.
    private final CitaRepository citaRepository;
    private final UsuarioRepository usuarioRepository;
    private final ServicioRepository servicioRepository;

    // Método para listar todas las citas disponibles en la base de datos.
    public List<Cita> listarTodas() {
        return citaRepository.findAll();
    }

    // Método para obtener una cita por su ID. Lanza una excepción si no se encuentra la cita.
    public List<Cita> listarPorUsuario(Long idUsuario) {
        return citaRepository.findByUsuario_Id(idUsuario);
    }

    // Método para verificar si una fecha y hora específica está disponible para una nueva cita.
    public boolean disponible(LocalDate fecha, String hora) {
        return !citaRepository.existsByFechaAndHora(fecha, hora);
    }

    // Método para crear una nueva cita. Verifica la validez del usuario y servicio, y si la fecha y hora están disponibles.
    public Cita crear(Cita cita) {
        if (cita.getUsuario() == null || !usuarioRepository.existsById(cita.getUsuario().getId())) {
            throw new IllegalArgumentException("Usuario no válido");
        }
        if (cita.getServicio() == null || !servicioRepository.existsById(cita.getServicio().getId())) {
            throw new IllegalArgumentException("Servicio no válido");
        }
        if (!disponible(cita.getFecha(), cita.getHora())) {
            throw new IllegalStateException("Ya existe una cita en esa fecha y hora. Elige otro horario.");
        }
        cita.setEstado("Pendiente");
        return citaRepository.save(cita);
    }

    // Método para cambiar el estado de una cita existente. Lanza una excepción si la cita no se encuentra o si el nuevo estado es inválido.
    public Cita cambiarEstado(Long id, String nuevoEstado) {
        if (nuevoEstado == null || nuevoEstado.isBlank()) {
            throw new IllegalArgumentException("Estado requerido");
        }
        Cita cita = citaRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Cita no encontrada"));
        cita.setEstado(nuevoEstado);
        return citaRepository.save(cita);
    }

    // Método para cancelar una cita existente. Cambia el estado de la cita a "Cancelada". Lanza una excepción si la cita no se encuentra.
    public void cancelar(Long id) {
        Cita cita = citaRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Cita no encontrada"));
        cita.setEstado("Cancelada");
        citaRepository.save(cita);
    }
    
}
