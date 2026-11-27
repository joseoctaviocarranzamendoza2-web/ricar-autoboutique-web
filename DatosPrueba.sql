-- Datos de prueba para el catalogo de productos de RICAR AUTOBOUTIQUE
-- Compatible con MySQL/MariaDB y con las entidades Categoria y Producto.
-- Las imagenes usan URLs publicas de LoremFlickr, un servicio de imagenes
-- remotas basado en fotografias etiquetadas. Cambia las URLs por tu CDN si
-- deseas almacenar las imagenes localmente.

USE ricar_autoboutique;
START TRANSACTION;

INSERT INTO categoria_producto (nombre, descripcion, tipo) VALUES
('Herramientas', 'Herramientas manuales y electricas para mecanica automotriz', 'PRODUCTO'),
('Lubricantes', 'Aceites y fluidos para el cuidado del motor y sus sistemas', 'PRODUCTO'),
('Frenos', 'Pastillas, discos y componentes para sistemas de frenado', 'PRODUCTO'),
('Motor', 'Repuestos y componentes internos para motores', 'PRODUCTO'),
('Suspension y Direccion', 'Componentes para estabilidad, control y confort de marcha', 'PRODUCTO'),
('Electricidad Automotriz', 'Baterias, iluminacion y accesorios electricos para vehiculos', 'PRODUCTO'),
('Filtros', 'Filtros de aire, aceite, combustible y habitaculo', 'PRODUCTO'),
('Accesorios Interior', 'Accesorios practicos para mejorar el interior del vehiculo', 'PRODUCTO'),
('Accesorios Exterior', 'Accesorios de proteccion y personalizacion exterior', 'PRODUCTO'),
('Limpieza y Cuidado', 'Productos para limpieza, brillo y proteccion automotriz', 'PRODUCTO')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion), tipo = VALUES(tipo);

INSERT INTO producto (nombre, precio, stock, descripcion, etiqueta, imagen, estado, id_categoria_producto) VALUES
('Juego de Llaves Combinadas 12 Piezas', 85.00, 24, 'Juego de llaves de acero cromo vanadio para mantenimiento general.', 'Popular', 'https://loremflickr.com/640/480/automotive,tools?lock=1001', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Herramientas')),
('Set de Desarmadores Profesionales', 42.00, 35, 'Set de desarmadores planos y Phillips con mango antideslizante.', 'Nuevo', 'https://loremflickr.com/640/480/screwdriver,tools?lock=1002', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Herramientas')),
('Torquimetro Digital 1/2 Pulgada', 145.00, 12, 'Torquimetro digital con rango de trabajo de 20 a 200 Nm.', 'Premium', 'https://loremflickr.com/640/480/torque,wrench?lock=1003', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Herramientas')),
('Gato Hidraulico 2 Toneladas', 165.00, 10, 'Gato hidraulico compacto para elevacion segura de vehiculos livianos.', 'Oferta', 'https://loremflickr.com/640/480/hydraulic,jack?lock=1004', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Herramientas')),
('Multimetro Digital Automotriz', 58.00, 20, 'Multimetro digital para voltaje, continuidad y pruebas electricas.', 'Popular', 'https://loremflickr.com/640/480/multimeter,electronics?lock=1005', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Herramientas')),
('Pinza Amperimetrica 600A', 118.00, 8, 'Pinza amperimetrica para diagnostico de circuitos y baterias.', 'Nuevo', 'https://loremflickr.com/640/480/clamp,meter?lock=1006', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Herramientas')),
('Kit Extractor de Tornillos', 36.00, 28, 'Kit de extractores para tornillos danados de diferentes medidas.', '', 'https://loremflickr.com/640/480/extractor,tools?lock=1007', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Herramientas')),
('Compresor de Aire Portatil', 125.00, 14, 'Compresor portatil de 12V para inflado de neumaticos.', 'Popular', 'https://loremflickr.com/640/480/air,compressor?lock=1008', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Herramientas')),
('Lampara LED de Inspeccion', 49.00, 32, 'Lampara recargable con base magnetica para trabajos de inspeccion.', '', 'https://loremflickr.com/640/480/led,worklight?lock=1009', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Herramientas')),
('Organizador Magnetico de Tornillos', 29.00, 40, 'Bandeja magnetica para ordenar tornillos y piezas pequenas.', '', 'https://loremflickr.com/640/480/magnetic,toolbox?lock=1010', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Herramientas')),

('Aceite Sintetico 5W-30 1 Litro', 32.00, 50, 'Aceite sintetico para motores gasolina y diesel de uso diario.', 'Popular', 'https://loremflickr.com/640/480/motor,oil?lock=1011', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Lubricantes')),
('Aceite Sintetico 5W-40 4 Litros', 118.00, 26, 'Lubricante sintetico multigrado para motores de alto rendimiento.', 'Premium', 'https://loremflickr.com/640/480/engine,oil?lock=1012', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Lubricantes')),
('Aceite Semisintetico 10W-40 4 Litros', 92.00, 30, 'Aceite semisintetico para vehiculos de uso urbano y carretera.', '', 'https://loremflickr.com/640/480/oil,bottle?lock=1013', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Lubricantes')),
('Liquido de Frenos DOT4 500 ml', 22.00, 44, 'Liquido DOT4 de alta temperatura compatible con sistemas ABS.', 'Oferta', 'https://loremflickr.com/640/480/brake,fluid?lock=1014', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Lubricantes')),
('Refrigerante Anticongelante 1 Litro', 35.00, 38, 'Refrigerante listo para usar con proteccion contra corrosion.', '', 'https://loremflickr.com/640/480/coolant,car?lock=1015', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Lubricantes')),
('Refrigerante Concentrado 1 Litro', 42.00, 24, 'Refrigerante concentrado para preparar segun recomendacion del fabricante.', '', 'https://loremflickr.com/640/480/antifreeze,car?lock=1016', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Lubricantes')),
('Aditivo Limpia Inyectores', 28.00, 36, 'Aditivo para ayudar a limpiar inyectores y mejorar la combustion.', 'Nuevo', 'https://loremflickr.com/640/480/fuel,additive?lock=1017', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Lubricantes')),
('Aditivo Tratamiento de Motor', 31.00, 22, 'Tratamiento complementario para reducir friccion y proteger el motor.', '', 'https://loremflickr.com/640/480/engine,maintenance?lock=1018', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Lubricantes')),
('Grasa Multiproposito 400 g', 18.00, 46, 'Grasa multiproposito para rodamientos, bisagras y mecanismos.', '', 'https://loremflickr.com/640/480/grease,mechanic?lock=1019', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Lubricantes')),
('Spray Lubricante Multiuso 400 ml', 24.00, 42, 'Lubricante en aerosol para piezas moviles y mecanismos metalicos.', 'Popular', 'https://loremflickr.com/640/480/lubricant,spray?lock=1020', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Lubricantes')),

('Pastillas de Freno Ceramicas Delanteras', 78.00, 18, 'Pastillas ceramicas para frenado suave y menor generacion de polvo.', 'Popular', 'https://loremflickr.com/640/480/brake,pads?lock=1021', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Frenos')),
('Pastillas de Freno Semi Metalicas Traseras', 62.00, 20, 'Pastillas semi metalicas para aplicaciones de uso urbano.', '', 'https://loremflickr.com/640/480/disc,brake?lock=1022', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Frenos')),
('Disco de Freno Ventilado', 135.00, 12, 'Disco ventilado para reemplazo del sistema delantero.', '', 'https://loremflickr.com/640/480/brake,disc?lock=1023', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Frenos')),
('Kit de Frenos Traseros', 155.00, 9, 'Kit con componentes basicos para mantenimiento del eje trasero.', 'Oferta', 'https://loremflickr.com/640/480/car,brakes?lock=1024', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Frenos')),
('Sensor de Desgaste de Pastilla', 26.00, 25, 'Sensor de desgaste para monitorear la vida util de la pastilla.', 'Nuevo', 'https://loremflickr.com/640/480/brake,sensor?lock=1025', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Frenos')),
('Liquido de Frenos DOT3 500 ml', 18.00, 35, 'Liquido DOT3 para sistemas hidraulicos compatibles.', '', 'https://loremflickr.com/640/480/brake,fluid,auto?lock=1026', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Frenos')),
('Kit de Resortes para Caliper', 34.00, 16, 'Resortes de repuesto para montaje de pastillas de freno.', '', 'https://loremflickr.com/640/480/brake,caliper?lock=1027', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Frenos')),
('Manguera de Freno Flexible', 45.00, 14, 'Manguera flexible para conduccion segura del liquido de frenos.', '', 'https://loremflickr.com/640/480/brake,hose?lock=1028', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Frenos')),
('Cilindro Maestro Universal', 210.00, 6, 'Cilindro maestro para sistemas hidraulicos de vehiculos livianos.', 'Premium', 'https://loremflickr.com/640/480/master,cylinder?lock=1029', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Frenos')),
('Limpiador de Frenos 500 ml', 20.00, 48, 'Aerosol para retirar grasa y residuos de componentes de frenado.', 'Popular', 'https://loremflickr.com/640/480/brake,cleaner?lock=1030', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Frenos')),

('Bujias de Iridio Juego x4', 72.00, 20, 'Juego de bujias de iridio para encendido eficiente y estable.', 'Nuevo', 'https://loremflickr.com/640/480/spark,plugs?lock=1031', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Motor')),
('Kit Correa de Distribucion', 185.00, 10, 'Kit con correa, tensor y polea para mantenimiento del motor.', 'Popular', 'https://loremflickr.com/640/480/timing,belt?lock=1032', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Motor')),
('Tensor de Correa Auxiliar', 88.00, 13, 'Tensor auxiliar para mantener la tension correcta de la correa.', '', 'https://loremflickr.com/640/480/engine,belt?lock=1033', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Motor')),
('Bobina de Encendido', 96.00, 15, 'Bobina de encendido para mejorar la entrega de chispa.', '', 'https://loremflickr.com/640/480/ignition,coil?lock=1034', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Motor')),
('Sensor de Oxigeno Universal', 125.00, 9, 'Sensor lambda universal para control de mezcla y emisiones.', 'Premium', 'https://loremflickr.com/640/480/oxygen,sensor?lock=1035', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Motor')),
('Valvula PCV', 28.00, 24, 'Valvula de ventilacion positiva para sistema de gases del motor.', '', 'https://loremflickr.com/640/480/engine,valve?lock=1036', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Motor')),
('Junta de Culata', 115.00, 7, 'Junta de culata de reemplazo para reparacion del motor.', '', 'https://loremflickr.com/640/480/gasket,engine?lock=1037', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Motor')),
('Bomba de Agua', 148.00, 8, 'Bomba de agua para circulacion adecuada del refrigerante.', 'Oferta', 'https://loremflickr.com/640/480/water,pump,car?lock=1038', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Motor')),
('Termostato Automotriz', 46.00, 18, 'Termostato para regular la temperatura de funcionamiento del motor.', '', 'https://loremflickr.com/640/480/car,thermostat?lock=1039', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Motor')),
('Kit de Empaques de Motor', 260.00, 5, 'Kit de empaques para reparacion integral de motor.', 'Premium', 'https://loremflickr.com/640/480/engine,gasket,kit?lock=1040', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Motor')),

('Amortiguadores Delanteros Par', 240.00, 8, 'Par de amortiguadores delanteros para mejorar estabilidad y confort.', 'Oferta', 'https://loremflickr.com/640/480/shock,absorber?lock=1041', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Suspension y Direccion')),
('Amortiguadores Traseros Par', 210.00, 9, 'Par de amortiguadores traseros para vehiculos livianos.', '', 'https://loremflickr.com/640/480/car,suspension?lock=1042', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Suspension y Direccion')),
('Terminal de Direccion', 58.00, 16, 'Terminal de direccion para mantener precision y seguridad de manejo.', '', 'https://loremflickr.com/640/480/tie,rod?lock=1043', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Suspension y Direccion')),
('Rotula Inferior', 68.00, 14, 'Rotula de suspension para articulacion segura del conjunto delantero.', '', 'https://loremflickr.com/640/480/ball,joint?lock=1044', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Suspension y Direccion')),
('Bieleta de Barra Estabilizadora', 44.00, 18, 'Bieleta para reducir balanceo lateral en curvas.', 'Nuevo', 'https://loremflickr.com/640/480/stabilizer,bar?lock=1045', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Suspension y Direccion')),
('Buje de Bandeja', 35.00, 25, 'Buje de reemplazo para reducir vibraciones y ruidos.', '', 'https://loremflickr.com/640/480/control,arm?lock=1046', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Suspension y Direccion')),
('Rodamiento de Rueda', 82.00, 12, 'Rodamiento sellado para giro suave y seguro de la rueda.', 'Popular', 'https://loremflickr.com/640/480/wheel,bearing?lock=1047', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Suspension y Direccion')),
('Bomba de Direccion Hidraulica', 310.00, 4, 'Bomba hidraulica para asistencia de direccion.', 'Premium', 'https://loremflickr.com/640/480/power,steering?lock=1048', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Suspension y Direccion')),
('Liquido de Direccion 1 Litro', 29.00, 34, 'Fluido para sistemas de direccion hidraulica.', '', 'https://loremflickr.com/640/480/power,steering,fluid?lock=1049', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Suspension y Direccion')),
('Kit de Alineacion y Balanceo', 95.00, 11, 'Kit de accesorios para servicio de alineacion y balanceo.', '', 'https://loremflickr.com/640/480/wheel,alignment?lock=1050', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Suspension y Direccion')),

('Bateria 12V 45Ah', 330.00, 8, 'Bateria sellada de 12V para vehiculos compactos y medianos.', 'Popular', 'https://loremflickr.com/640/480/car,battery?lock=1051', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Electricidad Automotriz')),
('Bateria 12V 65Ah', 425.00, 6, 'Bateria de mayor capacidad para vehiculos medianos y SUV.', 'Premium', 'https://loremflickr.com/640/480/automotive,battery?lock=1052', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Electricidad Automotriz')),
('Foco LED H4', 68.00, 24, 'Foco LED H4 de luz blanca para faros principales.', 'Nuevo', 'https://loremflickr.com/640/480/led,headlight?lock=1053', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Electricidad Automotriz')),
('Foco LED H7', 72.00, 20, 'Foco LED H7 para mejorar iluminacion del camino.', '', 'https://loremflickr.com/640/480/car,headlights?lock=1054', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Electricidad Automotriz')),
('Cargador USB Doble para Auto', 25.00, 45, 'Cargador de 12V con dos puertos USB para el vehiculo.', 'Popular', 'https://loremflickr.com/640/480/car,charger?lock=1055', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Electricidad Automotriz')),
('Soporte de Fusibles', 32.00, 22, 'Portafusibles para organizar y proteger circuitos auxiliares.', '', 'https://loremflickr.com/640/480/fuse,box?lock=1056', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Electricidad Automotriz')),
('Juego de Fusibles Automotrices', 18.00, 60, 'Surtido de fusibles de distintos amperajes para vehiculos.', '', 'https://loremflickr.com/640/480/automotive,fuse?lock=1057', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Electricidad Automotriz')),
('Relay Automotriz 12V', 14.00, 40, 'Relay de 12V para circuitos de luces y accesorios.', '', 'https://loremflickr.com/640/480/relay,electrical?lock=1058', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Electricidad Automotriz')),
('Cable de Arranque Reforzado', 48.00, 15, 'Cables de arranque con pinzas aisladas y alta conductividad.', 'Oferta', 'https://loremflickr.com/640/480/jumper,cables?lock=1059', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Electricidad Automotriz')),
('Probador de Bateria Digital', 75.00, 10, 'Probador digital para revisar voltaje y estado de carga.', 'Nuevo', 'https://loremflickr.com/640/480/battery,tester?lock=1060', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Electricidad Automotriz')),

('Filtro de Aceite Universal', 24.00, 40, 'Filtro de aceite para retener impurezas del lubricante.', 'Popular', 'https://loremflickr.com/640/480/oil,filter?lock=1061', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Filtros')),
('Filtro de Aire Deportivo', 95.00, 14, 'Filtro de aire lavable para mejorar el flujo de admision.', 'Premium', 'https://loremflickr.com/640/480/air,filter,car?lock=1062', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Filtros')),
('Filtro de Aire Panel', 38.00, 32, 'Filtro de aire de panel para motores de uso diario.', '', 'https://loremflickr.com/640/480/air,filter?lock=1063', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Filtros')),
('Filtro de Combustible', 42.00, 21, 'Filtro para retener particulas presentes en el combustible.', '', 'https://loremflickr.com/640/480/fuel,filter?lock=1064', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Filtros')),
('Filtro de Cabina con Carbon Activado', 48.00, 25, 'Filtro de habitaculo con carbon activado para mejorar el aire interior.', 'Nuevo', 'https://loremflickr.com/640/480/cabin,air,filter?lock=1065', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Filtros')),
('Filtro de Cabina Antipolen', 34.00, 30, 'Filtro antipolen para climatizacion y ventilacion del vehiculo.', '', 'https://loremflickr.com/640/480/car,air,filter?lock=1066', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Filtros')),
('Filtro Hidraulico', 55.00, 12, 'Filtro para sistemas hidraulicos de vehiculos y maquinaria liviana.', '', 'https://loremflickr.com/640/480/hydraulic,filter?lock=1067', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Filtros')),
('Kit de Filtros para Servicio', 120.00, 9, 'Kit con filtro de aceite, aire y combustible para mantenimiento.', 'Oferta', 'https://loremflickr.com/640/480/car,filters?lock=1068', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Filtros')),
('Llave para Filtro de Aceite', 28.00, 27, 'Llave ajustable para retirar filtros de aceite con facilidad.', '', 'https://loremflickr.com/640/480/oil,filter,wrench?lock=1069', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Filtros')),
('Aspirador de Filtro de Aire', 52.00, 13, 'Accesorio para mantenimiento y limpieza de filtros reutilizables.', '', 'https://loremflickr.com/640/480/air,filter,maintenance?lock=1070', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Filtros')),

('Soporte Magnetico para Celular', 39.00, 35, 'Soporte magnetico para tablero con giro ajustable.', 'Popular', 'https://loremflickr.com/640/480/car,phone,mount?lock=1071', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Accesorios Interior')),
('Cargador Inalambrico para Auto', 89.00, 18, 'Base de carga inalambrica para celulares compatibles.', 'Nuevo', 'https://loremflickr.com/640/480/car,wireless,charger?lock=1072', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Accesorios Interior')),
('Organizador de Asiento Trasero', 58.00, 22, 'Organizador con bolsillos para mantener ordenado el habitaculo.', '', 'https://loremflickr.com/640/480/car,seat,organizer?lock=1073', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Accesorios Interior')),
('Alfombras de Goma Universales', 110.00, 16, 'Juego de alfombras de goma recortables y faciles de limpiar.', 'Oferta', 'https://loremflickr.com/640/480/car,floor,mats?lock=1074', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Accesorios Interior')),
('Cubre Asientos Universales', 145.00, 10, 'Juego de cubre asientos para proteger tapiceria original.', '', 'https://loremflickr.com/640/480/car,seat,covers?lock=1075', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Accesorios Interior')),
('Cojin Lumbar para Conductor', 46.00, 24, 'Cojin de apoyo lumbar para mejorar comodidad en viajes largos.', '', 'https://loremflickr.com/640/480/car,seat,cushion?lock=1076', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Accesorios Interior')),
('Espejo Retrovisor Panoramico', 36.00, 20, 'Espejo panoramico para ampliar el campo de vision trasero.', 'Nuevo', 'https://loremflickr.com/640/480/rearview,mirror?lock=1077', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Accesorios Interior')),
('Cesto de Basura para Auto', 22.00, 32, 'Cesto compacto con cierre para mantener limpio el interior.', '', 'https://loremflickr.com/640/480/car,trash,bin?lock=1078', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Accesorios Interior')),
('Kit de Ganchos para Cabecera', 18.00, 40, 'Ganchos para colgar bolsos y accesorios en los asientos.', '', 'https://loremflickr.com/640/480/car,headrest?lock=1079', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Accesorios Interior')),
('Cortinas Solares Laterales', 65.00, 19, 'Cortinas plegables para reducir el sol y el calor interior.', 'Popular', 'https://loremflickr.com/640/480/car,sunshade?lock=1080', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Accesorios Interior')),

('Kit de Camara de Retroceso', 145.00, 12, 'Camara de retroceso con vision nocturna para maniobras seguras.', 'Nuevo', 'https://loremflickr.com/640/480/rearview,camera?lock=1081', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Accesorios Exterior')),
('Sensor de Retroceso 4 Puntos', 98.00, 14, 'Kit de sensores ultrasonicos para asistencia de estacionamiento.', 'Popular', 'https://loremflickr.com/640/480/parking,sensor?lock=1082', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Accesorios Exterior')),
('Barras Portaequipaje Universales', 280.00, 5, 'Barras de techo ajustables para transportar equipaje y accesorios.', 'Premium', 'https://loremflickr.com/640/480/roof,rack,car?lock=1083', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Accesorios Exterior')),
('Protector de Parachoques', 74.00, 17, 'Protector flexible para reducir marcas en el parachoques trasero.', '', 'https://loremflickr.com/640/480/car,bumper?lock=1084', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Accesorios Exterior')),
('Molduras Laterales Universales', 62.00, 20, 'Molduras adhesivas para proteger y personalizar las puertas.', '', 'https://loremflickr.com/640/480/car,side,molding?lock=1085', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Accesorios Exterior')),
('Antena Deportiva Corta', 28.00, 30, 'Antena corta universal para personalizar el exterior del vehiculo.', 'Nuevo', 'https://loremflickr.com/640/480/car,antenna?lock=1086', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Accesorios Exterior')),
('Valvulas LED para Neumaticos', 35.00, 26, 'Tapas de valvula con iluminacion LED para ruedas.', '', 'https://loremflickr.com/640/480/tire,valve?lock=1087', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Accesorios Exterior')),
('Lamina de Seguridad para Ventanas', 120.00, 8, 'Lamina de seguridad para reducir impacto y radiacion solar.', 'Oferta', 'https://loremflickr.com/640/480/car,window,tint?lock=1088', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Accesorios Exterior')),
('Cubierta Impermeable para Auto', 180.00, 7, 'Cubierta impermeable para proteger la pintura de polvo y lluvia.', 'Premium', 'https://loremflickr.com/640/480/car,cover?lock=1089', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Accesorios Exterior')),
('Emblema Metalico Universal', 24.00, 35, 'Emblema adhesivo metalico para personalizacion exterior.', '', 'https://loremflickr.com/640/480/car,badge?lock=1090', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Accesorios Exterior')),

('Shampoo Automotriz 1 Litro', 28.00, 44, 'Shampoo concentrado para lavado exterior sin danar la pintura.', 'Popular', 'https://loremflickr.com/640/480/car,wash,soap?lock=1091', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Limpieza y Cuidado')),
('Cera Liquida para Carroceria', 45.00, 30, 'Cera liquida para brillo y proteccion de la pintura.', 'Oferta', 'https://loremflickr.com/640/480/car,wax?lock=1092', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Limpieza y Cuidado')),
('Cera en Pasta Premium', 68.00, 18, 'Cera en pasta de larga duracion para acabados brillantes.', 'Premium', 'https://loremflickr.com/640/480/car,polish?lock=1093', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Limpieza y Cuidado')),
('Limpiador de Tapiceria', 32.00, 36, 'Limpiador para telas y tapiceria con formula de secado rapido.', '', 'https://loremflickr.com/640/480/car,interior,cleaning?lock=1094', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Limpieza y Cuidado')),
('Acondicionador de Cuero', 39.00, 25, 'Acondicionador para conservar y proteger superficies de cuero.', 'Nuevo', 'https://loremflickr.com/640/480/leather,car,seat?lock=1095', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Limpieza y Cuidado')),
('Abrillantador de Neumaticos', 27.00, 42, 'Abrillantador para recuperar el acabado negro de los neumaticos.', '', 'https://loremflickr.com/640/480/car,tire,shine?lock=1096', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Limpieza y Cuidado')),
('Limpiavidrios Automotriz', 22.00, 48, 'Limpiador para cristales sin residuos ni marcas.', '', 'https://loremflickr.com/640/480/car,glass,cleaner?lock=1097', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Limpieza y Cuidado')),
('Kit de Microfibras 6 Piezas', 35.00, 38, 'Kit de paños de microfibra para lavado y detallado.', 'Popular', 'https://loremflickr.com/640/480/microfiber,car?lock=1098', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Limpieza y Cuidado')),
('Cepillo para Llantas', 25.00, 26, 'Cepillo de cerdas resistentes para limpiar llantas y rin.', '', 'https://loremflickr.com/640/480/car,wheel,brush?lock=1099', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Limpieza y Cuidado')),
('Aspiradora Portatil 12V', 115.00, 11, 'Aspiradora compacta de 12V para limpieza interior del vehiculo.', 'Nuevo', 'https://loremflickr.com/640/480/car,vacuum?lock=1100', 'Activo', (SELECT id FROM categoria_producto WHERE nombre = 'Limpieza y Cuidado'));

COMMIT;

-- Verificacion rapida:
SELECT c.nombre AS categoria, COUNT(p.id) AS cantidad_productos
FROM categoria_producto c
LEFT JOIN producto p ON p.id_categoria_producto = c.id
WHERE c.tipo = 'PRODUCTO'
GROUP BY c.id, c.nombre
ORDER BY c.id;
