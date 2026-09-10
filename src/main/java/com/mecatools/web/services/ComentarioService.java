package com.mecatools.web.services;

import com.mecatools.web.models.Comentario;
import com.mecatools.web.models.Usuario;
import com.mecatools.web.repositories.ComentarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
@RequiredArgsConstructor

// Clase de servicio para manejar operaciones relacionadas con la entidad Comentario.
public class ComentarioService {

    // Inyección de dependencia del repositorio de comentarios para interactuar con la base de datos.
    private final ComentarioRepository comentarioRepository;

    // Método para listar todos los comentarios disponibles en la base de datos.
    public List<Comentario> listar() {
        return comentarioRepository.findAll();
    }

    // Método para obtener un comentario por el ID del usuario. Devuelve un Optional que puede estar vacío si no se encuentra el comentario.
    public Optional<Comentario> obtenerPorUsuario(Long usuarioId) {
        return comentarioRepository.findByUsuario_Id(usuarioId);
    }

    // Método para crear un nuevo comentario. Verifica que el usuario autenticado tenga rol de cliente y que no tenga un comentario registrado previamente.
    public Comentario crear(Comentario comentario, Usuario usuarioAutenticado) {
        if (!"cliente".equalsIgnoreCase(usuarioAutenticado.getRol())) {
            throw new IllegalArgumentException("Solo clientes pueden comentar");
        }
        if (comentarioRepository.findByUsuario_Id(usuarioAutenticado.getId()).isPresent()) {
            throw new IllegalStateException("Ya tienes un comentario registrado");
        }
        comentario.setUsuario(usuarioAutenticado);
        return comentarioRepository.save(comentario);
    }

    // Método para actualizar un comentario existente. Verifica que el usuario autenticado sea el dueño del comentario y tenga rol de cliente.
    public Comentario actualizar(Long usuarioId, Comentario datos, Usuario usuarioAutenticado) {
        validarPropietario(usuarioId, usuarioAutenticado);
        Comentario comentario = comentarioRepository.findByUsuario_Id(usuarioId).orElseThrow(() -> new NoSuchElementException("Comentario no encontrado"));
        comentario.setTexto(datos.getTexto());
        comentario.setVehiculo(datos.getVehiculo());
        comentario.setEstrellas(datos.getEstrellas());
        return comentarioRepository.save(comentario);
    }

    // Método para eliminar un comentario existente. Verifica que el usuario autenticado sea el dueño del comentario y tenga rol de cliente.
    public void eliminar(Long usuarioId, Usuario usuarioAutenticado) {
        validarPropietario(usuarioId, usuarioAutenticado);
        Comentario comentario = comentarioRepository.findByUsuario_Id(usuarioId).orElseThrow(() -> new NoSuchElementException("Comentario no encontrado"));
        comentarioRepository.delete(comentario);
    }

    // Verifica que el usuario autenticado sea el dueño del comentario y tenga rol cliente
    private void validarPropietario(Long usuarioId, Usuario usuarioAutenticado) {
        boolean autorizado = usuarioAutenticado.getId().equals(usuarioId) && "cliente".equalsIgnoreCase(usuarioAutenticado.getRol());
        if (!autorizado) {
            throw new SecurityException("No autorizado");
        }
    }

}
