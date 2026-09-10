package com.mecatools.web.services;

import com.mecatools.web.models.Categoria;
import com.mecatools.web.repositories.CategoriaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)

class CategoriaServiceTest {

    // Mockito crea un repositorio falso para que estas pruebas no dependan de MySQL.
    @Mock
    private CategoriaRepository categoriaRepository;

    // Inyecta el repositorio falso en la instancia real de CategoriaService.
    @InjectMocks
    private CategoriaService categoriaService;

    @Test
    void debeListarCategorias() {
        // Arrange: se define la respuesta simulada del repositorio.
        List<Categoria> categorias = List.of(crearCategoria("Frenos"));
        when(categoriaRepository.findAll()).thenReturn(categorias);
        // Act: se ejecuta el método que se quiere probar.
        List<Categoria> resultado = categoriaService.listar();
        // Assert: el servicio devuelve los datos y consulta el repositorio.
        assertSame(categorias, resultado);
        verify(categoriaRepository).findAll();
    }

    @Test
    void debeCrearCategoriaCuandoElNombreNoExiste() {
        // Arrange: el nombre está libre y el guardado devuelve la categoría.
        Categoria categoria = crearCategoria("Frenos");
        when(categoriaRepository.findByNombre("Frenos")).thenReturn(Optional.empty());
        when(categoriaRepository.save(categoria)).thenReturn(categoria);
        // Act.
        Categoria resultado = categoriaService.crear(categoria);
        // Assert: se devuelve la categoría y se permite guardar.
        assertSame(categoria, resultado);
        verify(categoriaRepository).save(categoria);
    }

    @Test
    void debeRechazarCategoriaDuplicada() {
        // Arrange: el repositorio informa que ya existe una categoría con ese nombre.
        Categoria existente = crearCategoria("Frenos");
        Categoria nueva = crearCategoria("Frenos");
        when(categoriaRepository.findByNombre("Frenos")).thenReturn(Optional.of(existente));
        // Act + Assert: se lanza la excepción de regla de negocio.
        assertThrows(IllegalStateException.class, () -> categoriaService.crear(nueva));
        // La operación no debe llegar a guardar la categoría duplicada.
        verify(categoriaRepository, never()).save(nueva);
    }

    @Test
    void debeEditarCategoriaExistente() {
        // Arrange: se encuentra una categoría y se preparan los nuevos datos.
        Categoria existente = crearCategoria("Frenos");
        Categoria datos = crearCategoria("Suspension");
        when(categoriaRepository.findById(1L)).thenReturn(Optional.of(existente));
        when(categoriaRepository.save(existente)).thenReturn(existente);
        // Act: el servicio actualiza la entidad encontrada y la guarda.
        Categoria resultado = categoriaService.editar(1L, datos);
        // Assert: se modificó el nombre y se persistió la misma entidad.
        assertEquals("Suspension", resultado.getNombre());
        verify(categoriaRepository).save(existente);
    }

    @Test
    void debeRechazarEliminacionDeCategoriaInexistente() {
        // Arrange: el identificador no existe.
        when(categoriaRepository.existsById(99L)).thenReturn(false);
        // Act + Assert: el servicio informa que no puede eliminarse.
        assertThrows(NoSuchElementException.class, () -> categoriaService.eliminar(99L));
        // Verifica que nunca se intente borrar un registro inexistente.
        verify(categoriaRepository, never()).deleteById(99L);
    }

    // Método auxiliar para crear entidades pequeñas y legibles dentro de cada prueba.
    private Categoria crearCategoria(String nombre) {
        Categoria categoria = new Categoria();
        categoria.setNombre(nombre);
        return categoria;
    }

}
