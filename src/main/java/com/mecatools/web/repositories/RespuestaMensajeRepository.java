package com.mecatools.web.repositories;

import com.mecatools.web.models.RespuestaMensaje;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RespuestaMensajeRepository extends JpaRepository<RespuestaMensaje, Long> {
    List<RespuestaMensaje> findByMensajeContacto_IdOrderByFechaRespuestaAsc(Long mensajeId);
}
