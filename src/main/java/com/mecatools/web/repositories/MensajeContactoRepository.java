package com.mecatools.web.repositories;

import com.mecatools.web.models.MensajeContacto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface MensajeContactoRepository extends JpaRepository<MensajeContacto, Long> {
    // FIFO: no respondidos primero (por fecha asc), luego respondidos (por fecha asc)
    @Query("SELECT m FROM MensajeContacto m ORDER BY m.respondido ASC, m.fechaEnvio ASC")
    Page<MensajeContacto> findAllOrdenados(Pageable pageable);

    long countByRespondidoFalse();

    Page<MensajeContacto> findByUsuario_IdOrderByFechaEnvioDesc(Long usuarioId, Pageable pageable);
}
