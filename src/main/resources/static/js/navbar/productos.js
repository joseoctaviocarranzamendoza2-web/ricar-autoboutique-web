// Categoría actualmente filtrada, cantidad seleccionada, producto en detalle y estado del carrito
let catActual = 'todos';
let cantidad = 1;
let productoActualId = null;
let carrito = [];
let _productosDB = [];
let _categoriasDB = [];
let metodoPagoSeleccionado = null;

// Inicialización: Carga categorías y productos al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    await cargarCategoriasFiltro();
    await cargarProductosDesdeDB();
});

// Solicita las categorías al backend y renderiza los botones de filtro
async function cargarCategoriasFiltro() {
    try {
        const resp = await fetch('/api/categorias');
        _categoriasDB = await resp.json();
        renderBotonesCategoria();
    } catch (e) {
        console.error('Error cargando categorias:', e);
    }
}

// Renderiza botones de categoría con iconos heurísticos
function renderBotonesCategoria() {
    const cont = document.querySelector('.filtros-cats');
    if (!cont) return;
    const iconos = { 'herramienta': 'bi-wrench-adjustable', 'repuesto': 'bi-cpu', 'aceite': 'bi-droplet-half', 'perno': 'bi-nut', 'filtro': 'bi-funnel' };
    let html = `<button class="btn-cat activo" data-cat="todos" onclick="cambiarCat(this)"><i class="bi bi-grid-fill me-1"></i>Todos</button>`;
    _categoriasDB.forEach(c => {
        const key = c.nombre.toLowerCase();
        const iconKey = Object.keys(iconos).find(k => key.includes(k));
        const icono = iconKey ? iconos[iconKey] : 'bi-tag';
        html += `<button class="btn-cat" data-cat="${c.id}" onclick="cambiarCat(this)"><i class="bi ${icono} me-1"></i>${c.nombre}</button>`;
    });
    cont.innerHTML = html;
}

// Carga productos desde la API y muestra spinner / mensajes de error si corresponde
async function cargarProductosDesdeDB() {
    const grid = document.getElementById('gridProductos');
    if (!grid) return;
    grid.innerHTML = `<div class="col-12 text-center py-5 text-muted"><div class="spinner-border text-primary mb-3" style="width:3rem;height:3rem;"></div><p class="fw-semibold">Cargando productos...</p></div>`;
    try {
        const resp = await fetch('/api/productos');
        if (!resp.ok) throw new Error('Error al cargar productos');
        _productosDB = await resp.json();
        if (_productosDB.length === 0) {
            grid.innerHTML = `<div class="col-12 text-center py-5 text-muted"><i class="bi bi-box-seam display-4 d-block mb-3"></i><p class="fw-semibold">No hay productos disponibles aún.</p><p class="small">El administrador debe cargar el catálogo de productos.</p></div>`;
            document.getElementById('contadorProductos').innerHTML = 'Mostrando <strong>0</strong> productos';
            return;
        }
        renderizarProductos(_productosDB);
    } catch (e) {
        console.error('Error cargando productos:', e);
        grid.innerHTML = `<div class="col-12 text-center py-5 text-muted"><i class="bi bi-wifi-off display-4 d-block mb-3 text-danger"></i><p class="fw-semibold">Error de conexión al cargar productos.</p><button class="btn btn-primary mt-2" onclick="cargarProductosDesdeDB()"><i class="bi bi-arrow-clockwise me-1"></i>Reintentar</button></div>`;
    }
}

// Renderiza la cuadrícula de productos a partir del array proporcionado
function renderizarProductos(productos) {
    const grid = document.getElementById('gridProductos');
    if (!grid) return;
    grid.innerHTML = productos.map(p => {
        const catId = p.categoria?.id ? String(p.categoria.id) : 'sin-categoria';
        const catNombre = p.categoria?.nombre || 'Sin categoría';
        const nombreLower = p.nombre.toLowerCase();
        const imagen = p.imagen ? `<img src="${p.imagen}" alt="${p.nombre}" style="width:100%;height:100%;object-fit:cover;">` : `<i class="bi bi-box-seam" style="font-size:3rem;color:#adb5bd;"></i>`;
        const badgeMap = { 'Nuevo': 'badge-prod nuevo', 'Oferta': 'badge-prod oferta', 'Popular': 'badge-prod popular' };
        const badgeHtml = p.etiqueta && badgeMap[p.etiqueta] ? `<span class="${badgeMap[p.etiqueta]}">${p.etiqueta}</span>` : (p.stock <= 5 ? `<span class="badge-prod" style="background:#dc3545;">Stock bajo</span>` : '');
        const nombreEsc = p.nombre.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const descEsc = (p.descripcion || 'Sin descripción disponible.').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const imgSrc = p.imagen || '';
        const precio = `S/ ${p.precio.toFixed(2)}`;
        return `<div class="col-12 col-md-4 col-lg-3 prod-item" data-cat="${catId}" data-nombre="${nombreLower}" data-precio="${p.precio}" data-id="${p.id}">
            <div class="card-prod h-100">
                <div class="card-prod-img">${imagen}${badgeHtml}</div>
                <div class="card-prod-body">
                    <span class="prod-cat">${catNombre}</span>
                    <h6 class="prod-nombre">${p.nombre}</h6>
                    <div class="prod-footer">
                        <span class="prod-precio">${precio}</span>
                        <button class="btn-prod-add" data-bs-toggle="modal" data-bs-target="#modalProductoDetalle" onclick="verDetalle(${p.id}, '${nombreEsc}', '${precio}', '${catNombre}', '${imgSrc}', '${descEsc}')"><i class="bi bi-eye me-1"></i>Ver</button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
    document.getElementById('contadorProductos').innerHTML = `Mostrando <strong>${productos.length}</strong> producto${productos.length !== 1 ? 's' : ''}`;
    document.getElementById('sinResultados')?.classList.add('d-none');
}

// Cambia la categoría activa y filtra la vista
function cambiarCat(btn) {
    document.querySelectorAll('.btn-cat').forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');
    catActual = btn.dataset.cat;
    filtrarProductos();
}

// Filtra y ordena los productos mostrados según búsqueda, categoría y criterio
function filtrarProductos() {
    const busqueda = (document.getElementById('inputBusqueda')?.value || '').toLowerCase().trim();
    const orden = document.getElementById('selectOrden')?.value || 'default';
    const items = Array.from(document.querySelectorAll('.prod-item'));
    let visibles = 0;
    items.forEach(item => {
        const matchCat = catActual === 'todos' || item.dataset.cat === catActual;
        const matchBusq = item.dataset.nombre.includes(busqueda);
        item.style.display = (matchCat && matchBusq) ? '' : 'none';
        if (matchCat && matchBusq) visibles++;
    });
    const grid = document.getElementById('gridProductos');
    const visiblesArr = items.filter(i => i.style.display !== 'none');
    if (orden === 'precio-asc') visiblesArr.sort((a, b) => +a.dataset.precio - +b.dataset.precio);
    if (orden === 'precio-desc') visiblesArr.sort((a, b) => +b.dataset.precio - +a.dataset.precio);
    if (orden === 'nombre') visiblesArr.sort((a, b) => a.dataset.nombre.localeCompare(b.dataset.nombre));
    visiblesArr.forEach(item => grid.appendChild(item));
    document.getElementById('contadorProductos').innerHTML = `Mostrando <strong>${visibles}</strong> producto${visibles !== 1 ? 's' : ''}`;
    document.getElementById('sinResultados')?.classList.toggle('d-none', visibles > 0);
}

// Restablece filtros y orden a sus valores por defecto
function resetFiltros() {
    document.getElementById('inputBusqueda').value = '';
    catActual = 'todos';
    document.querySelectorAll('.btn-cat').forEach(b => b.classList.remove('activo'));
    document.querySelector('.btn-cat[data-cat="todos"]')?.classList.add('activo');
    document.getElementById('selectOrden').value = 'default';
    filtrarProductos();
}

// Muestra el modal de detalle y precarga datos del producto seleccionado
function verDetalle(idDB, nombre, precio, cat, img, desc) {
    productoActualId = idDB;
    cantidad = 1;
    document.getElementById('detNombre').textContent = nombre;
    document.getElementById('detNombreGrande').textContent = nombre;
    document.getElementById('detPrecio').textContent = precio;
    document.getElementById('detCat').textContent = cat;
    document.getElementById('detCatBadge').textContent = cat;
    document.getElementById('detImg').src = img || '';
    document.getElementById('detImg').alt = nombre;
    document.getElementById('detDesc').textContent = desc || 'Sin descripción disponible.';
    document.getElementById('cantValor').textContent = '1';
    const prod = _productosDB.find(p => p.id === idDB);
    const stockEl = document.getElementById('detStock');
    if (stockEl && prod) {
        if (prod.stock <= 0) {
            stockEl.innerHTML = '<i class="bi bi-x-circle-fill text-danger me-1"></i>Sin stock';
        } else if (prod.stock <= 5) {
            stockEl.innerHTML = `<i class="bi bi-exclamation-circle-fill text-warning me-1"></i>Stock bajo (${prod.stock})`;
        } else {
            stockEl.innerHTML = '<i class="bi bi-check-circle-fill text-success me-1"></i>En stock';
        }
    }
    document.getElementById('detWhatsapp').href = `https://wa.me/51955052062?text=Hola, me interesa: ${encodeURIComponent(nombre)} (${precio})`;
}

// Cambia la cantidad a seleccionar en el modal de detalle, respetando stock
function cambiarCant(delta) {
    const prod = _productosDB.find(p => p.id === productoActualId);
    const maxStock = prod ? prod.stock : 99;
    cantidad = Math.max(1, Math.min(maxStock, cantidad + delta));
    document.getElementById('cantValor').textContent = cantidad;
}

// Cierra el modal actual y abre el modal de login (usado cuando el usuario no está autenticado)
function cerrarModalYAbrirLogin(modalIdActual) {
    const modalActual = document.getElementById(modalIdActual);
    const instancia = bootstrap.Modal.getInstance(modalActual);
    if (instancia) {
        modalActual.addEventListener('hidden.bs.modal', function handler() {
            abrirModal('modalLogin');
            modalActual.removeEventListener('hidden.bs.modal', handler);
        });
        instancia.hide();
    } else {
        abrirModal('modalLogin');
    }
}

// Agrega el producto al carrito local (valida sesión, rol y stock)
function agregarAlCarrito() {
    const sesion = obtenerSesion();
    if (!sesion) {
        cerrarModalYAbrirLogin('modalProductoDetalle');
        return;
    }
    if (sesion.rol !== 'cliente') {
        mostrarAlertaCompra('Solo los clientes pueden realizar compras. Inicia sesión con una cuenta de cliente.', 'warning');
        return;
    }
    if (!productoActualId) return;
    const prod = _productosDB.find(p => p.id === productoActualId);
    if (!prod) return;
    if (prod.stock <= 0) {
        mostrarAlertaCompra('Este producto no tiene stock disponible.', 'warning');
        return;
    }
    const cant = parseInt(document.getElementById('cantValor').textContent) || 1;
    const existente = carrito.find(i => i.id === productoActualId);
    if (existente) {
        const nuevoTotal = existente.cantidad + cant;
        if (nuevoTotal > prod.stock) {
            mostrarAlertaCompra(`Solo hay ${prod.stock} unidades disponibles de "${prod.nombre}".`, 'warning');
            return;
        }
        existente.cantidad = nuevoTotal;
    } else {
        carrito.push({ id: prod.id, nombre: prod.nombre, precio: prod.precio, cantidad: cant, imagen: prod.imagen || '' });
    }
    bootstrap.Modal.getInstance(document.getElementById('modalProductoDetalle'))?.hide();
    actualizarBadgeCarrito();
    mostrarToastCarrito(prod.nombre, cant, (prod.precio * cant).toFixed(2));
}

// Actualiza el contador/badge del carrito en la cabecera
function actualizarBadgeCarrito() {
    const total = carrito.reduce((acc, i) => acc + i.cantidad, 0);
    let badge = document.getElementById('carrito-badge');
    if (!badge) {
        const btn = document.getElementById('btn-carrito');
        if (btn) {
            badge = document.createElement('span');
            badge.id = 'carrito-badge';
            badge.className = 'badge bg-danger ms-1';
            btn.appendChild(badge);
        }
    }
    if (badge) badge.textContent = total > 0 ? total : '';
}

// Muestra un toast con detalle de agregado al carrito y enlace rápido a abrir carrito
function mostrarToastCarrito(producto, cant, total) {
    if (!document.getElementById('toastCarrito')) {
        document.body.insertAdjacentHTML('beforeend', `
        <div id="toastCarrito" class="toast align-items-center text-white bg-success border-0" role="alert" style="position:fixed;bottom:20px;right:20px;z-index:9999;">
            <div class="d-flex">
                <div class="toast-body" id="toastCarritoBody"></div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>`);
    }
    document.getElementById('toastCarritoBody').innerHTML = `<strong>${producto}</strong><br>Cantidad: ${cant} | Total: S/ ${parseFloat(total).toFixed(2)}<br><a href="#" onclick="abrirCarrito()" class="text-white fw-bold">Ver carrito</a>`;
    new bootstrap.Toast(document.getElementById('toastCarrito')).show();
}

// Abre el modal del carrito (valida sesión y rol)
function abrirCarrito() {
    const sesion = obtenerSesion();
    if (!sesion) {
        abrirModal('modalLogin');
        return;
    }
    if (sesion.rol !== 'cliente') {
        mostrarToastCarritoSimple('Solo los clientes pueden realizar compras.');
        return;
    }
    renderCarritoModal();
    abrirModal('modalCarrito');
}

// Muestra un toast simple para casos donde el usuario no puede comprar
function mostrarToastCarritoSimple(msg) {
    if (!document.getElementById('toastCarrito')) {
        document.body.insertAdjacentHTML('beforeend', `
        <div id="toastCarrito" class="toast align-items-center text-white bg-warning border-0" role="alert" style="position:fixed;bottom:20px;right:20px;z-index:9999;">
            <div class="d-flex">
                <div class="toast-body" id="toastCarritoBody"></div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>`);
    }
    document.getElementById('toastCarritoBody').innerHTML = msg;
    new bootstrap.Toast(document.getElementById('toastCarrito')).show();
}

// Renderiza las filas del carrito en el modal con controles para cambiar cantidades y eliminar
function renderCarritoModal() {
    const tbody = document.getElementById('tbody-carrito');
    const totalEl = document.getElementById('carrito-total');
    const btnCom = document.getElementById('btnConfirmarCompra');
    if (carrito.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Tu carrito está vacío</td></tr>`;
        if (totalEl) totalEl.textContent = 'S/ 0.00';
        if (btnCom) btnCom.disabled = true;
        return;
    }
    if (btnCom) btnCom.disabled = false;
    tbody.innerHTML = carrito.map((item, i) => `
    <tr>
        <td>${item.imagen ? `<img src="${item.imagen}" alt="${item.nombre}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;margin-right:8px;">` : '<i class="bi bi-box-seam me-2"></i>'}${item.nombre}</td>
        <td>S/ ${item.precio.toFixed(2)}</td>
        <td><div class="d-flex align-items-center gap-1"><button class="btn btn-sm btn-outline-secondary" onclick="cambiarCantCarrito(${i}, -1)">−</button><span>${item.cantidad}</span><button class="btn btn-sm btn-outline-secondary" onclick="cambiarCantCarrito(${i}, 1)">+</button></div></td>
        <td>S/ ${(item.precio * item.cantidad).toFixed(2)}</td>
        <td><button class="btn btn-sm btn-outline-danger" onclick="eliminarDelCarrito(${i})"><i class="bi bi-trash"></i></button></td>
    </tr>`).join('');
    const totalVal = carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
    if (totalEl) totalEl.textContent = `S/ ${totalVal.toFixed(2)}`;
}

// Cambia cantidad de un item dentro del carrito
function cambiarCantCarrito(index, delta) {
    const item = carrito[index];
    const prod = _productosDB.find(p => p.id === item.id);
    const maxStock = prod ? prod.stock : 99;
    item.cantidad = Math.max(1, Math.min(maxStock, item.cantidad + delta));
    renderCarritoModal();
    actualizarBadgeCarrito();
}

// Elimina elemento del carrito
function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    renderCarritoModal();
    actualizarBadgeCarrito();
}

// Inicia el flujo de compra (abre modal de método de pago)
function confirmarCompra() {
    const sesion = obtenerSesion();
    if (!sesion || carrito.length === 0) return;
    abrirModalMetodoPago();
}

// Crea o abre el modal de selección de método de pago y configura handlers internos
function abrirModalMetodoPago() {
    let modal = document.getElementById('modalMetodoPago');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
        <div class="modal fade" id="modalMetodoPago" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header" style="background:var(--azul-oscuro,#0d1b2a);">
                        <h5 class="modal-title text-white fw-bold"><i class="bi bi-credit-card me-2"></i>Selecciona tu método de pago</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted small mb-3">Total a pagar: <strong id="pagoTotalMostrado">S/ 0.00</strong></p>
                        <div class="d-flex flex-column gap-2" id="opcionesPago">
                            <button class="btn btn-outline-primary text-start d-flex align-items-center gap-2" data-metodo="Efectivo"><i class="bi bi-cash-coin fs-5"></i> Efectivo (al recoger)</button>
                            <button class="btn btn-outline-primary text-start d-flex align-items-center gap-2" data-metodo="Tarjeta BCP"><i class="bi bi-credit-card fs-5"></i> Tarjeta BCP</button>
                            <button class="btn btn-outline-primary text-start d-flex align-items-center gap-2" data-metodo="Tarjeta Interbank"><i class="bi bi-credit-card fs-5"></i> Tarjeta Interbank</button>
                            <button class="btn btn-outline-primary text-start d-flex align-items-center gap-2" data-metodo="Tarjeta BBVA"><i class="bi bi-credit-card fs-5"></i> Tarjeta BBVA</button>
                            <button class="btn btn-outline-primary text-start d-flex align-items-center gap-2" data-metodo="Yape"><i class="bi bi-phone fs-5"></i> Yape</button>
                            <button class="btn btn-outline-primary text-start d-flex align-items-center gap-2" data-metodo="Plin"><i class="bi bi-phone fs-5"></i> Plin</button>
                        </div>
                        <div id="metodoPagoError" class="alert alert-danger py-2 text-center mt-3 d-none">Selecciona un método de pago para continuar.</div>
                    </div>
                    <div class="modal-footer border-0 justify-content-between">
                        <button type="button" class="btn btn-outline-secondary" id="btnVolverCarrito"><i class="bi bi-arrow-left me-1"></i>Volver al carrito</button>
                        <button type="button" class="btn btn-primary fw-semibold" id="btnFinalizarPago"><i class="bi bi-check-circle me-2"></i>Confirmar pago</button>
                    </div>
                </div>
            </div>
        </div>`);
        modal = document.getElementById('modalMetodoPago');
        // Configura los botones de selección de método dentro del modal
        modal.querySelectorAll('#opcionesPago button').forEach(btn => {
            btn.addEventListener('click', function () {
                modal.querySelectorAll('#opcionesPago button').forEach(b => b.classList.remove('active', 'btn-primary'));
                modal.querySelectorAll('#opcionesPago button').forEach(b => b.classList.add('btn-outline-primary'));
                this.classList.remove('btn-outline-primary');
                this.classList.add('active', 'btn-primary');
                metodoPagoSeleccionado = this.dataset.metodo;
                document.getElementById('metodoPagoError')?.classList.add('d-none');
            });
        });
        // Volver al carrito desde el modal de pago
        document.getElementById('btnVolverCarrito')?.addEventListener('click', () => {
            bootstrap.Modal.getInstance(modal)?.hide();
            modal.addEventListener('hidden.bs.modal', function handler() {
                abrirModal('modalCarrito');
                modal.removeEventListener('hidden.bs.modal', handler);
            }, { once: true });
        });
        // Confirmar pago: invoca la función que procesa compra y pago
        document.getElementById('btnFinalizarPago')?.addEventListener('click', procesarPagoYCompra);
    }
    const totalVal = carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
    document.getElementById('pagoTotalMostrado').textContent = `S/ ${totalVal.toFixed(2)}`;
    metodoPagoSeleccionado = null;
    modal.querySelectorAll('#opcionesPago button').forEach(b => {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-outline-primary');
    });
    document.getElementById('metodoPagoError')?.classList.add('d-none');
    // Si venimos del modal carrito, lo cerramos y abrimos modalMetodoPago al ocultarse
    bootstrap.Modal.getInstance(document.getElementById('modalCarrito'))?.hide();
    document.getElementById('modalCarrito').addEventListener('hidden.bs.modal', function handler() {
        abrirModal('modalMetodoPago');
        document.getElementById('modalCarrito').removeEventListener('hidden.bs.modal', handler);
    }, { once: true });
}

// Procesa el pago y crea la compra en el backend, mostrando estados y feedback al usuario
async function procesarPagoYCompra() {
    const sesion = obtenerSesion();
    if (!sesion || carrito.length === 0) return;
    if (!metodoPagoSeleccionado) {
        document.getElementById('metodoPagoError')?.classList.remove('d-none');
        return;
    }
    const btn = document.getElementById('btnFinalizarPago');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando pago...';
    try {
        const items = carrito.map(item => ({ idProducto: item.id, cantidad: item.cantidad }));
        const resp = await fetch('/api/compras', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idUsuario: sesion.id, items, metodoPago: metodoPagoSeleccionado }) });
        if (resp.status === 400) {
            const err = await resp.json();
            mostrarAlertaCompra(err.error || 'Error al procesar la compra', 'danger');
            bootstrap.Modal.getInstance(document.getElementById('modalMetodoPago'))?.hide();
            return;
        }
        if (!resp.ok) throw new Error('Error del servidor');
        const data = await resp.json();
        // Actualiza caché de productos tras compra y limpia carrito local
        fetch('/api/productos').then(r => r.json()).then(p => { _productosDB = p; }).catch(() => { });
        carrito = [];
        actualizarBadgeCarrito();
        bootstrap.Modal.getInstance(document.getElementById('modalMetodoPago'))?.hide();
        // Al cerrarse el modal, mostrar toast de éxito con resumen
        document.getElementById('modalMetodoPago').addEventListener('hidden.bs.modal', function handler() {
            mostrarToastCarrito('Compra realizada', 0, '0');
            const toastBody = document.getElementById('toastCarritoBody');
            if (toastBody) {
                toastBody.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i>Compra exitosa. Total: S/ ${data.total?.toFixed(2) || '—'} (${metodoPagoSeleccionado})`;
            }
            document.getElementById('modalMetodoPago').removeEventListener('hidden.bs.modal', handler);
        }, { once: true });
    } catch (e) {
        console.error(e);
        mostrarAlertaCompra('Error de conexión. Intenta de nuevo.', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Confirmar pago';
    }
}

// Muestra una alerta tipo banner sobre el estado de la compra
function mostrarAlertaCompra(msg, tipo) {
    const alerta = document.getElementById('alertaCompra');
    if (!alerta) return;
    alerta.className = `alert alert-${tipo} py-2 text-center`;
    alerta.textContent = msg;
    alerta.classList.remove('d-none');
    setTimeout(() => alerta.classList.add('d-none'), 4000);
}
