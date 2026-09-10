package com.mecatools.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

// DTO para crear una nueva compra
public record CrearCompraDTO(

    @NotNull(message = "El usuario es obligatorio") Long idUsuario,
    @NotEmpty(message = "El carrito está vacío") @Valid List<ItemCarritoDTO> items, String metodoPago

) {}
