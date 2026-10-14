-- Reinicio completo del esquema de desarrollo MECATOOLS.
-- Este script elimina todos los datos de ricar_autoboutique.
-- Ejecutarlo una sola vez y luego iniciar la aplicación para que Hibernate
-- cree las tablas singulares definidas por las entidades JPA.
--
-- NORMALIZACIÓN EN TERCERA FORMA NORMAL (3FN):
-- 1FN: los atributos contienen valores atómicos y la relación de roles se
--      representa en las tablas rol y usuario_rol.
-- 2FN: los atributos no clave dependen de la clave completa; usuario_rol
--      identifica cada asignación con la clave compuesta (usuario_id, rol_id).
-- 3FN: los atributos no clave dependen de la clave, de toda la clave y de
--      nada más que la clave, sin dependencias transitivas.

CREATE DATABASE ricar_autoboutique;

USE ricar_autoboutique;

SELECT * FROM categoria;
SELECT * FROM cita;
SELECT * FROM comentario;
SELECT * FROM compra;
SELECT * FROM detalle_compra;
SELECT * FROM producto;
SELECT * FROM rol;
SELECT * FROM servicio;
SELECT * FROM usuario;
SELECT * FROM usuario_rol;
