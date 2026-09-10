package com.mecatools.web.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

// DTO para representar un item en el carrito de compras
public record ItemCarritoDTO(
    
    @NotNull(message = "El producto es obligatorio") Long idProducto,
    @Min(value = 1, message = "La cantidad mínima es 1") int cantidad

) {}
