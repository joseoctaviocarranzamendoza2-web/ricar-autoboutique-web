package com.mecatools.web.services;

import com.mecatools.web.models.Cita;
import com.mecatools.web.repositories.CitaRepository;
import com.mecatools.web.repositories.ServicioRepository;
import com.mecatools.web.repositories.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service

// Clase de servicio para manejar operaciones relacionadas con la entidad Cita.
public class CitaService {

    public static final int MAX_VEHICULOS_POR_HORARIO = 3;
    private static final String ESTADO_CANCELADA = "Cancelada";
    private static final String HORARIO_POR_CONFIRMAR = "Por confirmar";

    // Inyección de dependencia de los repositorios necesarios para interactuar con la base de datos.
    private final CitaRepository citaRepository;
    private final UsuarioRepository usuarioRepository;
    private final ServicioRepository servicioRepository;

    public CitaService(CitaRepository citaRepository, UsuarioRepository usuarioRepository,
            ServicioRepository servicioRepository) {
        this.citaRepository = citaRepository;
        this.usuarioRepository = usuarioRepository;
        this.servicioRepository = servicioRepository;
    }

    // Normaliza guiones y espacios en rangos horarios para comparar cupos sin inconsistencias
    private String normalizarHora(String hora) {
        if (hora == null) {
            return "";
        }
        return hora.trim().replaceAll("\\s*[–—-]\\s*", " – ").replaceAll("\\s+", " ");
    }

    private boolean esHorarioSinLimite(String hora) {
        return HORARIO_POR_CONFIRMAR.equalsIgnoreCase(normalizarHora(hora));
    }

    // Método para listar todas las citas disponibles en la base de datos.
    @Transactional(readOnly = true)
    public List<Cita> listarTodas() {
        return citaRepository.findAll();
    }

    // Método para obtener una cita por su ID. Lanza una excepción si no se encuentra la cita.
    @Transactional(readOnly = true)
    public List<Cita> listarPorUsuario(Long idUsuario) {
        return citaRepository.findByUsuario_Id(idUsuario);
    }

    private static final Set<String> ESTADOS_VALIDOS = Set.of("Pendiente", "Confirmada", "Completada", "Cancelada");
    private static final Pattern PATRON_HORA = Pattern.compile("\\b(\\d{1,2}:\\d{2})\\b");

    // Extrae los minutos desde medianoche del inicio y fin de un rango horario (ej: "08:00 – 10:00" -> [480, 600])
    private int[] extraerMinutosRango(String hora) {
        if (hora == null) return null;
        Matcher m = PATRON_HORA.matcher(hora);
        List<Integer> mins = new ArrayList<>();
        while (m.find()) {
            String[] partes = m.group(1).split(":");
            mins.add(Integer.parseInt(partes[0]) * 60 + Integer.parseInt(partes[1]));
        }
        if (mins.isEmpty()) return null;
        if (mins.size() == 1) return new int[]{mins.get(0), mins.get(0) + 60};
        return new int[]{mins.get(0), mins.get(1)};
    }

    // Comprueba si dos horarios se cruzan en el tiempo
    private boolean haySolapamiento(String horaA, String horaB) {
        if (esHorarioSinLimite(horaA) || esHorarioSinLimite(horaB)) return false;
        int[] rA = extraerMinutosRango(horaA);
        int[] rB = extraerMinutosRango(horaB);
        if (rA == null || rB == null) {
            return normalizarHora(horaA).equals(normalizarHora(horaB));
        }
        return rA[0] < rB[1] && rB[0] < rA[1];
    }

    // Cuenta cuántos vehículos activos (no cancelados) ocupan o se solapan con un horario específico en la fecha dada
    @Transactional(readOnly = true)
    public long contarActivasEnHorario(LocalDate fecha, String hora) {
        if (fecha == null || hora == null || hora.isBlank() || esHorarioSinLimite(hora)) {
            return 0L;
        }
        return citaRepository.findByFechaAndEstadoNot(fecha, ESTADO_CANCELADA).stream()
                .filter(c -> haySolapamiento(c.getHora(), hora))
                .count();
    }

    // Método para verificar si una fecha y hora específica aún tiene cupos disponibles (máximo 3 vehículos por horario).
    @Transactional(readOnly = true)
    public boolean disponible(LocalDate fecha, String hora) {
        if (fecha == null || hora == null || hora.isBlank()) {
            return false;
        }
        if (esHorarioSinLimite(hora)) {
            return true;
        }
        return contarActivasEnHorario(fecha, hora) < MAX_VEHICULOS_POR_HORARIO;
    }

    // Devuelve un mapa horario -> cantidad de reservas activas (no canceladas) para la fecha consultada
    @Transactional(readOnly = true)
    public Map<String, Long> obtenerOcupacionPorFecha(LocalDate fecha) {
        if (fecha == null) {
            return Map.of();
        }
        List<Cita> activas = citaRepository.findByFechaAndEstadoNot(fecha, ESTADO_CANCELADA);
        Map<String, Long> ocupacion = activas.stream()
                .map(c -> normalizarHora(c.getHora()))
                .filter(h -> !h.isBlank() && !HORARIO_POR_CONFIRMAR.equalsIgnoreCase(h))
                .collect(Collectors.groupingBy(Function.identity(), LinkedHashMap::new, Collectors.counting()));

        // Para compatibilidad con rangos de múltiples horas (1h, 2h, 3h, 4h o más)
        String[] rangosComunes = {
            "08:00 – 09:00", "09:00 – 10:00", "10:00 – 11:00", "11:00 – 12:00",
            "14:00 – 15:00", "15:00 – 16:00", "16:00 – 17:00", "17:00 – 18:00",
            "08:00 – 10:00", "10:00 – 12:00", "14:00 – 16:00", "16:00 – 18:00",
            "08:00 – 11:00", "09:00 – 12:00", "14:00 – 17:00", "15:00 – 18:00",
            "08:00 – 12:00", "14:00 – 18:00", "08:00 – 18:00"
        };
        for (String r : rangosComunes) {
            long count = activas.stream().filter(c -> haySolapamiento(c.getHora(), r)).count();
            if (count > 0) {
                ocupacion.put(r, count);
            }
        }
        return ocupacion;
    }

    // Método para crear una nueva cita. Verifica la validez del usuario y servicio, y que no supere el máximo de 3 vehículos por horario.
    @Transactional
    public Cita crear(Cita cita) {
        if (cita.getFecha() == null || !cita.getFecha().isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("La fecha debe ser posterior al día actual");
        }
        if (cita.getUsuario() == null || !usuarioRepository.existsById(cita.getUsuario().getId())) {
            throw new IllegalArgumentException("Usuario no válido");
        }
        if (cita.getServicio() == null || !servicioRepository.existsById(cita.getServicio().getId())) {
            throw new IllegalArgumentException("Servicio no válido");
        }
        String horaNorm = normalizarHora(cita.getHora());
        cita.setHora(horaNorm);
        if (!disponible(cita.getFecha(), horaNorm)) {
            throw new IllegalStateException("Este horario ya alcanzó el máximo de " + MAX_VEHICULOS_POR_HORARIO + " vehículos. Elige otro horario.");
        }
        cita.setEstado("Pendiente");
        return citaRepository.save(cita);
    }

    // Verifica si la fecha (y hora límite si es el mismo día) de una cita ya expiró
    public boolean estaExpirada(Cita cita) {
        if (cita == null || cita.getFecha() == null) {
            return false;
        }
        LocalDate hoy = LocalDate.now();
        if (cita.getFecha().isBefore(hoy)) {
            return true;
        }
        if (cita.getFecha().isEqual(hoy)) {
            LocalTime horaLimite = extraerHoraFin(cita.getHora());
            return horaLimite != null && LocalTime.now().isAfter(horaLimite);
        }
        return false;
    }

    // Extrae la hora límite final (ej. 11:00 en "10:00 – 11:00") para evaluar expiración en el mismo día
    private LocalTime extraerHoraFin(String horaTexto) {
        if (horaTexto == null || horaTexto.isBlank()) {
            return null;
        }
        Matcher matcher = PATRON_HORA.matcher(horaTexto);
        String ultimaHora = null;
        while (matcher.find()) {
            ultimaHora = matcher.group(1);
        }
        if (ultimaHora == null) {
            return null;
        }
        String[] partes = ultimaHora.split(":");
        int hh = Integer.parseInt(partes[0]);
        int mm = Integer.parseInt(partes[1]);
        if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
            return null;
        }
        return LocalTime.of(hh, mm);
    }

    // Verifica si ya culminó la fecha y hora límite (+1 minuto) para habilitar el estado Completada
    public boolean haFinalizadoHorario(Cita cita) {
        if (cita == null || cita.getFecha() == null) {
            return false;
        }
        LocalTime horaFin = extraerHoraFin(cita.getHora());
        LocalDateTime limiteCompletado = (horaFin != null)
                ? LocalDateTime.of(cita.getFecha(), horaFin).plusMinutes(1)
                : cita.getFecha().plusDays(1).atStartOfDay();
        return !LocalDateTime.now().isBefore(limiteCompletado);
    }

    // Método para cambiar el estado de una cita existente. Impide confirmar citas expiradas o completar citas antes de finalizar su horario.
    @Transactional
    public Cita cambiarEstado(Long id, String nuevoEstado) {
        if (nuevoEstado == null || nuevoEstado.isBlank()) {
            throw new IllegalArgumentException("Estado requerido");
        }
        if (!ESTADOS_VALIDOS.contains(nuevoEstado)) {
            throw new IllegalArgumentException("Estado inválido");
        }
        Cita cita = citaRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Cita no encontrada"));
        boolean esCancelacion = "Cancelada".equals(nuevoEstado);
        boolean esConfirmacionPendiente = "Pendiente".equals(cita.getEstado()) && !esCancelacion;
        if (("Confirmada".equals(nuevoEstado) || esConfirmacionPendiente) && estaExpirada(cita)) {
            throw new IllegalArgumentException("La fecha solicitada ya expiró. Solo puedes cancelarla.");
        }
        if ("Completada".equals(nuevoEstado) && !haFinalizadoHorario(cita)) {
            throw new IllegalArgumentException("Solo puedes marcar esta cita como completada después de finalizar su horario programado.");
        }
        if ("Confirmada".equals(nuevoEstado) && !"Confirmada".equals(cita.getEstado()) && !esHorarioSinLimite(cita.getHora())) {
            String horaNorm = normalizarHora(cita.getHora());
            long ocupadasConfirmadas = citaRepository.findByFechaAndEstadoNot(cita.getFecha(), ESTADO_CANCELADA).stream()
                    .filter(c -> !c.getId().equals(id))
                    .filter(c -> "Confirmada".equals(c.getEstado()) || "Completada".equals(c.getEstado()))
                    .filter(c -> normalizarHora(c.getHora()).equals(horaNorm))
                    .count();
            if (ocupadasConfirmadas >= MAX_VEHICULOS_POR_HORARIO) {
                throw new IllegalArgumentException("Este horario ya alcanzó el máximo de " + MAX_VEHICULOS_POR_HORARIO + " vehículos confirmados.");
            }
        }
        cita.setEstado(nuevoEstado);
        return citaRepository.save(cita);
    }

    // Método para cancelar una cita existente. Cambia el estado de la cita a "Cancelada" incluso si su fecha ya expiró.
    @Transactional
    public void cancelar(Long id) {
        Cita cita = citaRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Cita no encontrada"));
        cita.setEstado("Cancelada");
        citaRepository.save(cita);
    }

}
