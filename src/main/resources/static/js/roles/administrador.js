// Endpoints de la API usados por el panel de administrador
const API = { categorias: '/api/categorias', productos: '/api/productos', servicios: '/api/servicios', citas: '/api/citas', usuarios: '/api/usuarios', compras: '/api/compras' };

// Estado local en memoria: arrays cache y variables de edición
let categorias = [];
let productos = [];
let productoEdit = null;
let categoriaEdit = null;
let servicioEdit = null;
let _todasCitas = [];
let _todosClientes = [];
let _todasCompras = [];
let _paginaClientesActual = 1;
const CLIENTES_POR_PAGINA = 10;

// Inicialización al cargar la vista de administrador: valida sesión y carga datos
document.addEventListener('DOMContentLoaded', async () => {
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== 'administrador') {
        window.location.href = '/inicio';
        return;
    }
    const avatar = document.getElementById('adminNombreAvatar');
    const menu = document.getElementById('adminNombreMenu');
    const iniciales = (sesion.nombres[0] + (sesion.apellidos?.[0] || '')).toUpperCase();
    if (avatar) avatar.textContent = iniciales;
    if (menu) menu.textContent = sesion.nombres + ' ' + (sesion.apellidos || '');
    await cargarCategorias();
    await cargarProductos();
    await cargarCitas();
    await cargarClientes();
});

// Mapa entre nombre de sección y su URL real en el backend
const MAPA_SECCION_URL = {
    citas: 'reservas/citas',
    productos: 'catalogo/productos',
    servicios: 'catalogo/servicios',
    categorias: 'catalogo/categorias',
    clientes: 'gestion/clientes'
};

// Muestra la sección seleccionada en la UI y carga sus datos si es necesario. Actualiza la URL sin recargar la página.
function mostrarSeccion(nombre, link) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    const sec = document.getElementById('sec-' + nombre);
    if (sec) sec.classList.add('active');
    const linkActivo = link || document.querySelector(`[data-seccion="${nombre}"]`);
    if (linkActivo) linkActivo.classList.add('active');
    if (nombre === 'productos') cargarProductos();
    if (nombre === 'categorias') cargarCategorias();
    if (nombre === 'servicios') cargarServicios();
    if (nombre === 'citas') cargarCitas();
    if (nombre === 'clientes') cargarClientes();
    // Sincroniza la URL sin recargar la página
    const sesion = obtenerSesion();
    const segmento = MAPA_SECCION_URL[nombre];
    if (sesion && segmento) {
        history.pushState({ seccion: nombre }, '', `/panel/administrador/${sesion.id}/${segmento}`);
    }
}

// Alterna la visibilidad/estado del sidebar. Soporta comportamiento móvil y desktop
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const topbar = document.getElementById('topbar');
    const mainContent = document.getElementById('mainContent');
    const overlay = document.getElementById('sidebarOverlay');
    const isMobile = window.matchMedia('(max-width: 991px)').matches;
    if (isMobile) {
        sidebar.classList.toggle('mobile-open');
        overlay?.classList.toggle('show');
    } else {
        sidebar.classList.toggle('collapsed');
        topbar.classList.toggle('collapsed');
        mainContent.classList.toggle('collapsed');
    }
}

// Cierra el sidebar en vista móvil
function cerrarSidebarMobile() {
    document.getElementById('sidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebarOverlay')?.classList.remove('show');
}

// Cierra la sesión del administrador (wrapper a la función global cerrarSesion)
function cerrarSesionAdmin() {
    cerrarSesion();
}

// Carga categorías desde la API y actualiza la vista correspondiente
async function cargarCategorias() {
    try {
        const resp = await fetch(API.categorias);
        categorias = await resp.json();
        renderCategorias();
        actualizarSelectCategorias();
    } catch (e) {
        console.error('Error cargando categorías:', e);
    }
}

// Carga productos desde la API y renderiza la cuadrícula de administración
async function cargarProductos() {
    try {
        const resp = await fetch(API.productos);
        productos = await resp.json();
        renderProductos(productos);
        if (categorias.length > 0) {
            renderCategorias();
        }
    } catch (e) {
        console.error('Error cargando productos:', e);
    }
}

// Renderiza tarjetas de categorías en el dashboard del admin
function renderCategorias() {
    const grid = document.getElementById('gridCategorias');
    if (!grid) return;
    const contador = document.getElementById('infoCategorias');
    if (contador) contador.textContent = `${categorias.length} categorías activas`;
    const iconos = {
        'herramienta': 'bi-wrench-adjustable', 'repuesto': 'bi-cpu', 'aceite': 'bi-droplet-half', 'perno': 'bi-nut', 'filtro': 'bi-funnel'
    };
    const colores = ['blue', 'green', 'orange', 'cyan', 'purple'];
    if (categorias.length === 0) {
        grid.innerHTML = `<div class="col-12 text-center py-5 text-muted"><i class="bi bi-tag display-4 d-block mb-3"></i>No hay categorías. Crea la primera.</div>`;
        return;
    }
    grid.innerHTML = categorias.map((cat, i) => {
        const key = cat.nombre.toLowerCase();
        const iconKey = Object.keys(iconos).find(k => key.includes(k));
        const icono = iconKey ? iconos[iconKey] : 'bi-tag';
        const color = colores[i % colores.length];
        const total = productos.filter(p => p.categoria?.id === cat.id).length;
        return `<div class="col-sm-6 col-lg-3 d-flex">
            <div class="admin-card category-card p-4 text-center h-100 d-flex flex-column">
                <div class="kpi-icon ${color} mx-auto mb-3" style="width:52px;height:52px;font-size:1.4rem;"><i class="bi ${icono}"></i></div>
                <h6 class="fw-bold">${cat.nombre}</h6>
                <div class="text-primary fw-bold fs-5">${total}</div>
                <small class="text-muted">productos</small>
                <p class="category-description text-muted small mt-1 mb-2">${cat.descripcion || ''}</p>
                <div class="d-flex justify-content-center gap-2 mt-3 card-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="abrirEditarCategoria(${cat.id})"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarCategoria(${cat.id}, '${cat.nombre.replace(/'/g, "\\'")}')"> <i class="bi bi-trash"></i></button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// Actualiza selects relacionados con categorías (producto y filtro)
function actualizarSelectCategorias() {
    const selectProd = document.getElementById('prodCategoria');
    if (selectProd) {
        selectProd.innerHTML = '<option value="">Seleccionar...</option>' + categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    }
    const selectFiltro = document.getElementById('filterCategoria');
    if (selectFiltro) {
        selectFiltro.innerHTML = '<option value="">Todas las categorías</option>' + categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    }
}

// Abre modal para crear una nueva categoría
function abrirNuevaCategoria() {
    categoriaEdit = null;
    document.getElementById('catNombre').value = '';
    document.getElementById('catDescripcion').value = '';
    document.getElementById('modalCategoriaTitulo').textContent = 'Nueva Categoría';
    new bootstrap.Modal(document.getElementById('modalCategoria')).show();
}

// Abre modal para editar una categoría existente y precarga sus datos
function abrirEditarCategoria(id) {
    const cat = categorias.find(c => c.id === id);
    if (!cat) return;
    categoriaEdit = id;
    document.getElementById('catNombre').value = cat.nombre;
    document.getElementById('catDescripcion').value = cat.descripcion || '';
    document.getElementById('modalCategoriaTitulo').textContent = 'Editar Categoría';
    new bootstrap.Modal(document.getElementById('modalCategoria')).show();
}

// Crea o actualiza una categoría mediante la API
async function guardarCategoria() {
    const nombre = document.getElementById('catNombre').value.trim();
    const descripcion = document.getElementById('catDescripcion').value.trim();
    if (!nombre) {
        mostrarToast('El nombre es obligatorio', 'error');
        return;
    }
    const body = { nombre, descripcion };
    const url = categoriaEdit ? `${API.categorias}/${categoriaEdit}` : API.categorias;
    const method = categoriaEdit ? 'PUT' : 'POST';
    try {
        const resp = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (resp.status === 409) {
            mostrarToast('Ya existe una categoría con ese nombre', 'error');
            return;
        }
        if (!resp.ok) {
            const err = await resp.json();
            mostrarToast(err.error || 'Error al guardar', 'error');
            return;
        }
        bootstrap.Modal.getInstance(document.getElementById('modalCategoria'))?.hide();
        mostrarToast(categoriaEdit ? 'Categoría actualizada' : 'Categoría creada', 'success');
        await cargarCategorias();
    } catch (e) {
        mostrarToast('Error de conexión', 'error');
    }
}

// Solicita confirmación y elimina una categoría por id
async function eliminarCategoria(id, nombre) {
    document.getElementById('nombreEliminar').textContent = `¿Eliminar la categoría "${nombre}"? Sus productos también serán afectados.`;
    document.getElementById('btnConfirmarEliminar').onclick = async () => {
        try {
            const resp = await fetch(`${API.categorias}/${id}`, { method: 'DELETE' });
            if (!resp.ok) {
                mostrarToast('No se pudo eliminar', 'error');
                return;
            }
            bootstrap.Modal.getInstance(document.getElementById('modalEliminar'))?.hide();
            mostrarToast('Categoría eliminada', 'success');
            await cargarCategorias();
        } catch (e) {
            mostrarToast('Error de conexión', 'error');
        }
    };
    new bootstrap.Modal(document.getElementById('modalEliminar')).show();
}

// Renderiza la lista de productos para la vista de administrador
function renderProductos(productos) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    const bajo = productos.filter(p => p.stock <= 5).length;
    const info = document.getElementById('infoProductos');
    if (info) info.textContent = `${productos.length} productos · ${bajo} con stock bajo`;
    if (productos.length === 0) {
        grid.innerHTML = `<div class="col-12 text-center py-5 text-muted"><i class="bi bi-box-seam display-4 d-block mb-3"></i>No hay productos. Crea el primero.</div>`;
        return;
    }
    grid.innerHTML = productos.map(p => {
        const stockClass = p.stock <= 5 ? 'text-danger' : 'text-muted';
        const badgeClass = p.stock <= 5 ? 'bg-danger' : 'bg-primary';
        const badgeTxt = p.stock <= 5 ? 'Stock bajo' : (p.etiqueta || '');
        return `<div class="col-6 col-md-4 col-xl-3 prod-item">
            <div class="product-admin-card h-100">
                <div class="product-img-box">
                    ${p.imagen ? `<img src="${p.imagen}" alt="${p.nombre}" style="width:100%;height:100%;object-fit:cover;">` : `<i class="bi bi-box-seam product-icon"></i>`}
                    ${badgeTxt ? `<span class="badge ${badgeClass} badge-new">${badgeTxt}</span>` : ''}
                </div>
                <div class="product-admin-body">
                    <p class="product-category">${p.categoria?.nombre || 'Sin categoría'}</p>
                    <div class="product-name mb-1">${p.nombre}</div>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="product-price">S/ ${p.precio.toFixed(2)}</span>
                    </div>
                    <small class="${stockClass}">Stock: <strong>${p.stock}</strong> unidades</small>
                </div>
                <div class="product-admin-actions">
                    <button class="btn btn-sm btn-outline-primary flex-fill" onclick="abrirEditarProducto(${p.id})"><i class="bi bi-pencil me-1"></i>Editar</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="confirmarEliminarProducto(${p.id},'${p.nombre.replace(/'/g, "\\'")}')"><i class="bi bi-trash"></i></button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// Prepara y abre el modal para crear un nuevo producto
function abrirNuevoProducto() {
    if (categorias.length === 0) {
        mostrarToast('Crea al menos una categoría antes de agregar productos', 'error');
        return;
    }
    productoEdit = null;
    document.getElementById('modalProductoTitulo').textContent = 'Nuevo Producto';
    document.getElementById('formProducto').reset();
    document.getElementById('prodCategoria').value = '';
    new bootstrap.Modal(document.getElementById('modalProducto')).show();
}

// Carga un producto por id y abre el modal en modo edición
async function abrirEditarProducto(id) {
    try {
        const resp = await fetch(`${API.productos}/${id}`);
        const producto = await resp.json();
        productoEdit = id;
        document.getElementById('modalProductoTitulo').textContent = 'Editar Producto';
        document.getElementById('prodNombre').value = producto.nombre;
        document.getElementById('prodPrecio').value = producto.precio;
        document.getElementById('prodStock').value = producto.stock;
        document.getElementById('prodDescripcion').value = producto.descripcion || '';
        document.getElementById('prodEtiqueta').value = producto.etiqueta || '';
        document.getElementById('prodImagen').value = producto.imagen || '';
        if (producto.categoria && producto.categoria.id) {
            document.getElementById('prodCategoria').value = String(producto.categoria.id);
        } else {
            document.getElementById('prodCategoria').value = '';
        }
        new bootstrap.Modal(document.getElementById('modalProducto')).show();
    } catch (e) {
        mostrarToast('Error al cargar el producto', 'error');
    }
}

// Guarda (POST/PUT) un producto usando los campos del formulario
async function guardarProducto() {
    const nombre = document.getElementById('prodNombre').value.trim();
    const precio = parseFloat(document.getElementById('prodPrecio').value);
    const stock = parseInt(document.getElementById('prodStock').value);
    const descripcion = document.getElementById('prodDescripcion').value.trim();
    const etiqueta = document.getElementById('prodEtiqueta').value;
    const imagen = document.getElementById('prodImagen').value.trim();
    const catId = document.getElementById('prodCategoria').value;
    if (!nombre || isNaN(precio) || isNaN(stock) || !catId) {
        mostrarToast('Completa todos los campos obligatorios, incluyendo la categoría', 'error');
        return;
    }
    const body = {
        nombre, precio, stock, descripcion, etiqueta, imagen, categoria: { id: parseInt(catId) }
    };
    const url = productoEdit ? `${API.productos}/${productoEdit}` : API.productos;
    const method = productoEdit ? 'PUT' : 'POST';
    try {
        const resp = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!resp.ok) {
            const err = await resp.json();
            mostrarToast(err.error || 'Error al guardar', 'error');
            return;
        }
        bootstrap.Modal.getInstance(document.getElementById('modalProducto'))?.hide();
        mostrarToast(productoEdit ? 'Producto actualizado' : 'Producto creado', 'success');
        await cargarProductos();
    } catch (e) {
        mostrarToast('Error de conexión', 'error');
    }
}

// Pide confirmación para eliminar un producto y lo elimina si confirma
function confirmarEliminarProducto(id, nombre) {
    document.getElementById('nombreEliminar').textContent = `¿Eliminar el producto "${nombre}"? Esta acción no se puede deshacer.`;
    document.getElementById('btnConfirmarEliminar').onclick = async () => {
        try {
            const resp = await fetch(`${API.productos}/${id}`, { method: 'DELETE' });
            if (!resp.ok) {
                mostrarToast('No se pudo eliminar', 'error');
                return;
            }
            bootstrap.Modal.getInstance(document.getElementById('modalEliminar'))?.hide();
            mostrarToast('Producto eliminado', 'success');
            await cargarProductos();
        } catch (e) {
            mostrarToast('Error de conexión', 'error');
        }
    };
    new bootstrap.Modal(document.getElementById('modalEliminar')).show();
}

// Filtra la grilla de productos por búsqueda, categoría y estado
function filtrarProductos() {
    const busqueda = (document.getElementById('searchProducto')?.value || '').toLowerCase();
    const catFiltro = document.getElementById('filterCategoria')?.value || '';
    const estadoFiltro = document.getElementById('filterEstado')?.value || '';
    document.querySelectorAll('#productGrid .prod-item').forEach(item => {
        const nombre = item.querySelector('.product-name')?.textContent.toLowerCase() || '';
        const cat = item.querySelector('.product-category')?.textContent.trim() || '';
        const stockTxt = item.querySelector('small strong')?.textContent || '999';
        const stock = parseInt(stockTxt);
        const matchBusq = nombre.includes(busqueda);
        const matchCat = !catFiltro || categorias.find(c => String(c.id) === catFiltro && cat.includes(c.nombre));
        const matchEstado = estadoFiltro !== 'low' || stock <= 5;
        item.style.display = (matchBusq && matchCat && matchEstado) ? '' : 'none';
    });
}

// Cambia el modo de vista de productos (grid / list)
function setVista(tipo) {
    const grid = document.getElementById('productGrid');
    const btnGrid = document.getElementById('btnGrid');
    const btnList = document.getElementById('btnList');
    if (!grid) return;
    if (tipo === 'list') {
        grid.classList.remove('row-cols-2', 'row-cols-md-3', 'row-cols-xl-4');
        grid.classList.add('row-cols-1');
        btnList?.classList.add('active');
        btnGrid?.classList.remove('active');
    } else {
        grid.classList.remove('row-cols-1');
        grid.classList.add('row-cols-2', 'row-cols-md-3', 'row-cols-xl-4');
        btnGrid?.classList.add('active');
        btnList?.classList.remove('active');
    }
}

// Carga servicios desde la API y renderiza
async function cargarServicios() {
    try {
        const resp = await fetch(API.servicios);
        const servicios = await resp.json();
        renderServicios(servicios);
    } catch (e) {
        console.error('Error cargando servicios:', e);
    }
}

// Renderiza tarjetas de servicios en el panel de admin
function renderServicios(servicios) {
    const grid = document.getElementById('gridServicios');
    if (!grid) return;
    const iconos = { 'aceite': 'bi-droplet-fill', 'eléctric': 'bi-battery-charging', 'manten': 'bi-gear-fill', 'diagnós': 'bi-speedometer2', 'alineac': 'bi-arrows-angle-expand', 'freno': 'bi-shield-check', 'aire': 'bi-wind', 'combustible': 'bi-fuel-pump-fill', 'refriger': 'bi-thermometer-half', 'motor': 'bi-wrench-adjustable', 'revisión': 'bi-car-front-fill' };
    const cards = servicios.map(s => {
        const key = s.nombre.toLowerCase();
        const iconKey = Object.keys(iconos).find(k => key.includes(k));
        const icono = iconKey ? iconos[iconKey] : 'bi-gear-fill';
        const badge = s.estado === 'Activo' ? 'status-active' : 'status-inactive';
        return `<div class="col-sm-6 col-xl-4 d-flex">
            <div class="service-admin-card h-100 d-flex flex-column">
                <div class="d-flex align-items-start gap-3 mb-3">
                    <div class="service-icon"><i class="bi ${icono}"></i></div>
                    <div class="flex-grow-1">
                        <h6 class="fw-bold mb-0">${s.nombre}</h6>
                        <small class="text-muted">${s.categoria || ''}</small>
                    </div>
                    <span class="status-badge ${badge}">${s.estado}</span>
                </div>
                <p class="text-muted small mb-3 flex-grow-1">${s.descripcion || 'Sin descripción.'}</p>
                <div class="d-flex justify-content-between mb-3">
                    <div><small class="text-muted d-block">Precio base</small><strong class="text-primary">S/ ${s.precioBase.toFixed(2)}</strong></div>
                    <div><small class="text-muted d-block">Duración</small><strong>${s.duracionMinutos} min</strong></div>
                </div>
                <div class="d-flex gap-2 card-actions">
                    <button class="btn btn-sm btn-outline-primary flex-fill" onclick="abrirEditarServicio(${s.id})"><i class="bi bi-pencil me-1"></i>Editar</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="confirmarEliminarServicio(${s.id},'${s.nombre.replace(/'/g, "\\'")}')"><i class="bi bi-trash"></i></button>
                </div>
            </div>
        </div>`;
    }).join('');
    const cardNuevo = `<div class="col-sm-6 col-xl-4">
        <div class="service-admin-card h-100 d-flex flex-column align-items-center justify-content-center text-center" style="border-style:dashed;cursor:pointer;" onclick="abrirNuevoServicio()">
            <div class="service-icon mb-3" style="width:56px;height:56px;font-size:1.5rem;"><i class="bi bi-plus-lg"></i></div>
            <h6 class="fw-bold text-primary">Agregar Servicio</h6>
            <small class="text-muted">Crea un nuevo tipo de servicio</small>
        </div>
    </div>`;
    grid.innerHTML = cards + cardNuevo;
}

// Abre modal para crear un nuevo servicio
function abrirNuevoServicio() {
    servicioEdit = null;
    document.getElementById('modalServicioTitulo').textContent = 'Nuevo Servicio';
    document.getElementById('formServicio').reset();
    new bootstrap.Modal(document.getElementById('modalServicio')).show();
}

// Carga datos de un servicio y abre modal en modo edición
async function abrirEditarServicio(id) {
    try {
        const resp = await fetch(`${API.servicios}/${id}`);
        if (!resp.ok) {
            throw new Error('Servicio no encontrado');
        }
        const servicio = await resp.json();
        if (!servicio || !servicio.id) {
            throw new Error('Datos de servicio inválidos');
        }
        servicioEdit = id;
        document.getElementById('modalServicioTitulo').textContent = 'Editar Servicio';
        document.getElementById('servNombre').value = servicio.nombre || '';
        document.getElementById('servCategoria').value = servicio.categoria || '';
        document.getElementById('servPrecio').value = servicio.precioBase ?? '';
        document.getElementById('servDuracion').value = servicio.duracionMinutos ?? '';
        document.getElementById('servDescripcion').value = servicio.descripcion || '';
        document.getElementById('servEstado').value = servicio.estado || '';
        new bootstrap.Modal(document.getElementById('modalServicio')).show();
    } catch (e) {
        console.error(e);
        mostrarToast('Error al cargar el servicio', 'error');
    }
}

// Crea o actualiza un servicio via API
async function guardarServicio() {
    const nombre = document.getElementById('servNombre').value.trim();
    const categoria = document.getElementById('servCategoria').value.trim();
    const precio = parseFloat(document.getElementById('servPrecio').value);
    const duracion = parseInt(document.getElementById('servDuracion').value);
    const desc = document.getElementById('servDescripcion').value.trim();
    const estado = document.getElementById('servEstado').value;
    if (!nombre || isNaN(precio) || isNaN(duracion)) {
        mostrarToast('Completa los campos obligatorios', 'error');
        return;
    }
    const body = { nombre, categoria, precioBase: precio, duracionMinutos: duracion, descripcion: desc, estado };
    const url = servicioEdit ? `${API.servicios}/${servicioEdit}` : API.servicios;
    const method = servicioEdit ? 'PUT' : 'POST';
    try {
        const resp = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!resp.ok) {
            const err = await resp.json();
            mostrarToast(err.error || 'Error al guardar', 'error');
            return;
        }
        bootstrap.Modal.getInstance(document.getElementById('modalServicio'))?.hide();
        mostrarToast(servicioEdit ? 'Servicio actualizado' : 'Servicio creado', 'success');
        await cargarServicios();
    } catch (e) {
        mostrarToast('Error de conexión', 'error');
    }
}

// Confirma y elimina un servicio
async function confirmarEliminarServicio(id, nombre) {
    document.getElementById('nombreEliminar').textContent = `¿Eliminar el servicio "${nombre}"?`;
    document.getElementById('btnConfirmarEliminar').onclick = async () => {
        try {
            await fetch(`${API.servicios}/${id}`, { method: 'DELETE' });
            bootstrap.Modal.getInstance(document.getElementById('modalEliminar'))?.hide();
            mostrarToast('Servicio eliminado', 'success');
            await cargarServicios();
        } catch (e) {
            mostrarToast('Error de conexión', 'error');
        }
    };
    new bootstrap.Modal(document.getElementById('modalEliminar')).show();
}

// Carga todas las citas y actualiza la tabla y KPI's
async function cargarCitas() {
    try {
        const resp = await fetch(API.citas);
        _todasCitas = await resp.json();
        renderCitas(_todasCitas);
        actualizarKPIsCitas(_todasCitas);
    } catch (e) {
        console.error('Error cargando citas:', e);
    }
}

// Calcula y actualiza KPIs de citas (pendientes, confirmadas, completadas, canceladas)
function actualizarKPIsCitas(citas) {
    const pendientes = citas.filter(c => c.estado === 'Pendiente').length;
    const confirmadas = citas.filter(c => c.estado === 'Confirmada').length;
    const completadas = citas.filter(c => c.estado === 'Completada').length;
    const canceladas = citas.filter(c => c.estado === 'Cancelada').length;
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    set('kpiPendientes', pendientes);
    set('kpiConfirmadas', confirmadas);
    set('kpiCompletadas', completadas);
    set('kpiCanceladas', canceladas);
    const badge = document.getElementById('badgePendientes');
    if (badge) badge.textContent = pendientes > 0 ? pendientes : '';
    const info = document.getElementById('infoCitas');
    if (info) info.textContent = `${pendientes} pendientes de confirmar`;
}

// Renderiza la tabla de citas con acciones condicionales según estado
function renderCitas(citas) {
    const tbody = document.getElementById('tablaCitas');
    if (!tbody) return;
    if (citas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No hay citas registradas</td></tr>`;
        return;
    }
    const estadoBadge = { 'Pendiente': 'status-pending', 'Confirmada': 'status-confirmed', 'Completada': 'status-completed', 'Cancelada': 'status-inactive' };
    tbody.innerHTML = citas.map(c => `
    <tr>
        <td class="text-muted">#C-${String(c.id).padStart(3, '0')}</td>
        <td>
            <div class="fw-semibold">${c.usuario?.nombres || ''} ${c.usuario?.apellidos || ''}</div>
            <div class="text-muted" style="font-size:.72rem">${c.usuario?.telefono || ''}</div>
        </td>
        <td>${c.servicio?.nombre || c.servicio || ''}</td>
        <td><div>${c.hora || ''}</div><small class="text-muted">${c.fecha || ''}</small></td>
        <td><small>${c.vehiculo || ''}</small></td>
        <td><span class="status-badge ${estadoBadge[c.estado] || ''}">${c.estado}</span></td>
        <td>
            <div class="d-flex gap-1">
                ${c.estado === 'Pendiente' ? ` <button class="btn btn-xs btn-outline-success accion-btn" title="Confirmar" onclick="cambiarEstadoCita(${c.id},'Confirmada')"><i class="bi bi-check-circle"></i></button>` : ''}
                ${c.estado === 'Confirmada' ? ` <button class="btn btn-xs btn-outline-success accion-btn" title="Marcar como completada" onclick="cambiarEstadoCita(${c.id},'Completada')"><i class="bi bi-check2-all"></i></button>` : ''}
                ${c.estado !== 'Cancelada' && c.estado !== 'Completada' ? ` <button class="btn btn-xs btn-outline-danger accion-btn" title="Cancelar" onclick="cambiarEstadoCita(${c.id},'Cancelada')"><i class="bi bi-x"></i></button>` : ''}
            </div>
        </td>
    </tr>`).join('');
}

// Cambia el estado de una cita mediante API y recarga la lista
async function cambiarEstadoCita(id, nuevoEstado) {
    try {
        const resp = await fetch(`${API.citas}/${id}/estado`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: nuevoEstado }) });
        if (!resp.ok) {
            mostrarToast('Error al actualizar la cita', 'error');
            return;
        }
        mostrarToast(`Cita marcada como ${nuevoEstado}`, 'success');
        await cargarCitas();
    } catch (e) {
        mostrarToast('Error de conexión', 'error');
    }
}

// Filtra las citas mostradas en la tabla por búsqueda, estado y fecha
function filtrarCitasTabla() {
    const busqueda = (document.getElementById('filtroCitas')?.value || '').toLowerCase();
    const estadoFiltro = document.getElementById('filtroEstadoCita')?.value || '';
    const fechaFiltro = document.getElementById('filtroFechaCita')?.value || '';
    const filtradas = _todasCitas.filter(c => {
        const cliente = `${c.usuario?.nombres || ''} ${c.usuario?.apellidos || ''}`.toLowerCase();
        const servicio = (c.servicio?.nombre || '').toLowerCase();
        const matchBusq = !busqueda || cliente.includes(busqueda) || servicio.includes(busqueda);
        const matchEstado = !estadoFiltro || c.estado === estadoFiltro;
        const matchFecha = !fechaFiltro || String(c.fecha) === fechaFiltro;
        return matchBusq && matchEstado && matchFecha;
    });
    renderCitas(filtradas);
    const info = document.getElementById('infoPaginacionCitas');
    if (info) info.textContent = `Mostrando ${filtradas.length} de ${_todasCitas.length} citas`;
}

// Limpia los filtros de la tabla de citas y restaura la vista completa
function limpiarFiltrosCitas() {
    const f1 = document.getElementById('filtroCitas');
    const f2 = document.getElementById('filtroEstadoCita');
    const f3 = document.getElementById('filtroFechaCita');
    if (f1) f1.value = '';
    if (f2) f2.value = '';
    if (f3) f3.value = '';
    renderCitas(_todasCitas);
    const info = document.getElementById('infoPaginacionCitas');
    if (info) info.textContent = `Mostrando todas las citas`;
}

// Carga todos los usuarios (clientes) y las compras asociadas
async function cargarClientes() {
    try {
        const resp = await fetch(API.usuarios);
        _todosClientes = await resp.json();
        const respCompras = await fetch(API.compras);
        _todasCompras = respCompras.ok ? await respCompras.json() : [];
        _paginaClientesActual = 1;
        renderClientes(_todosClientes);
    } catch (e) {
        console.error('Error cargando clientes:', e);
    }
}

// Calcula el gasto total de un cliente (compras entregadas + citas completadas)
function calcularGastoCliente(idCliente) {
    const gastoCompras = _todasCompras.filter(c => c.usuario?.id === idCliente && c.estado === 'Entregado').reduce((acc, c) => acc + (c.total || 0), 0);
    const gastoCitas = _todasCitas.filter(c => c.usuario?.id === idCliente && c.servicio?.precioBase && c.estado === 'Completada').reduce((acc, c) => acc + c.servicio.precioBase, 0);
    return gastoCompras + gastoCitas;
}

// Renderiza la tabla de clientes con paginación y acciones (ver compras, eliminar)
function renderClientes(clientes) {
    const tbody = document.getElementById('tablaClientes');
    if (!tbody) return;
    const info = document.getElementById('infoClientes');
    if (info) info.textContent = `${clientes.length} clientes en total`;
    if (clientes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No hay clientes registrados</td></tr>`;
        renderPaginacionClientes(clientes);
        return;
    }
    const totalPaginas = Math.max(1, Math.ceil(clientes.length / CLIENTES_POR_PAGINA));
    if (_paginaClientesActual > totalPaginas) _paginaClientesActual = totalPaginas;
    const inicio = (_paginaClientesActual - 1) * CLIENTES_POR_PAGINA;
    const paginaClientes = clientes.slice(inicio, inicio + CLIENTES_POR_PAGINA);
    tbody.innerHTML = paginaClientes.map((c, i) => {
        const citasCliente = _todasCitas.filter(cita => cita.usuario?.id === c.id);
        const numCitas = citasCliente.length;
        const ultimaCita = citasCliente.length > 0 ? citasCliente.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))[0].fecha : '—';
        const gastoTotal = calcularGastoCliente(c.id);
        return `<tr>
            <td class="text-muted">${inicio + i + 1}</td>
            <td>
                <div class="fw-semibold">${c.nombres} ${c.apellidos}</div>
                <small class="text-muted">${c.email || ''}</small>
            </td>
            <td><small>${c.telefono || '—'}</small></td>
            <td>${numCitas}</td>
            <td>S/ ${gastoTotal.toFixed(2)}</td>
            <td><small>${ultimaCita}</small></td>
            <td><span class="status-badge status-active">Activo</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="verComprasCliente(${c.id}, '${(c.nombres + ' ' + c.apellidos).replace(/'/g, "\\'")}')"><i class="bi bi-bag"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="confirmarEliminarCliente(${c.id}, '${(c.nombres + ' ' + c.apellidos).replace(/'/g, "\\'")}')"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
    renderPaginacionClientes(clientes);
}

// Genera los controles de paginación para la lista de clientes
function renderPaginacionClientes(clientes) {
    let cont = document.getElementById('paginacionClientes');
    if (!cont) {
        const tabla = document.querySelector('#sec-clientes .admin-card');
        if (!tabla) return;
        cont = document.createElement('div');
        cont.id = 'paginacionClientes';
        cont.className = 'd-flex justify-content-end gap-2 p-3 border-top';
        tabla.appendChild(cont);
    }
    const totalPaginas = Math.max(1, Math.ceil(clientes.length / CLIENTES_POR_PAGINA));
    const maxBotones = Math.min(5, totalPaginas);
    let html = '';
    for (let i = 1; i <= maxBotones; i++) {
        const activo = i === _paginaClientesActual ? 'btn-primary' : 'btn-outline-primary';
        html += `<button class="btn btn-sm ${activo}" onclick="irAPaginaClientes(${i})">${i}</button>`;
    }
    if (totalPaginas > 5) {
        html += `<span class="align-self-center text-muted small">… ${totalPaginas} pág.</span>`;
    }
    cont.innerHTML = html || '';
}

// Navega a la página indicada en la paginación de clientes
function irAPaginaClientes(pagina) {
    _paginaClientesActual = pagina;
    const filtro = document.getElementById('searchCliente')?.value.toLowerCase() || '';
    const filtrados = filtro ? _todosClientes.filter(c => (`${c.nombres} ${c.apellidos}`.toLowerCase().includes(filtro))) : _todosClientes;
    renderClientes(filtrados);
}

// Filtra la lista completa de clientes por nombre, teléfono o email
function filtrarClientesTabla() {
    const busqueda = (document.getElementById('searchCliente')?.value || '').toLowerCase();
    const filtrados = _todosClientes.filter(c => {
        const nombre = `${c.nombres} ${c.apellidos}`.toLowerCase();
        const tel = (c.telefono || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        return nombre.includes(busqueda) || tel.includes(busqueda) || email.includes(busqueda);
    });
    _paginaClientesActual = 1;
    renderClientes(filtrados);
}

// Solicita confirmación para eliminar un cliente y maneja casos con historial
function confirmarEliminarCliente(id, nombre) {
    document.getElementById('nombreEliminar').textContent = `¿Eliminar al cliente "${nombre}"? Esta acción no se puede deshacer.`;
    document.getElementById('btnConfirmarEliminar').onclick = async () => {
        try {
            const resp = await fetch(`${API.usuarios}/${id}`, { method: 'DELETE' });
            if (resp.status === 409) {
                const data = await resp.json();
                bootstrap.Modal.getInstance(document.getElementById('modalEliminar'))?.hide();
                confirmarEliminarClienteForzado(id, nombre, data.citas, data.compras);
                return;
            }
            if (!resp.ok) {
                mostrarToast('No se pudo eliminar el cliente', 'error');
                return;
            }
            bootstrap.Modal.getInstance(document.getElementById('modalEliminar'))?.hide();
            mostrarToast('Cliente eliminado', 'success');
            await cargarClientes();
        } catch (e) {
            mostrarToast('Error de conexión', 'error');
        }
    };
    new bootstrap.Modal(document.getElementById('modalEliminar')).show();
}

// Confirmación alternativa que informa sobre historial y fuerza eliminación si procede
function confirmarEliminarClienteForzado(id, nombre, numCitas, numCompras) {
    document.getElementById('nombreEliminar').innerHTML = `El cliente "${nombre}" tiene <strong>${numCitas}</strong> cita(s) y <strong>${numCompras}</strong> compra(s) registradas.<br> Si continúas, se eliminará todo su historial junto con su cuenta. Esta acción no se puede deshacer.`;
    document.getElementById('btnConfirmarEliminar').onclick = async () => {
        try {
            const resp = await fetch(`${API.usuarios}/${id}?forzar=true`, { method: 'DELETE' });
            if (!resp.ok) {
                mostrarToast('No se pudo eliminar el cliente', 'error');
                return;
            }
            bootstrap.Modal.getInstance(document.getElementById('modalEliminar'))?.hide();
            mostrarToast('Cliente y su historial fueron eliminados', 'success');
            await cargarClientes();
        } catch (e) {
            mostrarToast('Error de conexión', 'error');
        }
    };
    new bootstrap.Modal(document.getElementById('modalEliminar')).show();
}

// Muestra el modal con el historial de compras de un cliente
function verComprasCliente(idCliente, nombre) {
    document.getElementById('nombreClienteCompras').textContent = nombre;
    const comprasCliente = _todasCompras.filter(c => c.usuario?.id === idCliente);
    renderTablaComprasCliente(comprasCliente);
    new bootstrap.Modal(document.getElementById('modalComprasCliente')).show();
}

// Renderiza tabla con las compras de un cliente y select para cambiar estado
function renderTablaComprasCliente(compras) {
    const tbody = document.getElementById('tablaComprasCliente');
    if (!tbody) return;
    if (compras.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Este cliente no tiene compras registradas</td></tr>`;
        return;
    }
    const badgeEstado = { 'Entregado': 'bg-success', 'Por entregar': 'bg-warning', 'Sin pagar': 'bg-danger' };
    tbody.innerHTML = compras.map(c => {
        const productos = (c.detalles || []).map(d => `${d.producto?.nombre || 'Prod.'} x${d.cantidad}`).join(', ') || '—';
        const claseEstado = badgeEstado[c.estado] || 'bg-secondary';
        const opciones = ['Por entregar', 'Sin pagar', 'Entregado'].map(e => `<option value="${e}" ${e === c.estado ? 'selected' : ''}>${e}</option>`).join('');
        return `<tr>
            <td class="fw-semibold">#C-${String(c.id).padStart(3, '0')}</td>
            <td><small>${productos}</small></td>
            <td class="fw-semibold text-primary">S/ ${(c.total || 0).toFixed(2)}</td>
            <td><span class="badge bg-info text-dark">${c.metodoPago || 'No especificado'}</span></td>
            <td><span class="badge ${claseEstado}" id="badgeEstadoCompra-${c.id}">${c.estado}</span></td>
            <td><select class="form-select form-select-sm" style="min-width:140px;" onchange="cambiarEstadoCompra(${c.id}, this.value)"> ${opciones}</select></td>
        </tr>`;
    }).join('');
}

// Cambia el estado de una compra y actualiza el badge en la tabla
async function cambiarEstadoCompra(idCompra, nuevoEstado) {
    try {
        const resp = await fetch(`${API.compras}/${idCompra}/estado`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: nuevoEstado }) });
        if (!resp.ok) {
            mostrarToast('Error al actualizar el estado de la compra', 'error');
            return;
        }
        const badge = document.getElementById(`badgeEstadoCompra-${idCompra}`);
        if (badge) {
            const claseMap = { 'Entregado': 'bg-success', 'Por entregar': 'bg-warning', 'Sin pagar': 'bg-danger' };
            badge.className = `badge ${claseMap[nuevoEstado] || 'bg-secondary'}`;
            badge.textContent = nuevoEstado;
        }
        const compra = _todasCompras.find(c => c.id === idCompra);
        if (compra) compra.estado = nuevoEstado;
        mostrarToast(`Compra marcada como ${nuevoEstado}`, 'success');
        await cargarClientes();
    } catch (e) {
        mostrarToast('Error de conexión', 'error');
    }
}

// Muestra un toast genérico para feedback (success | error)
function mostrarToast(mensaje, tipo = 'success') {
    const toast = document.getElementById('toastExito');
    const toastMsg = document.getElementById('toastMensaje');
    if (!toast) return;
    toast.className = `toast align-items-center border-0 ${tipo === 'success' ? 'text-bg-success' : 'text-bg-danger'}`;
    if (toastMsg) toastMsg.textContent = mensaje;
    new bootstrap.Toast(toast, { delay: 3000 }).show();
}

// Abre modal para editar los datos del administrador (nombre, teléfono, ciudad)
function abrirModalEditarDatos() {
    const sesion = obtenerSesion();
    if (!sesion) return;
    document.getElementById('editNombres').value = sesion.nombres || '';
    document.getElementById('editApellidos').value = sesion.apellidos || '';
    document.getElementById('editTelefono').value = sesion.telefono || '';
    document.getElementById('editCiudad').value = sesion.ciudad || 'Trujillo';
    document.getElementById('editDatosError')?.classList.add('d-none');
    new bootstrap.Modal(document.getElementById('modalEditarDatos')).show();
}

// Envía actualización de datos personales del administrador al backend
async function guardarEdicionDatos() {
    const sesion = obtenerSesion();
    if (!sesion) return;
    const nombres = document.getElementById('editNombres').value.trim();
    const apellidos = document.getElementById('editApellidos').value.trim();
    const telefono = document.getElementById('editTelefono').value.trim();
    const ciudad = document.getElementById('editCiudad').value.trim() || 'Trujillo';
    const errorEl = document.getElementById('editDatosError');
    errorEl?.classList.add('d-none');
    if (!nombres || !apellidos) {
        errorEl.textContent = 'Nombres y apellidos son obligatorios';
        errorEl.classList.remove('d-none');
        return;
    }
    if (!/^9[0-9]{8}$/.test(telefono)) {
        errorEl.textContent = 'El teléfono debe empezar con 9 y tener 9 dígitos';
        errorEl.classList.remove('d-none');
        return;
    }
    try {
        const resp = await fetch(`/api/usuarios/${sesion.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombres, apellidos, telefono, ciudad }) });
        if (!resp.ok) {
            errorEl.textContent = 'Error al guardar los cambios';
            errorEl.classList.remove('d-none');
            return;
        }
        sesion.nombres = nombres;
        sesion.apellidos = apellidos;
        sesion.telefono = telefono;
        sesion.ciudad = ciudad;
        guardarSesion(sesion);
        const iniciales = (nombres[0] + (apellidos?.[0] || '')).toUpperCase();
        const avatar = document.getElementById('adminNombreAvatar') || document.getElementById('gerenteNombreAvatar');
        const menu = document.getElementById('adminNombreMenu') || document.getElementById('gerenteNombreMenu');
        if (avatar) avatar.textContent = iniciales;
        if (menu) menu.textContent = nombres + ' ' + apellidos;
        bootstrap.Modal.getInstance(document.getElementById('modalEditarDatos'))?.hide();
        mostrarToast('Datos actualizados correctamente', 'success');
    } catch (e) {
        errorEl.textContent = 'Error de conexión';
        errorEl.classList.remove('d-none');
    }
}
