# MECATOOLS - Endpoints de Prueba

## Categorías

POST http://localhost:8080/api/categorias

Body:
```json
{
  "nombre": "Herramientas",
  "descripcion": "Herramientas manuales y eléctricas para mecánica automotriz"
}
```

---

## Servicios

POST http://localhost:8080/api/servicios

Body:
```json
{
  "nombre": "Cambio de Aceite",
  "categoria": "Lubricación",
  "precioBase": 45.00,
  "duracionMinutos": 45,
  "descripcion": "Cambio de aceite de motor con filtro incluido.",
  "estado": "Activo"
}
```

---

## Productos

POST http://localhost:8080/api/productos

Body:
```json
{
  "nombre": "Aceite Motor 5W-30 1L",
  "precio": 28.00,
  "stock": 50,
  "descripcion": "Aceite sintético",
  "etiqueta": "Popular",
  "imagen": "URL_IMAGEN",
  "categoria": {
    "id": 2
  }
}
```

---

## Usuarios

POST http://localhost:8080/api/usuarios/registro

Body:
```json
{
  "nombres": "Carlos",
  "apellidos": "Ríos Mendoza",
  "email": "carlos.rios@gmail.com",
  "password": "Carlos123",
  "telefono": "987654321",
  "ciudad": "Trujillo",
  "rol": "usuario"
}
```
