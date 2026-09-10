package com.mecatools.web.repositories;

import com.mecatools.web.models.Servicio;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;

@DataJpaTest(properties = { "spring.datasource.url=jdbc:h2:mem:mecatools-servicios-test", "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=", "spring.jpa.hibernate.ddl-auto=create-drop" })

class ServicioRepositoryTest {

    private final ServicioRepository servicioRepository;

    @Autowired
    ServicioRepositoryTest(ServicioRepository servicioRepository) {
        this.servicioRepository = servicioRepository;
    }

    @Test
    void debeEncontrarServiciosPorEstado() {
        // Arrange: se guardan servicios con estados distintos para comprobar el filtro.
        servicioRepository.save(servicio("Alineacion", "Activo"));
        servicioRepository.save(servicio("Lavado", "Inactivo"));
        // Act: se solicitan únicamente los servicios activos.
        List<Servicio> resultado = servicioRepository.findByEstado("Activo");
        // Assert: no se mezclan registros con otro estado.
        assertEquals(1, resultado.size());
        assertEquals("Alineacion", resultado.get(0).getNombre());
    }

    private Servicio servicio(String nombre, String estado) {
        Servicio servicio = new Servicio();
        servicio.setNombre(nombre);
        servicio.setCategoria("Mantenimiento");
        servicio.setPrecioBase(35.0);
        servicio.setDuracionMinutos(45);
        servicio.setEstado(estado);
        return servicio;
    }

}
