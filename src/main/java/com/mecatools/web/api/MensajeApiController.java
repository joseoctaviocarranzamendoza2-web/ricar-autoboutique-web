package com.mecatools.web.api;

import com.mecatools.web.models.*;
import com.mecatools.web.services.MensajeContactoService;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/mensajes")

public class MensajeApiController {

    private final MensajeContactoService mensajeService;

    public MensajeApiController(MensajeContactoService mensajeService) {
        this.mensajeService = mensajeService;
    }

    // POST /api/mensajes - Crear mensaje de contacto
    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Map<String, String> body) {
        try {
            Long usuarioId = Long.parseLong(body.get("usuarioId"));
            MensajeContacto m = mensajeService.crear(usuarioId, body.get("nombreCompleto"), body.get("telefono"),
                    body.get("email"), body.get("asunto"), body.get("mensaje"));
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("id", m.getId());
            resp.put("message", "Mensaje enviado exitosamente");
            return ResponseEntity.status(HttpStatus.CREATED).body(resp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // GET /api/mensajes?page=0&size=20 - Listar mensajes (admin/gerente)
    @GetMapping
    public ResponseEntity<?> listar(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<MensajeContacto> pagina = mensajeService.listarPaginado(page, size);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("content", pagina.getContent());
        resp.put("totalPages", pagina.getTotalPages());
        resp.put("totalElements", pagina.getTotalElements());
        resp.put("currentPage", pagina.getNumber());
        resp.put("size", pagina.getSize());
        return ResponseEntity.ok(resp);
    }

    // GET /api/mensajes/{id} - Obtener mensaje con respuestas
    @GetMapping("/{id}")
    public ResponseEntity<?> obtener(@PathVariable Long id) {
        try {
            MensajeContacto m = mensajeService.obtenerPorId(id);
            List<RespuestaMensaje> respuestas = mensajeService.listarRespuestas(id);
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("mensaje", m);
            resp.put("respuestas", respuestas);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    // POST /api/mensajes/{id}/respuesta - Admin responde
    @PostMapping("/{id}/respuesta")
    public ResponseEntity<?> responder(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            Long adminId = Long.parseLong(body.get("adminId"));
            String texto = body.get("respuesta");
            RespuestaMensaje r = mensajeService.responder(id, adminId, texto);
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("id", r.getId());
            resp.put("message", "Respuesta enviada exitosamente");
            return ResponseEntity.status(HttpStatus.CREATED).body(resp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // GET /api/mensajes/sin-responder/count - Conteo para notificaciones
    @GetMapping("/sin-responder/count")
    public ResponseEntity<?> contarSinResponder() {
        return ResponseEntity.ok(Map.of("count", mensajeService.contarSinResponder()));
    }

    // GET /api/mensajes/usuario/{userId} - Mensajes de un usuario
    @GetMapping("/usuario/{userId}")
    public ResponseEntity<?> listarPorUsuario(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<MensajeContacto> pagina = mensajeService.listarPorUsuario(userId, page, size);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("content", pagina.getContent());
        resp.put("totalPages", pagina.getTotalPages());
        resp.put("totalElements", pagina.getTotalElements());
        resp.put("currentPage", pagina.getNumber());
        return ResponseEntity.ok(resp);
    }

    // PATCH /api/mensajes/{id}/leido - Marcar como leído
    @PatchMapping("/{id}/leido")
    public ResponseEntity<?> marcarLeido(@PathVariable Long id) {
        try {
            mensajeService.marcarLeido(id);
            return ResponseEntity.ok(Map.of("message", "Marcado como leído"));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
