-- ========================================================
-- EMPRESA: RICAR AUTOBOUTIQUE S.A.C.
-- Script de Inicialización y Auditoría de Base de Datos
-- Base de Datos: ricar_autoboutique
--
-- NORMALIZACIÓN EN TERCERA FORMA NORMAL (3FN):
-- 1FN (Primera Forma Normal):
--   - Todos los atributos contienen valores atómicos e indivisibles.
--   - Se eliminan grupos repetitivos y listas de roles mediante tablas singulares (rol, usuario_rol).
--
-- 2FN (Segunda Forma Normal):
--   - Se cumple 1FN y todos los atributos no clave tienen dependencia funcional completa
--     de la clave primaria (sin dependencias parciales en claves compuestas).
--   - Ejemplo: 'detalle_compra' depende de su propio ID y vincula 'compra' y 'producto';
--     'usuario_rol' identifica de forma unívoca cada asignación (usuario_id, rol_id).
--
-- 3FN (Tercera Forma Normal):
--   - Se cumple 2FN y se eliminan todas las dependencias transitivas (ningún atributo no clave
--     depende de otro atributo no clave; dependen directa y exclusivamente de la clave primaria).
--   - División de Categorías en 2 tablas normalizadas:
--       * 'categoria_producto': Categorías exclusivas de Productos (relación 1:N con producto vía id_categoria_producto).
--       * 'categoria_servicio': Categorías exclusivas de Servicios (relación 1:N con servicio vía id_categoria_servicio).
--   - Desacoplamiento de Auditoría de Usuario:
--       * 'usuario': Almacena únicamente los datos atómicos de identidad y credenciales.
--       * 'usuario_auditoria': Almacena de manera desacoplada los campos LOB de bloqueos,
--         evidencias, apelaciones y habilitaciones mediante relación 1:1 (usuario_id).
-- ========================================================

CREATE DATABASE IF NOT EXISTS ricar_autoboutique CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE ricar_autoboutique;

-- ========================================================
-- CONSULTAS SELECT * DE TODAS LAS TABLAS DEL SISTEMA (3FN)
-- ========================================================

-- 1. Catálogo y Clasificación Taxonómica (Dividida en 2 tablas en 3FN)
SELECT * FROM categoria_producto;   -- Categorías de Productos
SELECT * FROM categoria_servicio;   -- Categorías de Servicios

-- 2. Catálogo de Artículos y Prestaciones
SELECT * FROM producto;             -- Inventario y productos disponibles
SELECT * FROM servicio;             -- Servicios mecánicos y automotrices ofrecidos

-- 3. Seguridad, Roles y Cuentas de Usuario (3FN)
SELECT * FROM rol;                  -- Catálogo de roles del sistema (cliente, administrador, gerente)
SELECT * FROM usuario;              -- Usuarios registrados (datos base y autenticación)
SELECT * FROM usuario_rol;          -- Tabla intermedia para correlación ManyToMany de roles
SELECT * FROM usuario_auditoria;    -- Tabla desacoplada de auditoría de bloqueos, apelaciones y resoluciones

-- 4. Reservas y Citas de Taller
SELECT * FROM cita;                 -- Citas agendadas por clientes para atención de vehículos

-- 5. Facturación y Ventas
SELECT * FROM compra;               -- Cabecera de compras y pedidos realizados
SELECT * FROM detalle_compra;       -- Detalle de líneas de productos por compra

-- 6. Atención al Cliente, Mensajería y Feedback
SELECT * FROM comentario;           -- Calificaciones y testimonios de clientes
SELECT * FROM mensaje_contacto;     -- Mensajes y consultas enviados desde el formulario web
SELECT * FROM respuesta_mensaje;    -- Respuestas administrativas enviadas a las consultas
