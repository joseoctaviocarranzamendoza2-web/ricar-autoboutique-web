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
