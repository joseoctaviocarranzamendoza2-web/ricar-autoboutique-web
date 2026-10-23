# 🛠️ MECATOOLS — Ricar Autoboutique Web Application

Sistema web integral de comercio electrónico, gestión de citas de taller mecánico, inventario y administración de roles para **Ricar Autoboutique**. Desarrollado con **Spring Boot 4**, **Java 25**, **Spring Security con JWT (OAuth2 Resource Server)**, **Spring Data JPA**, **MySQL** y renderizado dinámico con **Thymeleaf + JavaScript moderno**.

---

## 🏛️ 1. Arquitectura del Sistema y Diseño por Capas

El sistema implementa una **Arquitectura en Capas Desacoplada** que combina el patrón **MVC (Model-View-Controller)** para la navegación y renderizado de plantillas HTML, junto con una **API RESTful** para las operaciones asíncronas de datos (consumidas vía `fetch` desde el cliente).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CAPA DE PRESENTACIÓN                            │
│  Thymeleaf Templates (.html)  +  Client-Side Scripts (.js)  +  CSS     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Peticiones HTTP / JSON / Cookies
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        CAPA DE SEGURIDAD Y FILTROS                     │
│  JwtCookieAuthenticationFilter  │  ConfigSecurity  │  OAuth2 Resource │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Contexto de Seguridad / Authorities
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        CAPA DE CONTROLADORES                           │
│     API Controllers (@RestController)   │   MVC Controllers (@Controller)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ DTOs / Modelos
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        CAPA DE NEGOCIO (SERVICES)                      │
│     Lógica de aplicación, reglas de negocio, transacciones (@Transactional)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Entidades JPA
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   CAPA DE ACCESO A DATOS (REPOSITORIES)                │
│     Interfaces JpaRepository con consultas derivadas y JPQL            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ JDBC / Hibernate
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BASE DE DATOS RELACIONAL                        │
│             MySQL (ricar_autoboutique) Normalizada en 3FN              │
└────────────────────────────────────────────────────────────────────────┘
```

### Principios Arquitectónicos Clave:
1. **Normalización en Tercera Forma Normal (3FN):** La relación de usuarios y roles está desacoplada en `usuario`, `rol` y la tabla relacional `usuario_rol`, permitiendo que un usuario tenga múltiples roles simultáneos (ej. Administrador o Gerente conservan también los privilegios de Cliente).
2. **Seguridad Híbrida (Web MVC + REST Stateless):**
   - La API (`/api/**`) es **Stateless** y se protege mediante tokens **JWT** (JSON Web Tokens) transmitidos en el encabezado `Authorization: Bearer <token>` o mediante la cookie segura `access_token`.
   - Las vistas Web gestionan la navegación con sesión HTTP respaldada por la misma cookie JWT con vigencia de 20 minutos, garantizando que el usuario navegue sin pérdida de contexto entre diferentes roles.
3. **Transaccionalidad ACID:** Operaciones complejas como la orden de compra (`CompraService`) garantizan consistencia atómica mediante `@Transactional`, ejecutando rollback automático ante fallas de stock.

---

## 📂 2. Estructura de la Capa Backend (`web/src/main/java/com/mecatools/web`)

A continuación se detalla la organización de paquetes y la responsabilidad de cada archivo Java dentro de la aplicación:

| Capa / Paquete | Archivo Java | Tipo / Anotación Principal | Función y Responsabilidad en el Sistema |
| :--- | :--- | :--- | :--- |
| **Raíz** | `WebApplication.java` | `@SpringBootApplication` | Punto de entrada principal de la aplicación Spring Boot. Inicializa el contenedor de inversión de control (IoC) y arranca el servidor web embebido. |
| **`api`** | `CategoriaApiController.java` | `@RestController`, `@RequestMapping("/api/categorias")` | Expone endpoints REST para el CRUD de categorías de productos (listar, consultar por ID, registrar, modificar y eliminar). |
| **`api`** | `CitaApiController.java` | `@RestController`, `@RequestMapping("/api/citas")` | Gestiona el agendamiento y consulta de citas de mantenimiento mecánico de clientes, validando horarios y pertenencia. |
| **`api`** | `ComentarioApiController.java` | `@RestController`, `@RequestMapping("/api/comentarios")` | Expone endpoints para el registro y consulta de reseñas/calificaciones sobre productos y servicios, validando que el autor sea cliente. |
| **`api`** | `CompraApiController.java` | `@RestController`, `@RequestMapping("/api/compras")` | Procesa las órdenes de compra del carrito de compras, ejecutando la transacción completa y retornando el comprobante. |
| **`api`** | `ProductoApiController.java` | `@RestController`, `@RequestMapping("/api/productos")` | Gestiona el catálogo de productos, búsqueda individual, filtrado por categoría (`/categoria/{id}`) y mantenimiento de inventario. |
| **`api`** | `ServicioApiController.java` | `@RestController`, `@RequestMapping("/api/servicios")` | Gestiona el catálogo de servicios de taller (afinamiento, frenos, escaneo computarizado, etc.) con sus precios y duraciones. |
| **`api`** | `UsuarioApiController.java` | `@RestController`, `@RequestMapping("/api/usuarios")` | Gestiona el registro de nuevos usuarios (`/registro`), consulta de perfil autenticado, roles disponibles, actualización, cambio de estado (habilitar/inhabilitar vía `PATCH /{id}/estado`) y eliminación de clientes. |
| **`config`** | `ConfigSecurity.java` | `@Configuration`, `@EnableWebSecurity`, `@EnableMethodSecurity` | Configuración central de Spring Security. Define dos filtros (`apiSecurityFilterChain` y `securityFilterChain`), encoders BCrypt, login `/login`, logout, emisión de cookies JWT y respuestas de error 401/403 en formato JSON puro. |
| **`config`** | `DataInitializer.java` | `@Component`, `CommandLineRunner` | Se ejecuta al iniciar la aplicación. Garantiza que existan los roles `cliente`, `administrador` y `gerente` en la BD bajo 3FN y sincroniza la tabla `usuario_rol` asignando la jerarquía correspondiente. |
| **`config`** | `JwtConfiguration.java` | `@Configuration` | Configura los Beans de codificación y decodificación JWT (`NimbusJwtDecoder` y `NimbusJwtEncoder`) utilizando el algoritmo HMAC SHA-256 a partir de la propiedad `app.jwt.secret`. |
| **`controllers`** | `GlobalSecurityExceptionHandler.java`| `@ControllerAdvice` | Intercepta excepciones de seguridad (`AccessDeniedException`, `AuthenticationException`) en toda la aplicación para devolver respuestas estructuradas en formato JSON con código 401 o 403. |
| **`controllers`** | `PaginaAdministradorController.java`| `@Controller`, `@RequestMapping("/panel/administrador")` | Despacha las vistas HTML del panel de administración (gestión de productos, servicios, categorías, clientes, citas y ventas). |
| **`controllers`** | `PaginaClienteController.java` | `@Controller`, `@RequestMapping("/panel/cliente")` | Despacha las vistas HTML del panel de cliente (perfil del usuario, citas agendadas, historial de compras y comentarios realizados). |
| **`controllers`** | `PaginaGerenteController.java` | `@Controller`, `@RequestMapping("/panel/gerente")` | Despacha las vistas HTML del panel de gerencia (reportes ejecutivos, métricas financieras, auditoría de ingresos y estadísticas). |
| **`controllers`** | `PaginaPublicaController.java` | `@Controller` | Enruta y despacha las páginas públicas accesibles desde el navbar (`/inicio`, `/servicios`, `/productos`, `/nosotros`, `/contacto`) tanto en modo anónimo como con sesión activa (`/{ruta}/{rol}/{id}`). |
| **`controllers`** | `RolController.java` | `@Controller`, `@RequestMapping` | Despacha la vista interactiva de selección de rol (`/setupRole`, `/rol`, `/seleccionar-rol`) para usuarios con perfiles múltiples (ej. Administrador y Cliente). |
| **`controllers.util`** | `SesionValidator.java` | Clase utilitaria | Valida la coherencia de sesión entre el usuario autenticado (JWT/Spring Security) y el ID y rol especificados en la ruta del navegador. |
| **`dto`** | `CrearCompraDTO.java` | Record / DTO | Objeto de transferencia de datos que encapsula los ítems del carrito (`items`), método de pago y dirección de envío para la creación de una compra. |
| **`dto`** | `ItemCarritoDTO.java` | Record / DTO | Objeto de transferencia de datos que representa una línea del carrito de compras (`productoId`, `cantidad`, `precioUnitario`). |
| **`models`** | `Categoria.java` | `@Entity`, `@Table(name="categoria")` | Entidad JPA que representa las familias o categorías en las que se clasifican los productos. |
| **`models`** | `Cita.java` | `@Entity`, `@Table(name="cita")` | Entidad JPA para el registro de citas de taller con fecha, hora, estado, notas, cliente asociado y servicio solicitado. |
| **`models`** | `Comentario.java` | `@Entity`, `@Table(name="comentario")` | Entidad JPA que almacena las opiniones, calificaciones (1 a 5 estrellas) y testimonios dejados por los clientes. |
| **`models`** | `Compra.java` | `@Entity`, `@Table(name="compra")` | Entidad JPA que representa la cabecera de la transacción de compra (fecha, total acumulado, estado y usuario comprador). |
| **`models`** | `DetalleCompra.java` | `@Entity`, `@Table(name="detalle_compra")` | Entidad JPA que desglosa cada producto adquirido en una compra, con cantidad, precio unitario y subtotal calculado. |
| **`models`** | `Producto.java` | `@Entity`, `@Table(name="producto")` | Entidad JPA para el inventario de artículos automotrices, con nombre, descripción, precio, stock disponible, imagen y categoría. |
| **`models`** | `Rol.java` | `@Entity`, `@Table(name="rol")` | Entidad JPA que almacena los roles normalizados del sistema (`cliente`, `administrador`, `gerente`) para cumplir con 3FN. |
| **`models`** | `Servicio.java` | `@Entity`, `@Table(name="servicio")` | Entidad JPA que representa los servicios mecánicos que ofrece el taller automotriz, con precio y tiempo estimado de atención. |
| **`models`** | `Usuario.java` | `@Entity`, `@Table(name="usuario")` | Entidad JPA de usuarios con datos personales, contraseña cifrada en BCrypt y colección de roles `@ManyToMany` mapeada a la tabla `usuario_rol`. |
| **`repositories`** | `CategoriaRepository.java` | `JpaRepository<Categoria, Long>` | Operaciones de persistencia para categorías de productos, incluyendo búsqueda insensible a mayúsculas (`findByNombreIgnoreCase`). |
| **`repositories`** | `CitaRepository.java` | `JpaRepository<Cita, Long>` | Consultas para citas de taller, incluyendo listado por cliente (`findByUsuarioIdOrderByFechaDesc`) y filtrado por estado. |
| **`repositories`** | `ComentarioRepository.java` | `JpaRepository<Comentario, Long>` | Consultas JPA para persistencia y filtrado de valoraciones y opiniones de clientes por producto o servicio. |
| **`repositories`** | `CompraRepository.java` | `JpaRepository<Compra, Long>` | Consultas para el historial de compras por usuario (`findByUsuarioIdOrderByFechaDesc`) y reportes consolidados de ventas. |
| **`repositories`** | `DetalleCompraRepository.java` | `JpaRepository<DetalleCompra, Long>` | Persistencia de líneas de detalle asociadas a cada comprobante de compra. |
| **`repositories`** | `ProductoRepository.java` | `JpaRepository<Producto, Long>` | Consultas JPQL personalizadas para productos con stock activo y filtrado específico por categoría (`findByCategoriaId`). |
| **`repositories`** | `RolRepository.java` | `JpaRepository<Rol, Long>` | Acceso a roles con búsqueda normalizada por nombre (`findByNombreIgnoreCase`). |
| **`repositories`** | `ServicioRepository.java` | `JpaRepository<Servicio, Long>` | Operaciones de persistencia y catálogo para servicios automotrices ofrecidos. |
| **`repositories`** | `UsuarioRepository.java` | `JpaRepository<Usuario, Long>` | Consultas JPQL avanzadas: búsqueda por email (`findByEmail`), verificación de existencia y búsqueda ordenada de usuarios con rol cliente (`findByRol`). |
| **`security`** | `JwtCookieAuthenticationFilter.java` | `OncePerRequestFilter` | Filtro de seguridad que intercepta cada petición HTTP, extrae el JWT desde la cookie `access_token` o el header `Authorization: Bearer`, valida la firma y carga la autenticación en el `SecurityContext`. |
| **`security`** | `JwtTokenService.java` | `@Service` | Genera y valida tokens JWT firmados con HMAC SHA-256, asignando claims de subject, roles, emisión y expiración fijada a 20 minutos. |
| **`security`** | `UsuarioDetails.java` | `UserDetails` | Adaptador que implementa el contrato de Spring Security envolviendo a la entidad `Usuario`, convirtiendo sus roles a `GrantedAuthority`. |
| **`security`** | `UsuarioDetailsService.java` | `@Service`, `UserDetailsService` | Carga el usuario desde la base de datos por su email para autenticación contra DaoAuthenticationProvider de Spring Security. |
| **`services`** | `CategoriaService.java` | `@Service` | Capa de negocio para validación, creación, actualización y eliminación de categorías de productos. |
| **`services`** | `CitaService.java` | `@Service` | Lógica de negocio para reserva de citas, validación de horarios, estados de atención y cancelación de citas. |
| **`services`** | `ComentarioService.java` | `@Service` | Lógica de negocio para el registro de testimonios y moderación de comentarios verificando que el usuario posea rol de cliente. |
| **`services`** | `CompraService.java` | `@Service`, `@Transactional` | Procesa la compra transaccional: valida y descuenta el stock de productos, genera la compra, inserta los detalles y ejecuta rollback si no hay existencias. |
| **`services`** | `ProductoService.java` | `@Service` | Lógica de inventario, validación de precios, control de existencias y filtrado de productos por categoría. |
| **`services`** | `ServicioService.java` | `@Service` | Gestión de servicios automotrices, actualización de tarifas y duraciones de trabajo de taller. |
| **`services`** | `UsuarioService.java` | `@Service` | Registro con hashing BCrypt, autenticación, asignación de roles normalizados y listado unificado de clientes (`findByRol("cliente")`). |

---

## 🎨 3. Estructura de Recursos del Sistema (`web/src/main/resources`)

A continuación se desglosan todos los recursos de configuración, datos SQL, estilos visuales, scripts de cliente y plantillas HTML Thymeleaf:

| Módulo / Carpeta | Archivo / Recurso | Tipo de Archivo | Descripción y Función en la Aplicación |
| :--- | :--- | :--- | :--- |
| **Configuración** | `application.properties` | Configuración Spring | Define el puerto, credenciales de conexión a MySQL (`ricar_autoboutique`), `ddl-auto=update`, tiempo de sesión HTTP (20m) y clave secreta del JWT. |
| **`data`** | `mecatools.sql` | Script SQL | Script para inicializar y reiniciar la base de datos en MySQL con explicación de la normalización en 1FN, 2FN y 3FN, y consultas de auditoría por tabla. |
| **`data/postman`** | `*.json`, `endpoints.md` | JSON / Markdown | Colecciones de prueba con datos iniciales de usuarios, categorías, productos y catálogo de endpoints para pruebas de API en Postman o Thunder Client. |
| **`static/css`** | `global.css` | Hoja de estilo CSS | Estilos globales, variables de color temáticas (modo oscuro/claro), tipografías, navbar flotante, footer, badges, botones y modales reutilizables. |
| **`static/css/navbar`** | `contacto.css` | Hoja de estilo CSS | Estilos para la página de contacto: tarjetas de sucursales, formulario de consultas y mapas de atención. |
| **`static/css/navbar`** | `inicio.css` | Hoja de estilo CSS | Estilos para la landing page: banner principal con efectos de iluminación, tarjetas destacadas y secciones promocionales. |
| **`static/css/navbar`** | `nosotros.css` | Hoja de estilo CSS | Estilos para la página institucional: historia de Ricar Autoboutique, misión, visión y equipo de mecánicos profesionales. |
| **`static/css/navbar`** | `productos.css` | Hoja de estilo CSS | Estilos para el catálogo de productos: rejilla interactiva de tarjetas, filtros visuales por categoría y modal de ficha técnica. |
| **`static/css/navbar`** | `servicios.css` | Hoja de estilo CSS | Estilos para el catálogo de servicios automotrices: tarjetas de servicio con indicador de duración estimada y botón de agendamiento. |
| **`static/css/roles`** | `administrador.css` | Hoja de estilo CSS | Diseño del panel de administración: barra lateral (sidebar), métricas KPI, tablas de datos tabulares y modales de edición CRUD. |
| **`static/css/roles`** | `cliente.css` | Hoja de estilo CSS | Diseño del panel del cliente: vista de perfil personal, tarjetas de citas agendadas e historial de compras con estado de entrega. |
| **`static/css/roles`** | `gerente.css` | Hoja de estilo CSS | Diseño del panel ejecutivo: gráficos estadísticos, tarjetas de balance de ingresos, resúmenes de inventario y auditoría. |
| **`static/css/roles`** | `rol.css` | Hoja de estilo CSS | Estilos para la pantalla de bienvenida y selección de rol (`/setupRole`), con tarjetas interactivas de rol y transiciones fluidas. |
| **`static/img`** | Recursos multimedia | Imágenes / SVG / PNG | Logotipos oficiales de Ricar Autoboutique, avatares, fotos de repuestos, accesorios, herramientas y banners publicitarios. |
| **`static/js`** | `global.js` | Script JavaScript | Script central incluido en todas las páginas. Administra la sincronización de sesión y cookies JWT, modales de login/registro, carrito de compras flotante (`syncCart`, `finalizarCompra`), agendamiento rápido y botón de cambio de rol dinámico. |
| **`static/js/navbar`** | `contacto.js` | Script JavaScript | Controla la interacción del formulario de contacto y retroalimentación interactiva al enviar consultas. |
| **`static/js/navbar`** | `inicio.js` | Script JavaScript | Carga dinámica desde la API de los productos y servicios destacados en la página principal. |
| **`static/js/navbar`** | `productos.js` | Script JavaScript | Gestiona el catálogo de productos: consume `GET /api/productos`, permite el filtrado dinámico por categoría sin recargar y añade artículos al carrito. |
| **`static/js/navbar`** | `servicios.js` | Script JavaScript | Consume `GET /api/servicios`, despliega los servicios y abre el modal de agendamiento asociando el servicio seleccionado a la cita. |
| **`static/js/roles`** | `administrador.js` | Script JavaScript | Lógica del panel de administración: consumo y CRUD de productos, categorías, servicios, citas (con código formateado `#S-001`) y tabla de clientes (con código `#C-001` e inclusión de cuentas multi-rol). |
| **`static/js/roles`** | `cliente.js` | Script JavaScript | Lógica del panel de cliente: consulta asíncrona de compras realizadas, estado de citas mecánicas y actualización de datos personales. |
| **`static/js/roles`** | `gerente.js` | Script JavaScript | Lógica del panel de gerencia: cálculo de métricas de ingresos, agregación de ventas por categoría y consolidación financiera. |
| **`static/js/roles`** | `rol.js` | Script JavaScript | Lógica para la pantalla de selección de rol (`/setupRole`): detecta los roles disponibles del usuario, actualiza la cookie `rol_activo` y redirige al panel o navbar correspondiente. |
| **`templates/fragments`**| `footer.html` | Fragmento Thymeleaf | Pie de página reutilizable en todas las vistas con información de contacto, enlaces rápidos, redes sociales y créditos legales. |
| **`templates/fragments`**| `modales.html` | Fragmento Thymeleaf | Contiene los modales globales del sistema: modal de Inicio de Sesión, modal de Registro, modal del Carrito de Compras y modal de Reserva de Citas. |
| **`templates/fragments`**| `navbar.html` | Fragmento Thymeleaf | Barra de navegación superior dinámica: adapta sus enlaces si el usuario es anónimo o según el rol activo (`cliente`, `administrador`, `gerente`), con botón para cambiar de rol. |
| **`templates/navbar`** | `contacto.html` | Plantilla Thymeleaf | Vista web de la página de contacto y atención al cliente. |
| **`templates/navbar`** | `inicio.html` | Plantilla Thymeleaf | Vista web de la página de inicio (Landing Page) con carrusel principal, productos destacados y opiniones de clientes. |
| **`templates/navbar`** | `nosotros.html` | Plantilla Thymeleaf | Vista web con la presentación institucional de la empresa y valores de Ricar Autoboutique. |
| **`templates/navbar`** | `productos.html` | Plantilla Thymeleaf | Vista web del catálogo de productos con selector de categorías y carrito de compras integrado. |
| **`templates/navbar`** | `servicios.html` | Plantilla Thymeleaf | Vista web del catálogo de servicios de taller con opción de agendamiento directo de citas. |
| **`templates/roles`** | `administrador.html` | Plantilla Thymeleaf | Vista completa del panel de administración con pestañas para productos, servicios, categorías, clientes, citas y pedidos. |
| **`templates/roles`** | `cliente.html` | Plantilla Thymeleaf | Vista del panel privado del cliente con su historial de compras, citas de taller pendientes y gestión de perfil. |
| **`templates/roles`** | `gerente.html` | Plantilla Thymeleaf | Vista del panel ejecutivo con métricas de ventas, balance de inventario y estadísticas de rendimiento del taller. |
| **`templates/roles`** | `rol.html` | Plantilla Thymeleaf | Vista interactiva para seleccionar el rol activo tras iniciar sesión cuando el usuario tiene múltiples roles asignados. |

---

## 📦 4. Dependencias del Proyecto y su Rol Técnico (`pom.xml`)

El proyecto utiliza **Maven** como gestor de dependencias y construcción de artefactos. Las principales librerías utilizadas son:

| Dependencia Maven | Identificador (`ArtifactId`) | Ámbito (`Scope`) | Uso y Justificación Técnica en el Sistema |
| :--- | :--- | :--- | :--- |
| **Spring Boot Starter Web** | `spring-boot-starter-webmvc` | Compilación | Proporciona el soporte MVC completo, servidor HTTP embebido Tomcat, controladores RESTful (`@RestController`), enrutamiento de peticiones y serialización/deserialización JSON automática con Jackson. |
| **Spring Boot Starter Data JPA** | `spring-boot-starter-data-jpa` | Compilación | Abstracción de acceso a datos que integra Hibernate como proveedor JPA. Provee repositorios automáticos (`JpaRepository`), transaccionalidad declarativa (`@Transactional`), mapeo entidad-relacional y consultas JPQL. |
| **MySQL Connector/J** | `mysql-connector-j` | Runtime | Driver JDBC oficial que permite a la aplicación comunicarse y persistir datos en el servidor de base de datos relacional MySQL 8.x. |
| **Spring Boot Starter Security** | `spring-boot-starter-security` | Compilación | Motor de autenticación y autorización que protege endpoints y páginas web. Aplica filtros de seguridad, hashing de contraseñas con BCrypt y control de acceso basado en roles/autoridades. |
| **OAuth2 Resource Server** | `spring-security-oauth2-resource-server` | Compilación | Habilita a la aplicación para operar como servidor de recursos OAuth2, validando tokens de portador (Bearer JWT) en las cabeceras HTTP de peticiones API. |
| **OAuth2 JOSE** | `spring-security-oauth2-jose` | Compilación | Biblioteca para soporte de Javascript Object Signing and Encryption (JOSE) y JSON Web Tokens (JWT). Utilizada para firmar y decodificar tokens con el algoritmo HMAC SHA-256. |
| **Spring Boot Starter Thymeleaf** | `spring-boot-starter-thymeleaf` | Compilación | Motor de plantillas del lado del servidor para procesar y renderizar archivos HTML limpios con enlace de datos dinámico (`th:text`, `th:each`, `th:replace`). |
| **Thymeleaf Extras Spring Security**| `thymeleaf-extras-springsecurity6` | Compilación | Dialecto de Thymeleaf que permite aplicar condiciones de seguridad en las plantillas HTML (ej. `sec:authorize="hasAuthority('administrador')"`). |
| **Spring Boot Starter Validation** | `spring-boot-starter-validation` | Compilación | Provee integración con Hibernate Validator y Jakarta Bean Validation (`@NotNull`, `@Size`, `@Email`, `@Min`) para validar datos entrantes en los DTOs y formularios. |
| **Lombok** | `lombok` | Opcional / Compilación | Reduce el código boilerplate generando automáticamente getters, setters, constructores y métodos `toString()` mediante anotaciones durante el tiempo de compilación. |
| **Spring Boot DevTools** | `spring-boot-devtools` | Runtime | Acelera el ciclo de desarrollo mediante reinicio rápido del contexto de Spring y recarga en caliente de recursos estáticos y plantillas HTML sin necesidad de reiniciar el servidor. |
| **H2 Database & Test Starters** | `h2`, `*-test` | Test | Base de datos en memoria y utilidades para pruebas unitarias y de integración en el entorno de testing. |

---

## 🔍 5. Guía de Verificación y Demostración en Navegador (DevTools > Network)

Esta sección detalla el **flujo exacto, paso a paso**, para evidenciar en vivo cada uno de los 12 puntos de la **Lista de Verificación de Demostración en Navegador** solicitada en la rúbrica de evaluación:

![Lista de Verificación - Demostración en Navegador](file:///C:/Users/joseo/.gemini/antigravity-ide/brain/f7d9837e-30ac-4c4e-9d2a-d2275ecaf851/.user_uploaded/media_1792085708477.png)

### Resumen de la Lista de Verificación:

| N.° | Acción Observable | Evidencia en DevTools / Aplicación |
| :---: | :--- | :--- |
| **1** | Abrir F12 y seleccionar Network | Solicitudes generadas al usar la interfaz |
| **2** | Registrar un dato desde formulario | POST y Payload JSON/form-data |
| **3** | Consultar listado | GET y Response/Preview |
| **4** | Editar un registro | PUT/PATCH y Payload |
| **5** | Eliminar registro | DELETE y código HTTP |
| **6** | Verificar persistencia | Cambio reflejado en BD y al recargar |
| **7** | Realizar consulta personalizada | GET con parámetros y resultado JPQL |
| **8** | Demostrar transacción | Cambios coherentes y explicación de commit/rollback |
| **9** | Iniciar sesión | POST login y respuesta con JWT |
| **10** | Acceder con token Bearer | Authorization visible, ocultando el valor al exponer |
| **11** | Probar token ausente o inválido | 401 Unauthorized |
| **12** | Probar rol sin permiso | 403 Forbidden |

---

### 📝 Desarrollo Paso a Paso de las 12 Acciones Observables

---

#### 🟢 Acción N.° 1: Abrir F12 y seleccionar Network
* **Objetivo:** Demostrar cómo la aplicación web genera solicitudes asíncronas y estáticas al interactuar con el sitio.
* **Flujo Paso a Paso:**
  1. Abrir el navegador web (Google Chrome, Edge o Firefox) e ingresar a la URL base: `http://localhost:8080/inicio`.
  2. Presionar la tecla `F12` (o clic derecho > *Inspeccionar*) para abrir las Herramientas de Desarrollador (**DevTools**).
  3. Hacer clic en la pestaña superior **Network** (Red).
  4. En la barra de filtros de DevTools, seleccionar la opción **All** o **Fetch/XHR** y verificar que el botón circular de grabación esté activo (en color rojo).
  5. En el menú de navegación (Navbar), hacer clic en la opción **Servicios** o **Productos**.
* **Evidencia Observable en DevTools:**
  - En la lista de peticiones de Network se genera una cascada de solicitudes HTTP: llamadas asíncronas hacia `/api/productos` o `/api/servicios`, hojas de estilo CSS (`global.css`, `productos.css`), scripts (`global.js`, `productos.js`) e imágenes.
  - Se observan códigos de estado **`200 OK`**, método HTTP, tipo de recurso transferido y tiempos de respuesta.

---

#### 🟢 Acción N.° 2: Registrar un dato desde formulario
* **Objetivo:** Demostrar el envío de datos estructurados hacia el backend utilizando el método HTTP `POST` con su respectivo cuerpo de datos (Payload).
* **Flujo Paso a Paso:**
  1. Con la pestaña **Network** abierta en DevTools (filtro **Fetch/XHR** activo), dirigirse a la vista de registro:
     - Hacer clic en el botón **Registrarse** del Navbar para abrir el modal, o ingresar a `http://localhost:8080/inicio/register`.
  2. Rellenar los campos del formulario con datos de prueba nuevos:
     - **Nombres:** `Pedro`
     - **Apellidos:** `Ramírez Castro`
     - **Email:** `pedro.ramirez@example.com`
     - **Contraseña:** `Pedro1234`
     - **Teléfono:** `987112233`
     - **Ciudad:** `Trujillo`
  3. Hacer clic en el botón **Crear Cuenta**.
* **Evidencia Observable en DevTools:**
  - En DevTools Network aparece la solicitud: `registro` (URL: `POST http://localhost:8080/api/usuarios/registro`).
  - Al seleccionar la solicitud y hacer clic en la subpestaña **Payload**, se observa el objeto JSON enviado:
    ```json
    {
      "nombres": "Pedro",
      "apellidos": "Ramírez Castro",
      "email": "pedro.ramirez@example.com",
      "password": "Pedro1234",
      "telefono": "987112233",
      "ciudad": "Trujillo"
    }
    ```
  - En la pestaña **Headers** se evidencia: `Request Method: POST` y `Status Code: 200 OK` (o `201 Created`).
  - En la subpestaña **Response / Preview** se evidencia el usuario creado con su ID asignado en la base de datos.

---

#### 🟢 Acción N.° 3: Consultar listado
* **Objetivo:** Evidenciar una consulta masiva de datos mediante el método HTTP `GET` y verificar la estructura de la respuesta JSON retornada.
* **Flujo Paso a Paso:**
  1. Con DevTools abierto en la pestaña **Network** (filtro **Fetch/XHR**), navegar hacia la sección de catálogo: `http://localhost:8080/productos`.
  2. En la lista de solicitudes de red, seleccionar la petición con nombre **`productos`** correspondiente a la URL `http://localhost:8080/api/productos`.
  3. En el panel lateral derecho de la petición, seleccionar la pestaña **Preview** o **Response**.
* **Evidencia Observable en DevTools:**
  - **Headers:** Se observa `Request Method: GET` y `Status Code: 200 OK`.
  - **Preview / Response:** Se visualiza el arreglo JSON de productos obtenido directamente desde la base de datos MySQL a través de `ProductoRepository.findAll()`:
    ```json
    [
      {
        "id": 1,
        "nombre": "Aceite Sintético 5W-30",
        "descripcion": "Aceite de alto rendimiento para motores a gasolina y diésel ligero.",
        "precio": 120.0,
        "stock": 50,
        "categoria": { "id": 1, "nombre": "Mantenimiento" }
      },
      { "id": 2, "nombre": "Filtro de Aire Deportivo", "precio": 85.0, ... }
    ]
    ```

---

#### 🟢 Acción N.° 4: Editar un registro
* **Objetivo:** Evidenciar la actualización de un recurso existente mediante una petición HTTP `PUT` enviando el Payload con los campos modificados.
* **Flujo Paso a Paso:**
  1. Iniciar sesión como Administrador (Email: `admin@gmail.com` / Contraseña: `Admin1234`).
  2. Ir al panel de administración: `http://localhost:8080/panel/administrador/2/gestion/productos`.
  3. En la tabla de productos, ubicar un registro (por ejemplo, el producto con ID 1) y hacer clic en el botón de acción **Editar** (ícono de lápiz azul).
  4. En el modal emergente "Editar Producto", modificar un valor (por ejemplo, cambiar el **Precio** de `120.00` a `135.50` o actualizar el stock).
  5. Hacer clic en **Guardar Cambios**.
* **Evidencia Observable en DevTools:**
  - En DevTools Network se genera la petición hacia `/api/productos/1`.
  - **Headers:** Muestra `Request Method: PUT` y `Status Code: 200 OK`.
  - **Payload:** Se muestra el objeto JSON con la información actualizada:
    ```json
    {
      "nombre": "Aceite Sintético 5W-30",
      "descripcion": "Aceite de alto rendimiento para motores a gasolina y diésel ligero.",
      "precio": 135.50,
      "stock": 48,
      "categoriaId": 1
    }
    ```
  - La tabla del frontend actualiza el precio inmediatamente sin necesidad de recargar la página.

---

#### 🟢 Acción N.° 5: Eliminar registro
* **Objetivo:** Demostrar la baja física o lógica de un recurso utilizando el verbo HTTP `DELETE` y verificar el código de respuesta.
* **Flujo Paso a Paso:**
  1. Estando en el panel de administrador (`http://localhost:8080/panel/administrador/2/gestion/categorias` o `/gestion/productos`).
  2. Para no alterar datos clave de demostración, crear primero una categoría de prueba (ej. "Accesorios Temporales") o seleccionar un registro de prueba.
  3. En la fila del registro, hacer clic en el botón de acción **Eliminar** (ícono de papelera roja).
  4. En el modal de confirmación, presionar **Sí, eliminar**.
* **Evidencia Observable en DevTools:**
  - En Network aparece la solicitud: `DELETE http://localhost:8080/api/categorias/{id}`.
  - **Headers:** Se constata `Request Method: DELETE` y `Status Code: 200 OK` (o `204 No Content`).
  - La fila del registro es removida dinámicamente del DOM de la tabla mediante JavaScript.

---

#### 🟢 Acción N.° 6: Verificar persistencia
* **Objetivo:** Comprobar que las modificaciones realizadas en el frontend se persisten efectivamente en el motor de base de datos MySQL y se mantienen tras recargar.
* **Flujo Paso a Paso:**
  1. Inmediatamente después de ejecutar la edición (Acción 4) o registro (Acción 2):
  2. Presionar `Ctrl + F5` o `F5` para recargar por completo la página web en el navegador.
  3. Verificar que la tabla cargada por el nuevo `GET` inicial sigue mostrando el precio modificado (`135.50`).
  4. Abrir **MySQL Workbench** (o terminal MySQL) y ejecutar la consulta directa:
     ```sql
     USE ricar_autoboutique;
     SELECT id, nombre, precio, stock FROM producto WHERE id = 1;
     ```
* **Evidencia Observable:**
  - El registro en MySQL refleja el nuevo valor (`135.50`), evidenciando que Hibernate sincronizó los cambios en el disco y la persistencia relacional es permanente.

---

#### 🟢 Acción N.° 7: Realizar consulta personalizada
* **Objetivo:** Evidenciar una consulta filtrada con parámetros por URL que desencadena una consulta JPQL personalizada en el repositorio Spring Data JPA.
* **Flujo Paso a Paso:**
  1. Con Network abierto en DevTools, ir a la vista de catálogo: `http://localhost:8080/productos`.
  2. En el menú lateral de categorías, hacer clic en un filtro específico (por ejemplo, **"Mantenimiento"** con ID 1 o **"Herramientas"** con ID 2).
  3. En la lista de solicitudes de DevTools, seleccionar la petición con ruta `/api/productos/categoria/1`.
* **Evidencia Observable en DevTools y Consola:**
  - En DevTools: Petición `GET /api/productos/categoria/1` con estado `200 OK`. En **Preview** se constata que solo vienen los productos asociados a dicha categoría.
  - En la consola de ejecución de Spring Boot en NetBeans/IDE se observa la sentencia JPQL ejecutada gracias a `spring.jpa.show-sql=true`:
    ```sql
    select p1_0.id, p1_0.nombre, p1_0.precio, p1_0.stock, p1_0.categoria_id 
    from producto p1_0 
    where p1_0.categoria_id = ?
    ```

---

#### 🟢 Acción N.° 8: Demostrar transacción
* **Objetivo:** Demostrar una operación transaccional completa (`@Transactional`) explicando la consistencia de datos, el decremento de stock y los mecanismos de **commit** y **rollback**.
* **Flujo Paso a Paso (Demostración de Compra):**
  1. Iniciar sesión como cliente (`carlos.rios@gmail.com` / `Carlos123`) o como administrador en rol cliente.
  2. Ir a `http://localhost:8080/productos`, seleccionar un producto y hacer clic en **Agregar al Carrito**.
  3. Abrir el modal del Carrito de Compras (ícono flotante) y presionar el botón **Finalizar Compra**.
  4. En DevTools Network observar la solicitud hacia `POST /api/compras`.
* **Explicación y Evidencia de Transaccionalidad:**
  - **Caso Éxito (COMMIT):**
    - En el método `crearCompra(...)` de `CompraService.java` anotado con `@Transactional`, se ejecutan tres operaciones consecutivas:
      1. Se verifica el stock del producto en la tabla `producto` y se descuenta la cantidad adquirida (`stock = stock - cantidad`).
      2. Se inserta el registro cabecera en la tabla `compra`.
      3. Se insertan las líneas en la tabla `detalle_compra` asociadas al ID de la compra.
    - Como no ocurrió ninguna excepción, Spring y la base de datos ejecutan automáticamente un **`COMMIT`**, persistiendo las tres tablas de forma coherente y devolviendo `200 OK` en DevTools.
  - **Caso Fallo (ROLLBACK):**
    - Si un cliente intenta enviar una compra solicitando una cantidad superior a las existencias reales (ej. solicita 100 unidades cuando el stock es 10), el servicio lanza deliberadamente una excepción: `throw new RuntimeException("Stock insuficiente para el producto...")`.
    - Al dispararse la excepción en el contexto transaccional, Spring ejecuta un **`ROLLBACK`** inmediato: se anula el descuento de inventario, no se crea la compra ni los detalles huérfanos, y el cliente recibe un error controlado (código `400 Bad Request`), garantizando la integridad referencial y consistencia de los datos.

---

#### 🟢 Acción N.° 9: Iniciar sesión
* **Objetivo:** Evidenciar el proceso de autenticación mediante el endpoint `POST /login`, observando el envío de credenciales y la recepción del token JWT con sus atributos.
* **Flujo Paso a Paso:**
  1. Con DevTools abierto en la pestaña **Network** (filtro **Fetch/XHR**), hacer clic en el botón **Iniciar Sesión** del Navbar.
  2. Ingresar las credenciales de prueba:
     - **Email:** `admin@gmail.com`
     - **Contraseña:** `Admin1234`
  3. Hacer clic en el botón de confirmación **Ingresar**.
* **Evidencia Observable en DevTools:**
  - En Network aparece la solicitud: `login` (URL: `http://localhost:8080/login`).
  - **Headers:** Muestra `Request Method: POST` y `Status Code: 200 OK`.
  - **Payload:** Form-data con `email: admin@gmail.com` y `password: Admin1234`.
  - **Response / Preview:** Se evidencia la respuesta JSON emitida por `successHandler()` de `ConfigSecurity.java`:
    ```json
    {
      "id": 2,
      "nombres": "Jose Admin",
      "apellidos": "Carranza Mendoza",
      "email": "admin@gmail.com",
      "telefono": "999111222",
      "ciudad": "Trujillo",
      "rol": "administrador",
      "roles": ["cliente", "administrador"],
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkBnbWFpbC5jb20iLCJyb2xlcyI6WyJjbGllbnRlIiwiYWRtaW5pc3RyYWRvciJdLCJleHAiOjE3NjA3MzY4MDB9.s7...",
      "tokenType": "Bearer",
      "expiresIn": 1200
    }
    ```
  - **Response Headers:** Se evidencia el encabezado `Set-Cookie: access_token=eyJhbGci...; Path=/; Max-Age=1200; SameSite=Lax`, garantizando 20 minutos de vigencia de la sesión en el navegador.

---

#### 🟢 Acción N.° 10: Acceder con token Bearer
* **Objetivo:** Evidenciar que las solicitudes hacia recursos protegidos incluyen el encabezado estándar `Authorization: Bearer <token>`, ocultando o difuminando parte del valor para proteger la credencial al exponer.
* **Flujo Paso a Paso:**
  1. Estando autenticado como administrador o gerente, dirigirse al panel de administración: `http://localhost:8080/panel/administrador/2/gestion/clientes` o consultar citas `/panel/administrador/2/reservas/citas`.
  2. En DevTools Network, seleccionar la petición de datos correspondiente: `GET /api/usuarios` o `GET /api/citas`.
  3. En el panel lateral, seleccionar la pestaña **Headers** y desplazarse hasta la sección **Request Headers** (Encabezados de la solicitud).
* **Evidencia Observable en DevTools:**
  - Se visualiza el encabezado de autorización:
    ```http
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1p...[VALOR PROTEGIDO/OCULTO]...
    ```
  - *Recomendación para la exposición docente:* Al mostrar la pantalla, se resalta la presencia de la palabra clave `Bearer` y el inicio del token JWT (`eyJ...`), cubriendo la sección central del hash para demostrar el cumplimiento estricto del estándar RFC 6750 y buenas prácticas de seguridad.

---

#### 🟢 Acción N.° 11: Probar token ausente o inválido
* **Objetivo:** Demostrar que cualquier intento de acceder a un recurso protegido sin token o con un token manipulado/expirado es rechazado con el código de error HTTP `401 Unauthorized` en formato JSON estructurado.
* **Flujo Paso a Paso (Demostración Práctica):**
  - **Opción A (Ventana de incógnito sin sesión):**
    1. Abrir una nueva ventana de navegación en modo Incógnito (`Ctrl + Shift + N`) donde no existen cookies ni sesiones guardadas.
    2. Abrir DevTools (`F12`), seleccionar la pestaña **Network**.
    3. Pegar directamente en la barra de direcciones la URL de un recurso protegido:
       `http://localhost:8080/api/usuarios`
    4. Presionar Enter.
  - **Opción B (Desde la Consola de DevTools con token falso):**
    1. En cualquier pestaña del navegador, abrir la consola de DevTools (`F12` > pestaña **Console**) y ejecutar:
       ```javascript
       fetch('/api/usuarios', {
         headers: { 'Authorization': 'Bearer TOKEN_FALSO_O_MANIPULADO' }
       }).then(res => res.json()).then(data => console.log('Respuesta:', data));
       ```
* **Evidencia Observable en DevTools:**
  - En la pestaña **Network** la solicitud aparece en color rojo con:
    - **Status Code:** `401 Unauthorized`
  - En la pestaña **Response / Preview** se observa el JSON emitido por `authenticationEntryPoint()` en `ConfigSecurity.java`:
    ```json
    {
      "status": 401,
      "error": "Unauthorized",
      "message": "Se requiere autenticación válida para acceder a este recurso"
    }
    ```

---

#### 🟢 Acción N.° 12: Probar rol sin permiso
* **Objetivo:** Demostrar que un usuario autenticado legítimamente, pero que no cuenta con la autoridad o rol requerido para un endpoint determinado, es bloqueado con el código de error HTTP `403 Forbidden` en formato JSON estructurado.
* **Flujo Paso a Paso (Demostración Práctica):**
  1. Iniciar sesión con una cuenta que posea **únicamente el rol de cliente** (por ejemplo, `carlos.rios@gmail.com` / `Carlos123`).
  2. Verificar en el Navbar que el usuario actual se encuentra en el rol de Cliente.
  3. Abrir DevTools (`F12`), ir a la pestaña **Network**.
  4. Intentar realizar una acción administrativa restringida que solo un `administrador` puede ejecutar (por ejemplo, eliminar un usuario o producto).
  5. En la consola de DevTools (pestaña **Console**), ejecutar la siguiente petición con el token activo del cliente:
     ```javascript
     fetch('/api/usuarios/1', {
       method: 'DELETE'
     }).then(res => res.json()).then(data => console.log('Respuesta 403:', data));
     ```
     *(O alternativamente, escribir en la barra de direcciones la ruta: `http://localhost:8080/panel/administrador/1/gestion/usuarios`).*
* **Evidencia Observable en DevTools:**
  - En la pestaña **Network** la petición registra:
    - **Status Code:** `403 Forbidden`
  - En la pestaña **Response / Preview** se evidencia la respuesta JSON emitida por `accessDeniedHandler()` en `ConfigSecurity.java`:
    ```json
    {
      "status": 403,
      "error": "Forbidden",
      "message": "No tienes permisos para acceder a este recurso"
    }
    ```
  - Se comprueba que el sistema no rompe la sesión del usuario ni lo desloguea, sino que protege el recurso denegando el acceso de forma controlada y segura.

---

## 🚀 6. Guía Rápida de Ejecución del Proyecto

1. **Requisitos Previos:**
   - Java Development Kit (**JDK 25** o superior).
   - Servidor **MySQL 8.x** en ejecución en `localhost:3306`.
   - IDE recomendado: **NetBeans 21+**, **IntelliJ IDEA** o **VS Code**.
2. **Inicialización de la Base de Datos:**
   - Abrir y ejecutar el script `web/src/main/resources/data/mecatools.sql` en MySQL para crear el esquema `ricar_autoboutique`.
3. **Compilación y Ejecución:**
   - En NetBeans: Hacer clic derecho en el proyecto `web` > **Clean and Build** (`Shift + F11`), luego **Run** (`F6`) sobre `WebApplication.java`.
   - O vía terminal con Maven Wrapper:
     ```bash
     cd web
     ./mvnw spring-boot:run
     ```
4. **Acceso al Sistema:**
   - Navegar en el navegador a: `http://localhost:8080/inicio`.
   - **Usuarios de prueba preconfigurados:**
     - **Administrador:** `admin@gmail.com` / `Admin1234`
     - **Gerente:** `gerente@gmail.com` / `Gerente123`
     - **Cliente:** `carlos.rios@gmail.com` / `Carlos123`
