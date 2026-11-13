// Endpoints de la API usados por el panel de administrador
const API = { categorias: '/api/categorias', productos: '/api/productos', servicios: '/api/servicios', citas: '/api/citas', usuarios: '/api/usuarios', compras: '/api/compras' };

// Estado local en memoria: arrays cache y variables de edición
let categorias = [];
let productos = [];
let vistaProductos = 'grid';
let productoEdit = null;
let categoriaEdit = null;
let servicioEdit = null;
let _todasCitas = [];
let _citasFiltradas = [];
let _paginaCitasActual = 1;
const CITAS_POR_PAGINA = 10;
let _todosClientes = [];
let _todasCompras = [];
let _paginaClientesActual = 1;
const CLIENTES_POR_PAGINA = 10;
let _filtroEstadoCompra = null;
const COMPRAS_MODAL_POR_PAGINA = 5;
let _comprasModalActuales = [];
let _paginaComprasModalActual = 1;

// Inicialización al cargar la vista de administrador: valida sesión y carga datos
document.addEventListener('DOMContentLoaded', async () => {
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== 'administrador') {
        window.location.href = '/inicio';
        return;
    }
    const avatar = document.getElementById('adminNombreAvatar');
    const menu = document.getElementById('adminNombreMenu');
    const breadcrumb = document.getElementById('topbarBreadcrumb');
    const nombreCompleto = `${sesion.nombres || ''} ${sesion.apellidos || ''}`.trim();
    const iniciales = (sesion.nombres[0] + (sesion.apellidos?.[0] || '')).toUpperCase();
    if (avatar) avatar.textContent = iniciales;
    if (menu) menu.textContent = nombreCompleto;
    if (breadcrumb) breadcrumb.textContent = `Administrador ${nombreCompleto}`;
    ajustarAnchoCabecerasVista();
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(ajustarAnchoCabecerasVista);
    }
    iniciarSelectPersonalizado('filtroEstadoCita');
    iniciarSelectPersonalizado('filterCategoria');
    iniciarSelectPersonalizado('filterEstado');
    iniciarSelectPersonalizado('prodCategoria');
    iniciarSelectPersonalizado('prodEtiqueta');
    iniciarSelectPersonalizado('prodEstado');
    iniciarSelectPersonalizado('servEstado');
    await cargarCategorias();
    await cargarProductos();
    await cargarCitas();
    await cargarClientes();
});

// Iguala el ancho horizontal de los tags de título y subtítulo al tamaño del subtítulo de Servicios
function ajustarAnchoCabecerasVista() {
    const subServicios = document.querySelector('#sec-servicios .section-subtitle');
    if (!subServicios) return;
    const medidor = subServicios.cloneNode(true);
    medidor.removeAttribute('id');
    medidor.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;left:-9999px;top:-9999px;width:max-content;max-width:none;white-space:nowrap;';
    document.body.appendChild(medidor);
    const ancho = Math.ceil(medidor.getBoundingClientRect().width);
    medidor.remove();
    if (ancho > 0) {
        document.documentElement.style.setProperty('--ancho-cabecera-vista', `${ancho}px`);
    }
}

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

// Ordena elementos mostrando primero el registro más reciente (lógica LIFO / mayor a menor según ID)
function ordenarPorIdDesc(lista) {
    return [...(lista || [])].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
}

// Carga categorías desde la API y actualiza la vista correspondiente
async function cargarCategorias() {
    try {
        const resp = await fetch(API.categorias);
        categorias = ordenarPorIdDesc(await resp.json());
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
        productos = ordenarPorIdDesc(await resp.json());
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
                <h6 class="fw-bold mb-1">${cat.nombre}</h6>
                <div class="text-primary fw-bold fs-5 mb-0">${total}</div>
                <span class="fw-bold text-uppercase" style="color: var(--color-celeste, #0284c7); font-size: 0.75rem; letter-spacing: 0.5px;">productos</span>
                <p class="category-description text-muted small mt-2 mb-2 flex-grow-1" style="text-align: justify; text-justify: inter-word;">${cat.descripcion || ''}</p>
                <div class="d-flex gap-2 mt-auto pt-2 card-actions w-100">
                    <button class="btn btn-sm btn-outline-primary btn-editar-cat flex-fill" onclick="abrirEditarCategoria(${cat.id})"><i class="bi bi-pencil me-1"></i>Editar</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarCategoria(${cat.id}, '${cat.nombre.replace(/'/g, "\\'")}')"><i class="bi bi-trash"></i></button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// Rellena un <select> preservando su selección previa si sigue disponible y reconstruye su desplegable personalizado
function actualizarOpcionesSelect(selectId, opcionesHtml) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const valorPrevio = select.value;
    select.innerHTML = opcionesHtml;
    if (valorPrevio && Array.from(select.options).some(o => o.value === valorPrevio)) {
        select.value = valorPrevio;
    }
    reconstruirOpcionesSelectPersonalizado(selectId);
}

// Actualiza selects relacionados con categorías (producto y filtro)
function actualizarSelectCategorias() {
    const listaCatHtml = categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    actualizarOpcionesSelect('prodCategoria', '<option value="">Seleccionar...</option>' + listaCatHtml);
    actualizarOpcionesSelect('filterCategoria', '<option value="">Todas las categorías</option>' + listaCatHtml);
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

// Escapa caracteres HTML especiales antes de insertar texto en plantillas HTML
function escaparHtml(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Muestra modal genérico de confirmación/acción adaptando icono, color, título y botones
function mostrarModalAccion({ titulo, mensaje, icono = 'bi-trash3', colorIcono = 'red', textoBtn = 'Eliminar', claseBtn = 'btn-danger', textoBtnCancelar = 'Cancelar', onConfirmar }) {
    const modalEl = document.getElementById('modalEliminar');
    const iconoCont = document.getElementById('iconoModalEliminarContenedor');
    const iconoEl = document.getElementById('iconoModalEliminar');
    const tituloEl = document.getElementById('tituloModalEliminar');
    const mensajeEl = document.getElementById('nombreEliminar');
    const btn = document.getElementById('btnConfirmarEliminar');
    const btnCancelar = modalEl?.querySelector('[data-bs-dismiss="modal"]');

    if (iconoCont) iconoCont.className = `kpi-icon ${colorIcono} mx-auto mb-3`;
    if (iconoEl) iconoEl.className = `bi ${icono}`;
    if (tituloEl) tituloEl.textContent = titulo;
    if (mensajeEl) mensajeEl.innerHTML = mensaje;
    if (btnCancelar) {
        btnCancelar.textContent = textoBtnCancelar;
        btnCancelar.blur();
    }
    if (btn) {
        btn.disabled = false;
        btn.textContent = textoBtn;
        btn.className = `btn ${claseBtn} px-4 fw-semibold`;
        btn.blur();
        btn.onclick = () => {
            btn.blur();
            if (typeof onConfirmar === 'function') onConfirmar();
        };
    }
    if (modalEl) {
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
}

// Solicita confirmación y elimina una categoría por id
async function eliminarCategoria(id, nombre) {
    mostrarModalAccion({
        titulo: '¿Confirmar eliminación?',
        mensaje: `¿Eliminar la categoría "${nombre}"? Sus productos también serán afectados.`,
        icono: 'bi-trash3',
        colorIcono: 'red',
        textoBtn: 'Eliminar',
        claseBtn: 'btn-danger',
        onConfirmar: async () => {
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
        }
    });
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

    if (vistaProductos === 'list') {
        grid.innerHTML = `
            <div class="col-12">
                <div class="admin-card product-list-card shadow-sm">
                    ${productos.map(p => {
                        const stockClass = p.stock <= 5 ? 'text-danger' : 'text-muted';
                        const badgeClass = p.stock <= 5 ? 'bg-danger' : 'bg-primary';
                        const badgeTxt = p.stock <= 5 ? 'Stock bajo' : (p.etiqueta || '');
                        const isInactive = p.estado === 'Inactivo';
                        const nombreSafe = (p.nombre || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                        return `<div class="product-list-row prod-item ${isInactive ? 'opacity-75' : ''}" data-estado="${p.estado || 'Activo'}">
                            <div class="product-list-img-box">
                                ${p.imagen ? `<img src="${p.imagen}" alt="${nombreSafe}">` : `<i class="bi bi-box-seam product-icon-list"></i>`}
                            </div>
                            <div class="product-list-info flex-grow-1 min-w-0">
                                <div class="product-category mb-1">${p.categoria?.nombre || 'Sin categoría'}</div>
                                <div class="d-flex justify-content-between align-items-center gap-3 my-1">
                                    <div class="product-name product-name-list mb-0" title="${nombreSafe}">${p.nombre}</div>
                                    <div class="product-list-meta-actions d-flex align-items-center gap-2 flex-shrink-0">
                                        ${badgeTxt ? `<span class="badge ${badgeClass} prod-list-badge">${badgeTxt}</span>` : ''}
                                        ${!isInactive 
                                            ? '<span class="badge bg-success-subtle text-success small border border-success-subtle prod-list-status">Activo</span>' 
                                            : '<span class="badge bg-secondary-subtle text-secondary small border border-secondary-subtle prod-list-status"><i class="bi bi-eye-slash me-1"></i>Inactivo</span>'}
                                        <button class="btn btn-sm btn-outline-primary btn-editar-prod" title="Editar" onclick="abrirEditarProducto(${p.id})"><i class="bi bi-pencil"></i></button>
                                        <button class="btn btn-sm btn-outline-danger" title="Eliminar" onclick="confirmarEliminarProducto(${p.id},'${nombreSafe}')"><i class="bi bi-trash"></i></button>
                                    </div>
                                </div>
                                <div class="d-flex align-items-center gap-2 mt-1">
                                    <span class="product-price">S/ ${p.precio.toFixed(2)}</span>
                                    <small class="${stockClass}">Stock: <strong>${p.stock}</strong> unidades</small>
                                </div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
    } else {
        grid.innerHTML = productos.map(p => {
            const stockClass = p.stock <= 5 ? 'text-danger' : 'text-muted';
            const badgeClass = p.stock <= 5 ? 'bg-danger' : 'bg-primary';
            const badgeTxt = p.stock <= 5 ? 'Stock bajo' : (p.etiqueta || '');
            const isInactive = p.estado === 'Inactivo';
            const nombreSafe = (p.nombre || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            return `<div class="col-6 col-md-4 col-xl-3 prod-item" data-estado="${p.estado || 'Activo'}">
                <div class="product-admin-card h-100 ${isInactive ? 'opacity-75' : ''}">
                    <div class="product-img-box">
                        ${p.imagen ? `<img src="${p.imagen}" alt="${p.nombre}" style="width:100%;height:100%;object-fit:cover;">` : `<i class="bi bi-box-seam product-icon"></i>`}
                        ${isInactive ? `<span class="badge bg-secondary position-absolute top-0 start-0 m-2" style="font-size:0.7rem;"><i class="bi bi-eye-slash me-1"></i>Inactivo</span>` : ''}
                        ${badgeTxt ? `<span class="badge ${badgeClass} badge-new">${badgeTxt}</span>` : ''}
                    </div>
                    <div class="product-admin-body">
                        <p class="product-category">${p.categoria?.nombre || 'Sin categoría'}</p>
                        <div class="product-name mb-1">${p.nombre}</div>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="product-price">S/ ${p.precio.toFixed(2)}</span>
                            ${!isInactive ? '<span class="badge bg-success-subtle text-success small" style="font-size:0.7rem;">Activo</span>' : ''}
                        </div>
                        <small class="${stockClass}">Stock: <strong>${p.stock}</strong> unidades</small>
                    </div>
                    <div class="product-admin-actions">
                        <button class="btn btn-sm btn-outline-primary btn-editar-prod flex-fill" onclick="abrirEditarProducto(${p.id})"><i class="bi bi-pencil me-1"></i>Editar</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="confirmarEliminarProducto(${p.id},'${nombreSafe}')"><i class="bi bi-trash"></i></button>
                    </div>
                </div>
            </div>`;
        }).join('');
    }
}

// Sincroniza visualmente los desplegables personalizados del modal de producto
function sincronizarSelectsProducto() {
    ['prodCategoria', 'prodEtiqueta', 'prodEstado'].forEach(sincronizarSelectPersonalizado);
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
    const estadoEl = document.getElementById('prodEstado');
    if (estadoEl) estadoEl.value = 'Activo';
    sincronizarSelectsProducto();
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
        const estadoEl = document.getElementById('prodEstado');
        if (estadoEl) estadoEl.value = producto.estado || 'Activo';
        document.getElementById('prodImagen').value = producto.imagen || '';
        if (producto.categoria && producto.categoria.id) {
            document.getElementById('prodCategoria').value = String(producto.categoria.id);
        } else {
            document.getElementById('prodCategoria').value = '';
        }
        sincronizarSelectsProducto();
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
    const estado = document.getElementById('prodEstado')?.value || 'Activo';
    const imagen = document.getElementById('prodImagen').value.trim();
    const catId = document.getElementById('prodCategoria').value;
    if (!nombre || isNaN(precio) || isNaN(stock) || !catId) {
        mostrarToast('Completa todos los campos obligatorios, incluyendo la categoría', 'error');
        return;
    }
    const body = {
        nombre, precio, stock, descripcion, etiqueta, estado, imagen, categoria: { id: parseInt(catId) }
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
    mostrarModalAccion({
        titulo: '¿Confirmar eliminación?',
        mensaje: `¿Eliminar el producto "${nombre}"? Esta acción no se puede deshacer.`,
        icono: 'bi-trash3',
        colorIcono: 'red',
        textoBtn: 'Eliminar',
        claseBtn: 'btn-danger',
        onConfirmar: async () => {
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
        }
    });
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
        const itemEstado = item.dataset.estado || 'Activo';
        const matchBusq = nombre.includes(busqueda);
        const matchCat = !catFiltro || categorias.find(c => String(c.id) === catFiltro && cat.includes(c.nombre));
        const matchEstado = !estadoFiltro
            || (estadoFiltro === 'low' && stock <= 5)
            || (estadoFiltro === 'Activo' && itemEstado !== 'Inactivo')
            || (estadoFiltro === 'Inactivo' && itemEstado === 'Inactivo');
        item.style.display = (matchBusq && matchCat && matchEstado) ? '' : 'none';
    });
    actualizarBordesExtremosLista();
}

// Asegura que el primer y último producto visible en formato lista conserven esquinas redondeadas
function actualizarBordesExtremosLista() {
    if (vistaProductos !== 'list') return;
    const filas = Array.from(document.querySelectorAll('.product-list-card .product-list-row'));
    filas.forEach(f => f.classList.remove('is-first-item', 'is-last-item'));
    const visibles = filas.filter(f => f.style.display !== 'none');
    if (visibles.length > 0) {
        visibles[0].classList.add('is-first-item');
        visibles[visibles.length - 1].classList.add('is-last-item');
    }
}

// Cambia el modo de vista de productos (grid / list)
function setVista(tipo) {
    vistaProductos = tipo;
    const btnGrid = document.getElementById('btnGrid');
    const btnList = document.getElementById('btnList');
    if (tipo === 'list') {
        btnList?.classList.add('active');
        btnGrid?.classList.remove('active');
    } else {
        btnGrid?.classList.add('active');
        btnList?.classList.remove('active');
    }
    renderProductos(productos);
    filtrarProductos();
}

// Carga servicios desde la API y renderiza
async function cargarServicios() {
    try {
        const resp = await fetch(API.servicios);
        const data = await resp.json();
        const servicios = ordenarPorIdDesc(data);
        renderServicios(servicios);
    } catch (e) {
        console.error('Error cargando servicios:', e);
    }
}

// Obtiene la duración en horas de un servicio (maneja registros en horas o heredados en minutos)
function obtenerHorasServicio(s) {
    if (!s) return 1;
    const val = typeof s === 'object' ? Number(s.duracionHoras ?? s.duracionMinutos) : Number(s);
    if (isNaN(val) || val < 1) return 1;
    if (val >= 15) {
        return Math.max(1, Math.round(val / 60));
    }
    return Math.max(1, Math.floor(val));
}

// Formatea la duración para mostrar en las tarjetas (ej: "1 hr" o "2 hrs")
function formatearDuracionServicio(s) {
    const horas = obtenerHorasServicio(s);
    return horas === 1 ? '1 hr' : `${horas} hrs`;
}

// Renderiza tarjetas de servicios en el panel de admin
function renderServicios(servicios) {
    const grid = document.getElementById('gridServicios');
    if (!grid) return;
    const iconos = { 'aceite': 'bi-droplet-fill', 'eléctric': 'bi-battery-charging', 'manten': 'bi-gear-fill', 'diagnós': 'bi-speedometer2', 'alineac': 'bi-arrows-angle-expand', 'freno': 'bi-shield-check', 'aire': 'bi-wind', 'combustible': 'bi-fuel-pump-fill', 'refriger': 'bi-thermometer-half', 'motor': 'bi-wrench-adjustable', 'revisión': 'bi-car-front-fill' };
    const cards = servicios
        .filter(s => !s.nombre.toLowerCase().includes('personalizad'))
        .map(s => {
        const key = s.nombre.toLowerCase();
        const iconKey = Object.keys(iconos).find(k => key.includes(k));
        const icono = iconKey ? iconos[iconKey] : 'bi-gear-fill';
        const badge = s.estado === 'Activo' ? 'status-active' : 'status-inactive';
        const imgThumb = s.imagen
            ? `<div class="service-admin-thumb"><img src="${s.imagen}" alt="${s.nombre}"></div>`
            : `<div class="service-admin-thumb service-admin-thumb-empty"><i class="bi ${icono}"></i></div>`;
        return `<div class="col-sm-6 col-xl-4 d-flex">
            <div class="service-admin-card h-100 d-flex flex-column w-100">
                ${imgThumb}
                <div class="d-flex align-items-start gap-3 mb-3">
                    <div class="service-icon"><i class="bi ${icono}"></i></div>
                    <div class="flex-grow-1">
                        <h6 class="fw-bold mb-0">${s.nombre}</h6>
                        ${s.categoria ? `<span class="service-category-badge">${s.categoria}</span>` : ''}
                    </div>
                    <span class="status-badge ${badge}">${s.estado}</span>
                </div>
                <p class="text-muted small mb-3 flex-grow-1">${s.descripcion || 'Sin descripción.'}</p>
                <div class="d-flex justify-content-between mb-3">
                    <div><small class="text-muted d-block">Precio</small><strong class="text-primary">S/ ${s.precioBase.toFixed(2)}</strong></div>
                    <div><small class="text-muted d-block">Duración</small><strong>${formatearDuracionServicio(s)}</strong></div>
                </div>
                <div class="d-flex gap-2 card-actions">
                    <button class="btn btn-sm btn-outline-primary btn-editar-serv flex-fill" onclick="abrirEditarServicio(${s.id})"><i class="bi bi-pencil me-1"></i>Editar</button>
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
    document.getElementById('servDuracion').value = '1';
    document.getElementById('servEstado').value = 'Activo';
    document.getElementById('servImagen').value = '';
    sincronizarSelectPersonalizado('servEstado');
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
        document.getElementById('servDuracion').value = obtenerHorasServicio(servicio);
        document.getElementById('servDescripcion').value = servicio.descripcion || '';
        document.getElementById('servEstado').value = servicio.estado || 'Activo';
        document.getElementById('servImagen').value = servicio.imagen || '';
        sincronizarSelectPersonalizado('servEstado');
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
    const imagen = document.getElementById('servImagen')?.value.trim() || '';
    if (!nombre || isNaN(precio) || isNaN(duracion) || duracion < 1) {
        mostrarToast(duracion < 1 ? 'La duración debe ser al menos de 1 hora' : 'Completa los campos obligatorios', 'error');
        return;
    }
    const body = { nombre, categoria, precioBase: precio, duracionMinutos: duracion, descripcion: desc, estado, imagen };
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
    mostrarModalAccion({
        titulo: '¿Confirmar eliminación?',
        mensaje: `¿Eliminar el servicio "${nombre}"?`,
        icono: 'bi-trash3',
        colorIcono: 'red',
        textoBtn: 'Eliminar',
        claseBtn: 'btn-danger',
        onConfirmar: async () => {
            try {
                await fetch(`${API.servicios}/${id}`, { method: 'DELETE' });
                bootstrap.Modal.getInstance(document.getElementById('modalEliminar'))?.hide();
                mostrarToast('Servicio eliminado', 'success');
                await cargarServicios();
            } catch (e) {
                mostrarToast('Error de conexión', 'error');
            }
        }
    });
}

// Ordena las citas mostrando primero la reserva más reciente (LIFO visual por ID descendente)
function ordenarCitasDesc(lista) {
    return ordenarPorIdDesc(lista);
}

// Carga todas las citas y actualiza la tabla y KPI's
async function cargarCitas() {
    try {
        const resp = await fetch(API.citas);
        _todasCitas = ordenarCitasDesc(await resp.json());
        actualizarKPIsCitas(_todasCitas);
        filtrarCitasTabla(false);
    } catch (e) {
        console.error('Error cargando citas:', e);
    }
}

// Comprueba si una fecha (YYYY-MM-DD) pertenece a la semana actual del calendario (Lunes a Domingo)
function fechaEstaSemana(fechaISO) {
    if (!fechaISO) return false;
    const partes = String(fechaISO).substring(0, 10).split('-').map(Number);
    if (partes.length !== 3 || partes.some(Number.isNaN)) return false;
    const fecha = new Date(partes[0], partes[1] - 1, partes[2], 0, 0, 0, 0);
    const hoy = new Date();
    const hoyMid = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0, 0);
    const dia = hoyMid.getDay(); // 0: Dom, 1: Lun, ..., 6: Sab
    const diffLunes = dia === 0 ? -6 : 1 - dia;
    const inicioSemana = new Date(hoyMid);
    inicioSemana.setDate(hoyMid.getDate() + diffLunes);
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    finSemana.setHours(23, 59, 59, 999);
    return fecha >= inicioSemana && fecha <= finSemana;
}

// Calcula y actualiza KPIs de citas: pendientes globales y confirmadas/completadas/canceladas de la semana actual
function actualizarKPIsCitas(citas) {
    const lista = citas || [];
    const citasSemana = lista.filter(c => fechaEstaSemana(c.fecha));
    // Pendientes siempre muestra el total global para que el administrador pueda aprobar reservas de cualquier semana
    const pendientes  = lista.filter(c => c.estado === 'Pendiente').length;
    const confirmadas = citasSemana.filter(c => c.estado === 'Confirmada').length;
    const completadas = citasSemana.filter(c => c.estado === 'Completada').length;
    const canceladas  = citasSemana.filter(c => c.estado === 'Cancelada').length;
    const totalPendientes = pendientes;
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    set('kpiPendientes', pendientes);
    set('kpiConfirmadas', confirmadas);
    set('kpiCompletadas', completadas);
    set('kpiCanceladas', canceladas);
    const badge = document.getElementById('badgePendientes');
    if (badge) badge.textContent = totalPendientes > 0 ? totalPendientes : '';
    const info = document.getElementById('infoCitas');
    if (info) info.textContent = `${totalPendientes} pendientes de confirmar`;
}

// Renderiza la tabla de citas paginada (10 por página) con acciones condicionales según estado
function renderCitas(citas) {
    const tbody = document.getElementById('tablaCitas');
    if (!tbody) return;
    _citasFiltradas = citas || [];
    if (_citasFiltradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No hay citas registradas</td></tr>`;
        renderPaginacionCitas(0);
        return;
    }

    const totalPaginas = Math.max(1, Math.ceil(_citasFiltradas.length / CITAS_POR_PAGINA));
    if (_paginaCitasActual > totalPaginas) _paginaCitasActual = totalPaginas;
    if (_paginaCitasActual < 1) _paginaCitasActual = 1;
    const inicio = (_paginaCitasActual - 1) * CITAS_POR_PAGINA;
    const paginaCitas = _citasFiltradas.slice(inicio, inicio + CITAS_POR_PAGINA);

    const estadoBadge = { 'Pendiente': 'status-pending', 'Confirmada': 'status-confirmed', 'Completada': 'status-completed', 'Cancelada': 'status-inactive' };
    tbody.innerHTML = paginaCitas.map(c => {
        const esPersonalizado = (c.servicio?.nombre || c.servicio || '').toLowerCase().includes('personalizad') ||
                                (c.notas && c.notas.toLowerCase().includes('servicio personalizado'));
        const nombreServicio = esPersonalizado ? 'Personalizado' : (c.servicio?.nombre || c.servicio || '');

        return `
    <tr>
        <td class="text-muted fw-semibold">#S-${String(c.id).padStart(3, '0')}</td>
        <td>
            <div class="fw-semibold">${c.usuario?.nombres || ''} ${c.usuario?.apellidos || ''}</div>
            <div class="text-muted" style="font-size:.72rem">${c.usuario?.telefono || ''}</div>
        </td>
        <td>${nombreServicio}</td>
        <td><div>${c.hora || ''}</div><small class="text-muted">${c.fecha || ''}</small></td>
        <td><small>${c.vehiculo || ''}</small></td>
        <td><span class="status-badge ${estadoBadge[c.estado] || ''}">${c.estado}</span></td>
        <td>
            <div class="d-flex gap-1 align-items-center">
                ${esPersonalizado ? `<button type="button" class="btn btn-xs btn-outline-celeste accion-btn" title="Ver detalles de solicitud personalizada" onclick="abrirModalDetallePersonalizado(${c.id}); this.blur();"><i class="bi bi-eye"></i></button>` : ''}
                ${c.estado === 'Pendiente' ? `<button class="btn btn-xs btn-outline-success accion-btn" title="Confirmar" onclick="cambiarEstadoCita(${c.id},'Confirmada')"><i class="bi bi-check-lg"></i></button>` : ''}
                ${c.estado === 'Confirmada' ? `<button class="btn btn-xs btn-outline-success accion-btn" title="Marcar como completada" onclick="cambiarEstadoCita(${c.id},'Completada')"><i class="bi bi-check2-all"></i></button>` : ''}
                ${c.estado !== 'Cancelada' && c.estado !== 'Completada' ? `<button class="btn btn-xs btn-outline-danger accion-btn" title="Cancelar" onclick="cambiarEstadoCita(${c.id},'Cancelada')"><i class="bi bi-x"></i></button>` : ''}
            </div>
        </td>
    </tr>`;
    }).join('');
    renderPaginacionCitas(_citasFiltradas.length);
}

// Extrae campos estructurados de las notas guardadas en una solicitud de servicio personalizado
function parsearNotasPersonalizado(notas) {
    if (!notas) return {};
    const getVal = (label) => {
        const regex = new RegExp(`(?:${label})\\s*:\\s*([^\\n]+)`, 'i');
        const match = notas.match(regex);
        return match ? match[1].trim() : '';
    };

    let desc = '';
    const descMatch = notas.match(/Descripción\s*:\s*([\s\S]*?)(?=(?:Contacto preferido|$))/i);
    if (descMatch) {
        desc = descMatch[1].trim();
    } else {
        desc = getVal('Descripción');
    }

    if (!desc && notas.trim() && !notas.includes(':')) {
        desc = notas.replace(/Solicitud de servicio personalizado\.?/gi, '').trim();
    }

    return {
        tipoVehiculo: getVal('Tipo'),
        kilometraje: getVal('Kilometraje'),
        areas: getVal('Áreas afectadas') || getVal('Areas afectadas') || getVal('Área') || getVal('Area'),
        cuando: getVal('Ocurre') || getVal('¿Cuándo ocurre el problema\\?') || getVal('Cuando ocurre'),
        urgencia: getVal('Urgencia'),
        descripcion: desc,
        contactoPref: getVal('Contacto preferido') || getVal('Contacto')
    };
}

// Abre el modal con los detalles adicionales de una solicitud de servicio personalizado
function abrirModalDetallePersonalizado(id) {
    const cita = _todasCitas.find(c => Number(c.id) === Number(id));
    if (!cita) return;

    const elCodigo = document.getElementById('detCitaCodigo');
    if (elCodigo) elCodigo.textContent = `#S-${String(cita.id).padStart(3, '0')}`;

    const elCliente = document.getElementById('detCitaCliente');
    if (elCliente) {
        const nombreCliente = `${cita.usuario?.nombres || ''} ${cita.usuario?.apellidos || ''}`.trim() || 'Cliente';
        const vehiculo = cita.vehiculo || 'Vehículo';
        elCliente.textContent = `${nombreCliente} • ${vehiculo}`;
    }

    const tel = cita.usuario?.telefono || 'No registrado';
    const elTel = document.getElementById('detCitaTelefono');
    if (elTel) elTel.textContent = tel;

    const parsed = parsearNotasPersonalizado(cita.notas || '');

    const elTipo = document.getElementById('detCitaTipoVehiculo');
    if (elTipo) elTipo.textContent = parsed.tipoVehiculo || 'No especificado';

    const elKm = document.getElementById('detCitaKm');
    if (elKm) elKm.textContent = parsed.kilometraje || 'No especificado';

    const elAreas = document.getElementById('detCitaAreas');
    if (elAreas) {
        if (parsed.areas && parsed.areas !== 'No especificado') {
            const lista = parsed.areas.split(',').map(a => a.trim()).filter(Boolean);
            elAreas.innerHTML = lista.map(a => `<span class="badge bg-light text-primary border border-primary-subtle fw-semibold px-2 py-1"><i class="bi bi-check2-circle me-1"></i>${a}</span>`).join('');
        } else {
            elAreas.innerHTML = '<span class="badge bg-light text-muted border px-2 py-1">No especificado</span>';
        }
    }

    const elCuando = document.getElementById('detCitaCuando');
    if (elCuando) elCuando.textContent = parsed.cuando || 'No especificado';

    const elUrg = document.getElementById('detCitaUrgencia');
    if (elUrg) {
        const urgLower = (parsed.urgencia || '').toLowerCase();
        if (urgLower.includes('alta') || urgLower.includes('urgente')) {
            elUrg.innerHTML = '<span class="badge bg-danger px-2 py-1"><i class="bi bi-exclamation-triangle-fill me-1"></i>Urgente</span>';
        } else if (urgLower.includes('media') || urgLower.includes('semana')) {
            elUrg.innerHTML = '<span class="badge bg-warning text-dark px-2 py-1"><i class="bi bi-clock me-1"></i>Esta semana</span>';
        } else if (urgLower.includes('baja') || urgLower.includes('esperar')) {
            elUrg.innerHTML = '<span class="badge bg-success px-2 py-1"><i class="bi bi-check-circle me-1"></i>Puede esperar</span>';
        } else {
            elUrg.innerHTML = `<span class="badge bg-secondary px-2 py-1">${parsed.urgencia || 'No especificado'}</span>`;
        }
    }

    const elDesc = document.getElementById('detCitaDescripcion');
    if (elDesc) elDesc.textContent = parsed.descripcion || 'Sin descripción adicional.';

    const elPref = document.getElementById('detCitaContactoPref');
    if (elPref) {
        const prefLower = (parsed.contactoPref || '').toLowerCase();
        if (prefLower.includes('whats')) {
            elPref.innerHTML = '<span class="badge bg-success-subtle text-success border border-success-subtle fw-semibold px-2 py-1"><i class="bi bi-whatsapp me-1"></i>WhatsApp</span>';
        } else if (prefLower.includes('llama') || prefLower.includes('tel')) {
            elPref.innerHTML = '<span class="badge bg-primary-subtle text-primary border border-primary-subtle fw-semibold px-2 py-1"><i class="bi bi-telephone-fill me-1"></i>Llamada telefónica</span>';
        } else if (prefLower.includes('email') || prefLower.includes('correo')) {
            elPref.innerHTML = '<span class="badge bg-info-subtle text-info-emphasis border border-info-subtle fw-semibold px-2 py-1"><i class="bi bi-envelope-fill me-1"></i>Correo electrónico</span>';
        } else {
            elPref.innerHTML = `<span class="badge bg-light text-dark border px-2 py-1">${parsed.contactoPref || 'No especificado'}</span>`;
        }
    }

    abrirModal('modalDetallePersonalizado');
}

// Renderiza botones de paginación numerados de 1 en 1 reutilizando el estilo unificado de citas
function renderBotonesPaginacion(contenedorId, totalRegistros, porPagina, paginaActual, fnNavegacion) {
    const cont = document.getElementById(contenedorId);
    if (!cont) return;
    if (!totalRegistros || totalRegistros === 0) {
        cont.innerHTML = '';
        return;
    }
    const totalPaginas = Math.max(1, Math.ceil(totalRegistros / porPagina));
    let html = '';
    for (let i = 1; i <= totalPaginas; i++) {
        const activo = i === paginaActual ? 'active' : '';
        html += `<button type="button" class="btn-paginacion-citas ${activo}" onclick="${fnNavegacion}(${i})">${i}</button>`;
    }
    cont.innerHTML = html;
}

// Renderiza los números de página crecientes de 1 en 1 a la derecha del resumen de citas
function renderPaginacionCitas(totalRegistros) {
    renderBotonesPaginacion('paginacionCitas', totalRegistros, CITAS_POR_PAGINA, _paginaCitasActual, 'irAPaginaCitas');
}

// Cambia a la página seleccionada en la tabla de citas
function irAPaginaCitas(pagina) {
    _paginaCitasActual = pagina;
    renderCitas(_citasFiltradas);
}

// Determina si la fecha (y hora límite si corresponde al día actual) de una cita ya expiró
function esCitaExpirada(cita) {
    if (!cita || !cita.fecha) return false;
    const partes = String(cita.fecha).substring(0, 10).split('-').map(Number);
    if (partes.length !== 3 || partes.some(Number.isNaN)) return false;

    const hoy = new Date();
    const fechaCita = new Date(partes[0], partes[1] - 1, partes[2]);
    const fechaHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    if (fechaCita < fechaHoy) return true;
    if (fechaCita.getTime() === fechaHoy.getTime() && cita.hora) {
        const coincidencias = String(cita.hora).match(/\b(\d{1,2}):(\d{2})\b/g);
        if (coincidencias && coincidencias.length > 0) {
            const [hh, mm] = coincidencias[coincidencias.length - 1].split(':').map(Number);
            if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
                const limite = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), hh, mm, 0, 0);
                return hoy > limite;
            }
        }
    }
    return false;
}

// Calcula el instante exacto (+1 minuto tras finalizar la hora de la cita) para habilitar el estado Completada
function obtenerLimiteFinalizacionCita(cita) {
    if (!cita || !cita.fecha) return null;
    const partes = String(cita.fecha).substring(0, 10).split('-').map(Number);
    if (partes.length !== 3 || partes.some(Number.isNaN)) return null;

    const [anio, mes, dia] = partes;
    if (cita.hora) {
        const coincidencias = String(cita.hora).match(/\b(\d{1,2}):(\d{2})\b/g);
        if (coincidencias && coincidencias.length > 0) {
            const [hh, mm] = coincidencias[coincidencias.length - 1].split(':').map(Number);
            if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
                return new Date(anio, mes - 1, dia, hh, mm + 1, 0, 0);
            }
        }
    }
    return new Date(anio, mes - 1, dia + 1, 0, 0, 0, 0);
}

// Indica si ya pasó el horario programado (+1 minuto) para poder completar la cita
function haFinalizadoHorarioCita(cita) {
    const limite = obtenerLimiteFinalizacionCita(cita);
    return limite ? new Date() >= limite : false;
}

// Valida reglas de fecha/horario y solicita confirmación mediante modal antes de cambiar el estado de la cita
function cambiarEstadoCita(id, nuevoEstado) {
    const cita = _todasCitas.find(c => Number(c.id) === Number(id));
    const expirada = esCitaExpirada(cita);
    // Si la cita está pendiente y su fecha ya expiró, no se puede aceptar/confirmar; solo cancelar
    if (expirada && nuevoEstado !== 'Cancelada' && (!cita || cita.estado === 'Pendiente' || nuevoEstado === 'Confirmada')) {
        mostrarToast('La fecha solicitada ya expiró. Solo puedes cancelar esta cita.', 'warning');
        return;
    }
    // Solo permite marcar como Completada una vez pasado el horario programado (+1 min)
    if (nuevoEstado === 'Completada' && cita && !haFinalizadoHorarioCita(cita)) {
        const limite = obtenerLimiteFinalizacionCita(cita);
        const hhmm = limite ? `${String(limite.getHours()).padStart(2, '0')}:${String(limite.getMinutes()).padStart(2, '0')}` : '';
        const fechaTexto = limite ? `${String(limite.getDate()).padStart(2, '0')}-${String(limite.getMonth() + 1).padStart(2, '0')}-${limite.getFullYear()}` : '';
        const mensajeHorario = (hhmm && fechaTexto)
            ? `Aún no culmina la fecha y hora de la cita.\nPodrás completarla a partir de las\n${hhmm} del ${fechaTexto}.`
            : 'Aún no culmina la fecha y hora de la cita.';
        mostrarToast(mensajeHorario, 'warning');
        return;
    }

    const codigoCita = `<strong class="text-nowrap">#S-${String(id).padStart(3, '0')}</strong>`;
    const clienteNombre = escaparHtml(`${cita?.usuario?.nombres || ''} ${cita?.usuario?.apellidos || ''}`.trim());
    const clienteLinea = clienteNombre ? `de <strong>${clienteNombre}</strong>?<br>` : '?<br>';

    const configPorEstado = {
        Confirmada: {
            titulo: '¿Confirmar cita?',
            mensaje: `¿Seguro que deseas confirmar la cita ${codigoCita}<br>${clienteLinea}Esta acción no se podrá deshacer.`,
            icono: 'bi-check2-circle',
            colorIcono: 'green',
            textoBtn: 'Sí, confirmar',
            claseBtn: 'btn-success',
            textoBtnCancelar: 'Cancelar'
        },
        Completada: {
            titulo: '¿Completar cita?',
            mensaje: `¿Seguro que deseas completar la cita ${codigoCita}<br>${clienteLinea}Esta acción no se podrá deshacer.`,
            icono: 'bi-check2-all',
            colorIcono: 'blue',
            textoBtn: 'Sí, completar',
            claseBtn: 'btn-primary',
            textoBtnCancelar: 'Cancelar'
        },
        Cancelada: {
            titulo: '¿Cancelar cita?',
            mensaje: `¿Seguro que deseas cancelar la cita ${codigoCita}<br>${clienteLinea}Esta acción no se podrá deshacer.`,
            icono: 'bi-calendar-x',
            colorIcono: 'red',
            textoBtn: 'Sí, cancelar',
            claseBtn: 'btn-danger',
            textoBtnCancelar: 'Volver'
        }
    };

    const cfg = configPorEstado[nuevoEstado];
    if (!cfg) {
        ejecutarCambioEstadoCita(id, nuevoEstado, expirada);
        return;
    }

    mostrarModalAccion({
        ...cfg,
        onConfirmar: () => ejecutarCambioEstadoCita(id, nuevoEstado, expirada)
    });
}

// Envía la actualización confirmada de estado de la cita al backend y refresca la vista
async function ejecutarCambioEstadoCita(id, nuevoEstado, expirada) {
    const btn = document.getElementById('btnConfirmarEliminar');
    if (btn) btn.disabled = true;
    try {
        const resp = await fetch(`${API.citas}/${id}/estado`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: nuevoEstado }) });
        bootstrap.Modal.getInstance(document.getElementById('modalEliminar'))?.hide();
        if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            mostrarToast(errData.error || 'Error al actualizar la cita', resp.status === 400 ? 'warning' : 'error');
            return;
        }
        if (nuevoEstado === 'Cancelada') {
            mostrarToast(expirada ? 'Cita cancelada por fecha expirada' : 'Cita cancelada correctamente', 'success');
        } else {
            mostrarToast(`Cita marcada como ${nuevoEstado}`, 'success');
        }
        await cargarCitas();
    } catch (e) {
        bootstrap.Modal.getInstance(document.getElementById('modalEliminar'))?.hide();
        mostrarToast('Error de conexión', 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

// Filtra las citas mostradas en la tabla por búsqueda, estado y fecha
function filtrarCitasTabla(resetPagina = true) {
    const busqueda = (document.getElementById('filtroCitas')?.value || '').toLowerCase();
    const estadoFiltro = document.getElementById('filtroEstadoCita')?.value || '';
    const fechaFiltro = document.getElementById('filtroFechaCita')?.value || '';
    const hayFiltro = Boolean(busqueda || estadoFiltro || fechaFiltro);
    if (resetPagina) {
        _paginaCitasActual = 1;
    }
    const filtradas = hayFiltro ? _todasCitas.filter(c => {
        const cliente = `${c.usuario?.nombres || ''} ${c.usuario?.apellidos || ''}`.toLowerCase();
        const esPers = (c.servicio?.nombre || c.servicio || '').toLowerCase().includes('personalizad') ||
                       (c.notas && c.notas.toLowerCase().includes('servicio personalizado'));
        const servicio = (esPers ? 'personalizado' : (c.servicio?.nombre || '')).toLowerCase();
        const matchBusq = !busqueda || cliente.includes(busqueda) || servicio.includes(busqueda);
        const matchEstado = !estadoFiltro || c.estado === estadoFiltro;
        const matchFecha = !fechaFiltro || String(c.fecha) === fechaFiltro;
        return matchBusq && matchEstado && matchFecha;
    }) : _todasCitas;
    renderCitas(filtradas);
    const info = document.getElementById('infoPaginacionCitas');
    if (info) {
        info.textContent = hayFiltro ? `Mostrando ${filtradas.length} de ${_todasCitas.length} citas` : 'Mostrando todas las citas';
    }
}

// Cierra todos los selects desplegados (tanto inline como portales en body)
function cerrarTodosSelectsPersonalizados() {
    document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
        w.classList.remove('open');
        w.querySelector('.custom-select-trigger')?.setAttribute('aria-expanded', 'false');
    });
    document.querySelectorAll('.custom-select-menu-portal.open').forEach(m => {
        m.classList.remove('open');
    });
}

// Elimina menús portales de un propietario dado (ej. al re-renderizar o cerrar modal)
function limpiarPortalesSelect(owner) {
    document.querySelectorAll(`.custom-select-menu-portal[data-portal-owner="${owner}"]`).forEach(m => m.remove());
}

// Resuelve el elemento <select> a partir de su ID o referencia directa
function resolverElementoSelect(selectTarget) {
    return typeof selectTarget === 'string' ? document.getElementById(selectTarget) : selectTarget;
}

// Posiciona un menú portal sobre la pantalla alineado con su botón disparador
function posicionarMenuPortal(trigger, menu) {
    const rect = trigger.getBoundingClientRect();
    menu.style.left = `${rect.left}px`;
    menu.style.width = `${rect.width}px`;
    menu.classList.add('open');

    const espacioAbajo = window.innerHeight - rect.bottom - 12;
    const espacioArriba = rect.top - 12;
    const desplegarAbajo = espacioAbajo >= 150 || espacioAbajo >= espacioArriba;
    const altoMax = Math.min(240, Math.max(120, desplegarAbajo ? espacioAbajo : espacioArriba));
    menu.style.maxHeight = `${altoMax}px`;

    if (desplegarAbajo) {
        menu.style.top = `${rect.bottom + 2}px`;
    } else {
        const topPos = Math.max(8, rect.top - menu.offsetHeight - 2);
        menu.style.top = `${topPos}px`;
    }
}

// Sincroniza el estado visual de un select personalizado con el <select> nativo
function sincronizarSelectPersonalizado(selectTarget) {
    const select = resolverElementoSelect(selectTarget);
    const refs = select?._customRefs;
    const wrapper = refs?.wrapper || select?.closest('.custom-select-wrapper');
    const menu = refs?.menu || wrapper?.querySelector('.custom-select-menu');
    if (!select || !wrapper || !menu) return;
    const texto = wrapper.querySelector('.custom-select-label');
    const opcionActual = select.options[select.selectedIndex];
    if (texto) texto.textContent = opcionActual ? opcionActual.textContent : '';
    menu.querySelectorAll('.custom-select-option').forEach(li => {
        const activa = li.dataset.value === select.value;
        li.classList.toggle('selected', activa);
        li.setAttribute('aria-selected', activa ? 'true' : 'false');
    });
}

// Reconstruye la lista de opciones del menú personalizado cuando cambia dinámicamente el <select>
function reconstruirOpcionesSelectPersonalizado(selectTarget) {
    const select = resolverElementoSelect(selectTarget);
    const refs = select?._customRefs;
    const wrapper = refs?.wrapper || select?.closest('.custom-select-wrapper');
    const menu = refs?.menu || wrapper?.querySelector('.custom-select-menu');
    const trigger = refs?.trigger || wrapper?.querySelector('.custom-select-trigger');
    if (!select || !wrapper || !menu || !trigger) return;

    menu.innerHTML = '';
    Array.from(select.options).forEach(opt => {
        const li = document.createElement('li');
        li.className = 'custom-select-option';
        li.setAttribute('role', 'option');
        li.dataset.value = opt.value;
        li.textContent = opt.textContent;
        li.addEventListener('click', e => {
            e.stopPropagation();
            if (select.value !== opt.value) {
                select.value = opt.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
            sincronizarSelectPersonalizado(select);
            cerrarTodosSelectsPersonalizados();
        });
        menu.appendChild(li);
    });
    sincronizarSelectPersonalizado(select);
}

// Reemplaza visualmente un <select> por un desplegable con esquinas redondeadas manteniendo el <select> sincronizado
function iniciarSelectPersonalizado(selectTarget, opciones = {}) {
    const select = resolverElementoSelect(selectTarget);
    if (!select || select.dataset.customInit === 'true') return;
    select.dataset.customInit = 'true';

    const usarPortal = Boolean(opciones.portal);
    const wrapper = document.createElement('div');
    wrapper.className = `custom-select-wrapper${opciones.wrapperClass ? ' ' + opciones.wrapperClass : ''}`;
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    select.classList.add('custom-select-native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'custom-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = '<span class="custom-select-label"></span><i class="bi bi-chevron-down custom-select-arrow"></i>';

    const menu = document.createElement('ul');
    menu.className = `custom-select-menu${usarPortal ? ' custom-select-menu-portal' : ''}`;
    menu.setAttribute('role', 'listbox');
    if (usarPortal && opciones.portalOwner) {
        menu.dataset.portalOwner = opciones.portalOwner;
    }

    select._customRefs = { wrapper, trigger, menu, portal: usarPortal };
    wrapper.appendChild(trigger);
    if (usarPortal) {
        document.body.appendChild(menu);
    } else {
        wrapper.appendChild(menu);
    }
    reconstruirOpcionesSelectPersonalizado(select);

    trigger.addEventListener('click', e => {
        e.stopPropagation();
        const abierto = wrapper.classList.contains('open');
        cerrarTodosSelectsPersonalizados();
        if (!abierto) {
            wrapper.classList.add('open');
            trigger.setAttribute('aria-expanded', 'true');
            if (usarPortal) {
                posicionarMenuPortal(trigger, menu);
            }
        }
    });

    trigger.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            cerrarTodosSelectsPersonalizados();
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const delta = e.key === 'ArrowDown' ? 1 : -1;
            const nextIdx = Math.max(0, Math.min(select.options.length - 1, select.selectedIndex + delta));
            if (nextIdx !== select.selectedIndex) {
                select.selectedIndex = nextIdx;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                sincronizarSelectPersonalizado(select);
            }
        }
    });

    select.addEventListener('change', () => sincronizarSelectPersonalizado(select));

    if (!document.body.dataset.customSelectListeners) {
        document.body.dataset.customSelectListeners = 'true';
        document.addEventListener('click', e => {
            if (!e.target.closest('.custom-select-wrapper') && !e.target.closest('.custom-select-menu')) {
                cerrarTodosSelectsPersonalizados();
            }
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                cerrarTodosSelectsPersonalizados();
            }
        });
        window.addEventListener('resize', cerrarTodosSelectsPersonalizados);
        document.addEventListener('scroll', e => {
            if (!e.target?.closest?.('.custom-select-menu')) {
                cerrarTodosSelectsPersonalizados();
            }
        }, true);
    }
}

// Limpia los filtros de la tabla de citas y restaura la vista completa
function limpiarFiltrosCitas() {
    const f1 = document.getElementById('filtroCitas');
    const f2 = document.getElementById('filtroEstadoCita');
    const f3 = document.getElementById('filtroFechaCita');
    if (f1) f1.value = '';
    if (f2) f2.value = '';
    if (f3) f3.value = '';
    sincronizarSelectPersonalizado('filtroEstadoCita');
    _paginaCitasActual = 1;
    renderCitas(_todasCitas);
    const info = document.getElementById('infoPaginacionCitas');
    if (info) info.textContent = 'Mostrando todas las citas';
}

// Carga todos los usuarios (clientes) ordenados del último registrado al primero y las compras asociadas
async function cargarClientes() {
    try {
        const resp = await fetch(API.usuarios);
        _todosClientes = ordenarCitasDesc(await resp.json());
        const respCompras = await fetch(API.compras);
        _todasCompras = respCompras.ok ? await respCompras.json() : [];
        _paginaClientesActual = 1;
        renderClientes(obtenerClientesFiltrados());
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

// Obtiene el rol base con el que fue creada la cuenta (el rol más alto en la jerarquía: gerente > administrador > cliente)
function obtenerRolCreado(usuario) {
    if (!usuario) return 'cliente';
    if (usuario.rolBase) return String(usuario.rolBase).toLowerCase();
    const roles = Array.isArray(usuario.roles)
        ? usuario.roles.map(r => (typeof r === 'string' ? r : (r.nombre || '')).toLowerCase())
        : (usuario.nombresRoles || []).map(r => String(r).toLowerCase());
    if (roles.includes('gerente') || usuario.rol === 'gerente') return 'gerente';
    if (roles.includes('administrador') || usuario.rol === 'administrador') return 'administrador';
    return 'cliente';
}

// Determina si el usuario logueado tiene permisos para inhabilitar o habilitar la cuenta de un cliente
function puedeModificarEstadoCliente(cliente) {
    const sesion = obtenerSesion();
    if (!sesion || !cliente) return false;

    // Un usuario nunca puede inhabilitar su propia cuenta
    if (Number(sesion.id) === Number(cliente.id)) return false;

    const rolCreadoSesion = obtenerRolCreado(sesion);
    const rolCreadoCliente = obtenerRolCreado(cliente);

    // Un usuario con cuenta creada como gerente no podrá inhabilitar a otro gerente, solo a administrador o cliente
    if (rolCreadoSesion === 'gerente') {
        return rolCreadoCliente !== 'gerente';
    }

    // Un usuario con cuenta creada como administrador no podrá inhabilitar a un gerente o administrador, solo clientes
    if (rolCreadoSesion === 'administrador') {
        return rolCreadoCliente === 'cliente';
    }

    return false;
}

// Renderiza la tabla de clientes con paginación y acciones (ver compras, inhabilitar/habilitar)
function renderClientes(clientes) {
    const tbody = document.getElementById('tablaClientes');
    if (!tbody) return;
    const info = document.getElementById('infoClientes');
    if (info) {
        if (_filtroEstadoCompra) {
            info.textContent = `${clientes.length} de ${_todosClientes.length} clientes (${_filtroEstadoCompra.toLowerCase()})`;
        } else {
            info.textContent = `${clientes.length} clientes en total`;
        }
    }
    actualizarBotonesFiltroCompras();
    if (clientes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">${_filtroEstadoCompra ? 'No hay clientes con última compra en estado "' + _filtroEstadoCompra + '"' : 'No hay clientes registrados'}</td></tr>`;
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

        const puedeModificar = puedeModificarEstadoCliente(c);
        const esInactivo = (c.estado || 'Activo') === 'Inactivo';
        const badgeClase = esInactivo ? 'status-inactive' : 'status-active';
        const textoEstado = esInactivo ? 'Inactivo' : 'Activo';

        const btnEstado = puedeModificar ? `
            <button class="btn btn-sm ${esInactivo ? 'btn-outline-success' : 'btn-outline-danger'}" 
                    title="${esInactivo ? 'Habilitar usuario' : 'Inhabilitar usuario'}" 
                    onclick="confirmarCambiarEstadoCliente(${c.id}, '${(c.nombres + ' ' + c.apellidos).replace(/'/g, "\\'")}', '${c.estado || 'Activo'}')">
                <i class="bi ${esInactivo ? 'bi-person-check' : 'bi-person-x'}"></i>
            </button>
        ` : '';

        return `<tr>
            <td class="text-muted fw-semibold">#C-${String(c.id).padStart(3, '0')}</td>
            <td>
                <div class="fw-semibold">${c.nombres} ${c.apellidos}</div>
                <small class="text-muted">${c.email || ''}</small>
            </td>
            <td><small>${c.telefono || '—'}</small></td>
            <td>${numCitas}</td>
            <td>S/ ${gastoTotal.toFixed(2)}</td>
            <td><small>${ultimaCita}</small></td>
            <td><span class="status-badge ${badgeClase}">${textoEstado}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-celeste btn-compras-cliente me-1" title="Ver compras" onclick="verComprasCliente(${c.id}, '${(c.nombres + ' ' + c.apellidos).replace(/'/g, "\\'")}')"><i class="bi bi-bag"></i></button>
                ${btnEstado}
            </td>
        </tr>`;
    }).join('');
    renderPaginacionClientes(clientes);
}

// Genera los controles de paginación para la lista de clientes a la derecha del buscador con estilo unificado
function renderPaginacionClientes(clientes) {
    renderBotonesPaginacion('paginacionClientes', (clientes || []).length, CLIENTES_POR_PAGINA, _paginaClientesActual, 'irAPaginaClientes');
}

// Obtiene los clientes filtrados según el texto buscado (nombre, teléfono o correo) y filtro de última compra
function obtenerClientesFiltrados() {
    const busqueda = (document.getElementById('searchCliente')?.value || '').toLowerCase().trim();
    return _todosClientes.filter(c => {
        if (busqueda) {
            const nombre = `${c.nombres || ''} ${c.apellidos || ''}`.toLowerCase();
            const tel = (c.telefono || '').toLowerCase();
            const email = (c.email || '').toLowerCase();
            const matchBusq = nombre.includes(busqueda) || tel.includes(busqueda) || email.includes(busqueda);
            if (!matchBusq) return false;
        }
        if (_filtroEstadoCompra) {
            // Busca las compras del cliente ordenadas de la última a la primera (LIFO / mayor ID primero)
            const comprasCliente = _todasCompras
                .filter(comp => comp.usuario?.id === c.id)
                .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
            // Si no tiene compras, no califica para el filtro
            if (comprasCliente.length === 0) return false;
            // Se evalúa ÚNICAMENTE la última compra realizada (cabecera del historial)
            const ultimaCompra = comprasCliente[0];
            const estadoUltima = (ultimaCompra.estado || '').toLowerCase().trim();
            const estadoBuscado = _filtroEstadoCompra.toLowerCase().trim();
            if (estadoUltima !== estadoBuscado) return false;
        }
        return true;
    });
}

// Activa o desactiva el filtro de clientes según el estado de su última compra
function toggleFiltroCompras(estado) {
    if (_filtroEstadoCompra === estado) {
        _filtroEstadoCompra = null;
    } else {
        _filtroEstadoCompra = estado;
    }
    actualizarBotonesFiltroCompras();
    _paginaClientesActual = 1;
    renderClientes(obtenerClientesFiltrados());
}

// Sincroniza la clase active de los 3 botones de filtro de compra
function actualizarBotonesFiltroCompras() {
    const mapa = [
        { id: 'btnFiltroPorEntregar', estado: 'Por entregar' },
        { id: 'btnFiltroEntregado', estado: 'Entregado' },
        { id: 'btnFiltroSinPagar', estado: 'Sin pagar' }
    ];
    mapa.forEach(item => {
        const btn = document.getElementById(item.id);
        if (!btn) return;
        if (_filtroEstadoCompra === item.estado) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Navega a la página indicada en la paginación de clientes
function irAPaginaClientes(pagina) {
    _paginaClientesActual = pagina;
    renderClientes(obtenerClientesFiltrados());
}

// Filtra la lista completa de clientes por nombre, teléfono o email
function filtrarClientesTabla() {
    _paginaClientesActual = 1;
    renderClientes(obtenerClientesFiltrados());
}

// Solicita confirmación para inhabilitar o habilitar un cliente y actualiza su estado
function confirmarCambiarEstadoCliente(id, nombre, estadoActual) {
    const esInactivo = estadoActual === 'Inactivo';
    const nuevoEstado = esInactivo ? 'Activo' : 'Inactivo';
    const accion = esInactivo ? 'Habilitar' : 'Inhabilitar';

    mostrarModalAccion({
        titulo: `¿${accion} usuario?`,
        mensaje: esInactivo
            ? `¿Deseas habilitar al usuario "${nombre}" para que pueda acceder nuevamente al sistema?`
            : `¿Deseas inhabilitar al usuario "${nombre}"? No podrá acceder a su cuenta mientras permanezca inhabilitado.`,
        icono: esInactivo ? 'bi-person-check' : 'bi-person-x',
        colorIcono: esInactivo ? 'green' : 'red',
        textoBtn: accion,
        claseBtn: esInactivo ? 'btn-success' : 'btn-danger',
        onConfirmar: async () => {
            try {
                const resp = await fetch(`${API.usuarios}/${id}/estado`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estado: nuevoEstado })
                });
                if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}));
                    mostrarToast(err.error || `No se pudo ${accion.toLowerCase()} al usuario`, 'error');
                    return;
                }
                bootstrap.Modal.getInstance(document.getElementById('modalEliminar'))?.hide();
                mostrarToast(`Usuario "${nombre}" marcado como ${nuevoEstado}`, 'success');
                await cargarClientes();
            } catch (e) {
                mostrarToast('Error de conexión', 'error');
            }
        }
    });
}

// Muestra el modal con el historial de compras de un cliente (semana actual, última compra primero, paginado si > 5)
function verComprasCliente(idCliente, nombre) {
    document.getElementById('nombreClienteCompras').textContent = nombre;
    const modalEl = document.getElementById('modalComprasCliente');
    if (modalEl && !modalEl.dataset.comprasCleanup) {
        modalEl.dataset.comprasCleanup = 'true';
        modalEl.addEventListener('hidden.bs.modal', () => limpiarPortalesSelect('compras'));
    }
    const comprasCliente = _todasCompras
        .filter(c => c.usuario?.id === idCliente)
        .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));

    // Solo se muestran las compras de la semana actual para evitar acumulación
    _comprasModalActuales = comprasCliente.filter(c => fechaEstaSemana(c.fecha));
    _paginaComprasModalActual = 1;
    renderTablaComprasCliente();
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

// Renderiza tabla con las compras de un cliente y select para cambiar estado
function renderTablaComprasCliente() {
    limpiarPortalesSelect('compras');
    const tbody = document.getElementById('tablaComprasCliente');
    if (!tbody) return;
    if (!_comprasModalActuales || _comprasModalActuales.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No hay compras registradas esta semana</td></tr>`;
        renderPaginacionComprasModal(0);
        return;
    }

    const totalPaginas = Math.max(1, Math.ceil(_comprasModalActuales.length / COMPRAS_MODAL_POR_PAGINA));
    if (_paginaComprasModalActual > totalPaginas) _paginaComprasModalActual = totalPaginas;
    if (_paginaComprasModalActual < 1) _paginaComprasModalActual = 1;
    const inicio = (_paginaComprasModalActual - 1) * COMPRAS_MODAL_POR_PAGINA;
    const paginaCompras = _comprasModalActuales.slice(inicio, inicio + COMPRAS_MODAL_POR_PAGINA);

    const badgeEstado = { 'Entregado': 'bg-success', 'Por entregar': 'bg-warning', 'Sin pagar': 'bg-danger' };
    tbody.innerHTML = paginaCompras.map(c => {
        const productos = (c.detalles || []).map(d => `${d.producto?.nombre || 'Prod.'} x${d.cantidad}`).join(', ') || '—';
        const claseEstado = badgeEstado[c.estado] || 'bg-secondary';
        const opciones = ['Por entregar', 'Entregado', 'Sin pagar'].map(e => `<option value="${e}" ${e === c.estado ? 'selected' : ''}>${e}</option>`).join('');
        return `<tr>
            <td class="fw-semibold col-compra-id">#C-${String(c.id).padStart(3, '0')}</td>
            <td><small>${productos}</small></td>
            <td class="fw-semibold text-primary col-compra-total">S/ ${(c.total || 0).toFixed(2)}</td>
            <td class="col-compra-pago"><span class="badge bg-info text-dark">${c.metodoPago || 'No especificado'}</span></td>
            <td class="col-compra-estado"><span class="badge ${claseEstado}" id="badgeEstadoCompra-${c.id}">${c.estado}</span></td>
            <td><select id="selectEstadoCompra-${c.id}" class="form-select form-select-sm" onchange="cambiarEstadoCompra(${c.id}, this.value)">${opciones}</select></td>
        </tr>`;
    }).join('');

    renderPaginacionComprasModal(_comprasModalActuales.length);

    paginaCompras.forEach(c => iniciarSelectPersonalizado(`selectEstadoCompra-${c.id}`, {
        portal: true,
        portalOwner: 'compras',
        wrapperClass: 'modal-compras-select'
    }));
}

// Renderiza paginación en el footer del modal sólo si sobrepasa 5 compras
function renderPaginacionComprasModal(totalRegistros) {
    const cont = document.getElementById('paginacionComprasModal');
    if (!cont) return;
    if (!totalRegistros || totalRegistros <= COMPRAS_MODAL_POR_PAGINA) {
        cont.innerHTML = '';
        return;
    }
    renderBotonesPaginacion('paginacionComprasModal', totalRegistros, COMPRAS_MODAL_POR_PAGINA, _paginaComprasModalActual, 'irAPaginaComprasModal');
}

// Cambia de página dentro del modal de compras
function irAPaginaComprasModal(pagina) {
    _paginaComprasModalActual = pagina;
    renderTablaComprasCliente();
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
        const compraModal = _comprasModalActuales.find(c => c.id === idCompra);
        if (compraModal) compraModal.estado = nuevoEstado;
        mostrarToast(`Compra marcada como ${nuevoEstado}`, 'success');
        await cargarClientes();
    } catch (e) {
        mostrarToast('Error de conexión', 'error');
    }
}

// Muestra un toast genérico para feedback (success | warning | error)
function mostrarToast(mensaje, tipo = 'success') {
    const toast = document.getElementById('toastExito');
    const toastMsg = document.getElementById('toastMensaje');
    const toastIcon = document.getElementById('toastIcono');
    if (!toast) return;
    const estilos = {
        success: { fondo: 'text-bg-success', icono: 'bi-check-circle-fill', cierreBlanco: true, delay: 3500 },
        warning: { fondo: 'text-bg-warning text-dark', icono: 'bi-exclamation-triangle-fill', cierreBlanco: false, delay: 4500 },
        error: { fondo: 'text-bg-danger', icono: 'bi-exclamation-triangle-fill', cierreBlanco: true, delay: 3500 }
    };
    const cfg = estilos[tipo] || estilos.error;
    toast.className = `toast align-items-center border-0 ${cfg.fondo}`;
    if (toastIcon) {
        toastIcon.className = `bi ${cfg.icono} me-2 fs-5`;
    }
    const btnCerrar = toast.querySelector('.btn-close');
    if (btnCerrar) {
        btnCerrar.classList.toggle('btn-close-white', cfg.cierreBlanco);
    }
    if (toastMsg) {
        toastMsg.style.whiteSpace = 'pre-line';
        toastMsg.textContent = mensaje;
    }
    bootstrap.Toast.getInstance(toast)?.dispose();
    new bootstrap.Toast(toast, { delay: cfg.delay }).show();
}

// Alterna el estado de la campana entre activa (bi-bell) y silenciada (bi-bell-slash)
function toggleCampana() {
    const btn = document.getElementById('btnCampana');
    const icono = document.getElementById('iconoCampana');
    if (!btn || !icono) return;
    const silenciada = btn.classList.toggle('bell-muted');
    icono.className = silenciada ? 'bi bi-bell-slash' : 'bi bi-bell';
    btn.title = silenciada ? 'Notificaciones silenciadas' : 'Notificaciones activas';
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
        const breadcrumb = document.getElementById('topbarBreadcrumb');
        const nombreCompleto = `${nombres} ${apellidos}`.trim();
        if (avatar) avatar.textContent = iniciales;
        if (menu) menu.textContent = nombreCompleto;
        if (breadcrumb) breadcrumb.textContent = `Administrador ${nombreCompleto}`;
        bootstrap.Modal.getInstance(document.getElementById('modalEditarDatos'))?.hide();
        mostrarToast('Datos actualizados correctamente', 'success');
    } catch (e) {
        errorEl.textContent = 'Error de conexión';
        errorEl.classList.remove('d-none');
    }
}
