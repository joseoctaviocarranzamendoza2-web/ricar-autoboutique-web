package com.mecatools.web.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/upload")
public class UploadApiController {

    private final Path uploadDir = Paths.get("uploads").toAbsolutePath().normalize();

    public UploadApiController() {
        try {
            Files.createDirectories(uploadDir);
        } catch (IOException e) {
            throw new RuntimeException("No se pudo crear el directorio de subidas", e);
        }
    }

    @PostMapping
    public ResponseEntity<?> subirArchivo(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El archivo de imagen está vacío"));
        }
        try {
            String originalName = file.getOriginalFilename();
            String extension = "";
            if (originalName != null && originalName.contains(".")) {
                extension = originalName.substring(originalName.lastIndexOf(".")).toLowerCase();
            }
            if (!extension.matches("\\.(jpg|jpeg|png|webp|gif|svg)$")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Formato no permitido. Usa JPG, PNG, WEBP, GIF o SVG"));
            }
            String nuevoNombre = UUID.randomUUID().toString() + extension;
            Path destino = uploadDir.resolve(nuevoNombre);
            Files.copy(file.getInputStream(), destino, StandardCopyOption.REPLACE_EXISTING);

            return ResponseEntity.ok(Map.of(
                    "url", "/uploads/" + nuevoNombre,
                    "filename", nuevoNombre
            ));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Error al guardar el archivo: " + e.getMessage()));
        }
    }
}
