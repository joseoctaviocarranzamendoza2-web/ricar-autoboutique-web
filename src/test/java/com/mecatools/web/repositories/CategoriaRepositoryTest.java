package com.mecatools.web.repositories;

import com.mecatools.web.models.Categoria;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Prueba la consulta personalizada del repositorio contra una base H2 en memoria.
// No utiliza la instancia local de MySQL ni modifica sus datos.
@DataJpaTest(properties = { "spring.datasource.url=jdbc:h2:mem:mecatools-test", "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=", "spring.jpa.hibernate.ddl-auto=create-drop" })

class CategoriaRepositoryTest {

    private final CategoriaRepository categoriaRepository;

    @Autowired
    CategoriaRepositoryTest(CategoriaRepository categoriaRepository) {
        this.categoriaRepository = categoriaRepository;
    }

    @Test
    void debeEncontrarCategoriaPorNombre() {
        // Arrange: se inserta una categoría en la base H2 temporal.
        Categoria categoria = new Categoria();
        categoria.setNombre("Frenos");
        categoria.setDescripcion("Sistema de frenado");
        categoriaRepository.save(categoria);
        // Act: se ejecuta la consulta personalizada findByNombre.
        Optional<Categoria> resultado = categoriaRepository.findByNombre("Frenos");
        // Assert: la consulta recupera la categoría persistida.
        assertTrue(resultado.isPresent());
        assertEquals("Sistema de frenado", resultado.get().getDescripcion());
    }

    @Test
    void debeDevolverVacioCuandoElNombreNoExiste() {
        // Arrange: la base de datos de esta prueba no contiene categorías.
        // Act: se busca un nombre que no fue persistido.
        Optional<Categoria> resultado = categoriaRepository.findByNombre("Suspension");
        // Assert: Spring Data expresa la ausencia mediante Optional.empty().
        assertTrue(resultado.isEmpty());
    }

}
