package com.mecatools.web.repositories;

import com.mecatools.web.models.MensajeContacto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface MensajeContactoRepository extends JpaRepository<MensajeContacto, Long> {
    // Pendientes primero (por fecha asc), luego respondidos (por fecha desc)
    @Query("SELECT m FROM MensajeContacto m ORDER BY m.respondido ASC, CASE WHEN m.respondido = false THEN m.fechaEnvio END ASC, m.fechaEnvio DESC")
    Page<MensajeContacto> findAllOrdenados(Pageable pageable);

    // Pendientes: el primero en llegar se muestra primero (fecha asc)
    Page<MensajeContacto> findByRespondidoFalseOrderByFechaEnvioAsc(Pageable pageable);

    // Respondidos: el último en ser respondido en la cabecera (fecha desc)
    Page<MensajeContacto> findByRespondidoTrueOrderByFechaEnvioDesc(Pageable pageable);

    long countByRespondidoFalse();

    Page<MensajeContacto> findByUsuario_IdOrderByFechaEnvioDesc(Long usuarioId, Pageable pageable);
}
