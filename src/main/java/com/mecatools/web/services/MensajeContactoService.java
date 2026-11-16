package com.mecatools.web.services;

import com.mecatools.web.models.*;
import com.mecatools.web.repositories.*;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class MensajeContactoService {
    private final MensajeContactoRepository mensajeRepo;
    private final RespuestaMensajeRepository respuestaRepo;
    private final UsuarioRepository usuarioRepo;

    public MensajeContactoService(MensajeContactoRepository mensajeRepo,
                                   RespuestaMensajeRepository respuestaRepo,
                                   UsuarioRepository usuarioRepo) {
        this.mensajeRepo = mensajeRepo;
        this.respuestaRepo = respuestaRepo;
        this.usuarioRepo = usuarioRepo;
    }

    // Crear nuevo mensaje de contacto
    @Transactional
    public MensajeContacto crear(Long usuarioId, String nombreCompleto, String telefono,
                                  String email, String asunto, String mensaje) {
        Usuario usuario = usuarioRepo.findById(usuarioId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        MensajeContacto m = new MensajeContacto();
        m.setUsuario(usuario);
        m.setNombreCompleto(nombreCompleto);
        m.setTelefono(telefono);
        m.setEmail(email);
        m.setAsunto(asunto);
        m.setMensaje(mensaje);
        m.setFechaEnvio(LocalDateTime.now());
        return mensajeRepo.save(m);
    }

    // Listar mensajes paginados con FIFO (no respondidos primero)
    public Page<MensajeContacto> listarPaginado(int pagina, int tamano) {
        return mensajeRepo.findAllOrdenados(PageRequest.of(pagina, tamano));
    }

    // Listar mensajes paginados filtrados por estado:
    // Pendientes -> fecha asc (primero en llegar se muestra primero)
    // Respondidos -> fecha desc (último en ser respondido en la cabecera)
    public Page<MensajeContacto> listarPorEstado(boolean respondido, int pagina, int tamano) {
        if (!respondido) {
            return mensajeRepo.findByRespondidoFalseOrderByFechaEnvioAsc(PageRequest.of(pagina, tamano));
        } else {
            return mensajeRepo.findByRespondidoTrueOrderByFechaEnvioDesc(PageRequest.of(pagina, tamano));
        }
    }

    // Obtener un mensaje por ID
    public MensajeContacto obtenerPorId(Long id) {
        return mensajeRepo.findById(id).orElseThrow(() -> new RuntimeException("Mensaje no encontrado"));
    }

    // Responder un mensaje
    @Transactional
    public RespuestaMensaje responder(Long mensajeId, Long adminId, String textoRespuesta) {
        MensajeContacto mensaje = obtenerPorId(mensajeId);
        Usuario admin = usuarioRepo.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Administrador no encontrado"));
        RespuestaMensaje respuesta = new RespuestaMensaje();
        respuesta.setMensajeContacto(mensaje);
        respuesta.setAdministrador(admin);
        respuesta.setRespuesta(textoRespuesta);
        respuesta.setFechaRespuesta(LocalDateTime.now());
        RespuestaMensaje saved = respuestaRepo.save(respuesta);
        // Marcar como respondido
        mensaje.setRespondido(true);
        mensaje.setLeido(true);
        mensajeRepo.save(mensaje);
        return saved;
    }

    // Contar mensajes sin responder (para notificaciones)
    public long contarSinResponder() {
        return mensajeRepo.countByRespondidoFalse();
    }

    // Listar respuestas de un mensaje
    public List<RespuestaMensaje> listarRespuestas(Long mensajeId) {
        return respuestaRepo.findByMensajeContacto_IdOrderByFechaRespuestaAsc(mensajeId);
    }

    // Mensajes de un usuario específico (para vista del cliente)
    public Page<MensajeContacto> listarPorUsuario(Long usuarioId, int pagina, int tamano) {
        return mensajeRepo.findByUsuario_IdOrderByFechaEnvioDesc(usuarioId, PageRequest.of(pagina, tamano));
    }

    // Marcar como leído
    @Transactional
    public void marcarLeido(Long id) {
        MensajeContacto m = obtenerPorId(id);
        m.setLeido(true);
        mensajeRepo.save(m);
    }
}
