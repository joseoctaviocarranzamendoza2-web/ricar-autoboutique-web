// Endpoints usados por la vista de cliente
const API = { usuarios: '/api/usuarios', compras: '/api/compras', citas: '/api/citas', servicios: '/api/servicios' };

// Estado local: Sesión del usuario
let sesion = null;

// Inicialización: Valida sesión y carga compras/citas y componentes UI
document.addEventListener('DOMContentLoaded', async () => {
    sesion = obtenerSesion();
    if (!sesion || sesion.rol !== 'cliente') {
        window.location.href = '/inicio';
        return;
    }
    actualizarNavbar();
    await Promise.all([cargarCompras(), cargarCitas()]);
    poblarPerfil();
    iniciarEdicion();
    iniciarBuscadorCompras();
    iniciarFiltrosServicios();
    iniciarSincronizacionUrl();
});

// Sincroniza la pestaña activa con la URL del navegador al usar los botones de atrás/adelante
window.addEventListener('popstate', (e) => {
    if (e.state?.tab) activarTab(e.state.tab);
});

// Rellena el perfil del cliente con datos de la sesión
function poblarPerfil() {
    document.getElementById('hero-nombre').textContent = `${sesion.nombres} ${sesion.apellidos}`;
    document.getElementById('inp-nombres').value = sesion.nombres || '';
    document.getElementById('inp-apellidos').value = sesion.apellidos || '';
    document.getElementById('inp-email').value = sesion.email || '';
    document.getElementById('inp-tel').value = sesion.telefono || '';
    const inpCiudad = document.getElementById('inp-ciudad');
    if (inpCiudad) inpCiudad.value = sesion.ciudad || 'Trujillo';
}

// Habilita la edición inline del perfil (guardar, cancelar)
function iniciarEdicion() {
    const btnEditar = document.getElementById('btnEditar');
    const btnGuardar = document.getElementById('btnGuardar');
    const btnCancelar = document.getElementById('btnCancelar');
    const accionesWrap = document.getElementById('acciones-editar');
    const alerta = document.getElementById('alertaGuardado');
    const inputsEditables = ['inp-nombres', 'inp-apellidos', 'inp-tel', 'inp-ciudad'].map(id => document.getElementById(id)).filter(Boolean);
    let valoresOriginales = {};
    if (!btnEditar) return;
    btnEditar.addEventListener('click', () => {
        inputsEditables.forEach(inp => {
            valoresOriginales[inp.id] = inp.value;
            inp.disabled = false;
        });
        accionesWrap.classList.remove('d-none');
        alerta.classList.add('d-none');
        btnEditar.innerHTML = '<i class="bi bi-pencil-fill me-1"></i>Editando…';
        btnEditar.disabled = true;
    });
    btnGuardar.addEventListener('click', async () => {
        const nombres = document.getElementById('inp-nombres').value.trim();
        const apellidos = document.getElementById('inp-apellidos').value.trim();
        const telefono = document.getElementById('inp-tel').value.trim();
        const ciudad = document.getElementById('inp-ciudad')?.value.trim() || 'Trujillo';
        if (!nombres || !apellidos) {
            mostrarToast('Nombres y apellidos son obligatorios', 'error');
            return;
        }
        if (!/^9[0-9]{8}$/.test(telefono)) {
            mostrarToast('El teléfono debe empezar con 9 y tener 9 dígitos', 'error');
            return;
        }
        try {
            const resp = await fetch(`${API.usuarios}/${sesion.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombres, apellidos, telefono, ciudad }) });
            if (!resp.ok) {
                mostrarToast('Error al guardar los cambios', 'error');
                return;
            }
            sesion.nombres = nombres;
            sesion.apellidos = apellidos;
            sesion.telefono = telefono;
            sesion.ciudad = ciudad;
            guardarSesion(sesion);
            document.getElementById('hero-nombre').textContent = `${nombres} ${apellidos}`;
            inputsEditables.forEach(inp => inp.disabled = true);
            accionesWrap.classList.add('d-none');
            alerta.classList.remove('d-none');
            setTimeout(() => alerta.classList.add('d-none'), 3500);
            resetBtnEditar();
            mostrarToast('Perfil actualizado correctamente', 'success');
        } catch (e) {
            mostrarToast('Error de conexión', 'error');
        }
    });
    btnCancelar.addEventListener('click', () => {
        inputsEditables.forEach(inp => {
            inp.value = valoresOriginales[inp.id] ?? '';
            inp.disabled = true;
        });
        accionesWrap.classList.add('d-none');
        alerta.classList.add('d-none');
        resetBtnEditar();
    });
    function resetBtnEditar() {
        btnEditar.innerHTML = '<i class="bi bi-pencil me-1"></i>Editar';
        btnEditar.disabled = false;
    }
}

// Carga las compras del cliente desde la API y renderiza historiales
async function cargarCompras() {
    try {
        const resp = await fetch(`${API.compras}?usuario=${sesion.id}`);
        if (!resp.ok) return;
        const compras = await resp.json();
        renderCompras(compras);
        actualizarKPIs(compras, null);
        renderHistorial(compras, null);
    } catch (e) {
        console.error('Error cargando compras:', e);
    }
}

// Renderiza la tabla o lista de compras del cliente
function renderCompras(compras) {
    const tbody = document.getElementById('tbody-compras');
    if (!tbody) return;
    if (compras.length === 0) {
        tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center text-muted py-4">No tienes compras realizadas aún.</td>
        </tr>`;
        return;
    }
    const badgeEstado = { 'Entregado': 'verde', 'Por entregar': 'amarillo', 'Sin pagar': 'rojo' };
    tbody.innerHTML = compras.map(c => {
        const productos = c.detalles ? c.detalles.map(d => `${d.producto?.nombre || 'Producto'} x${d.cantidad}`).join(', ') : '—';
        const cantTotal = c.detalles ? c.detalles.reduce((acc, d) => acc + d.cantidad, 0) : 0;
        const colorBadge = badgeEstado[c.estado] || 'gris';
        return `
        <tr>
            <td class="fw-semibold text-muted">#C-${String(c.id).padStart(3, '0')}</td>
            <td>${productos}</td>
            <td>${cantTotal}</td>
            <td class="fw-semibold" style="color:var(--azul-medio)">
                S/ ${c.total.toFixed(2)}
            </td>
            <td>${c.fecha || '—'}</td>
            <td>
                <span class="u-badge ${colorBadge}">${c.estado}</span>
            </td>
            <td>
                <button class="btn-ver" title="Ver detalle" onclick="verDetalleCompra(${c.id})"><i class="bi bi-eye"></i></button>
            </td>
        </tr>`;
    }).join('');
}

// Carga las citas del cliente y actualiza la UI correspondiente
async function cargarCitas() {
    try {
        const resp = await fetch(`${API.citas}?usuario=${sesion.id}`);
        if (!resp.ok) return;
        const citas = await resp.json();
        renderCitas(citas);
        actualizarKPIs(null, citas);
        renderHistorial(null, citas);
    } catch (e) {
        console.error('Error cargando citas:', e);
    }
}

// Renderiza las tarjetas de citas del cliente
function renderCitas(citas) {
    const grid = document.getElementById('grid-servicios');
    if (!grid) return;
    if (citas.length === 0) {
        grid.innerHTML = `
        <div class="col-12 text-center text-muted py-5">
            <i class="bi bi-calendar-x display-4 d-block mb-3"></i>No tienes citas agendadas aún.
        </div>`;
        return;
    }
    const colores = { 'Confirmada': 'azul', 'Pendiente': 'celeste', 'Completada': 'gris', 'Cancelada': 'gris' };
    grid.innerHTML = citas.map(c => {
        const color = colores[c.estado] || 'celeste';
        const opaca = c.estado === 'Completada' || c.estado === 'Cancelada' ? 'opaca' : '';
        const precio = c.servicio?.precioBase ? `S/ ${c.servicio.precioBase.toFixed(2)}` : '—';
        const acciones = (c.estado === 'Pendiente' || c.estado === 'Confirmada') ? `<button class="btn-cita peligro" onclick="cancelarCita(${c.id}, this)">Cancelar</button>` : '';
        return `
        <div class="col-12 col-md-6" data-estado="${c.estado}">
            <div class="u-cita-card ${opaca}">
                <div class="u-cita-franja ${color}"></div>
                <div class="u-cita-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="fw-bold mb-0">${c.servicio?.nombre || 'Servicio'}</h6>
                        <span class="u-badge ${color}">${c.estado}</span>
                    </div>
                    <ul class="u-cita-meta">
                        <li><i class="bi bi-calendar-event"></i>${c.fecha} · ${c.hora}</li>
                        <li><i class="bi bi-car-front"></i>${c.vehiculo}</li>
                        <li><i class="bi bi-geo-alt"></i>Ov. Mochica 123, Trujillo
                        </li>
                    </ul>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <span class="u-cita-precio">${precio}</span>
                        <div class="d-flex gap-2">${acciones}</div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// Cancela una cita (DELETE) y anima la remoción en la UI
async function cancelarCita(id, btn) {
    const col = btn?.closest('[data-estado]');
    if (!confirm('¿Deseas cancelar esta cita?')) return;
    try {
        const resp = await fetch(`${API.citas}/${id}`, { method: 'DELETE' });
        if (!resp.ok) {
            mostrarToast('No se pudo cancelar la cita', 'error');
            return;
        }
        if (col) {
            col.style.transition = 'opacity .3s, transform .3s';
            col.style.opacity = '0';
            col.style.transform = 'scale(0.95)';
            setTimeout(() => col.remove(), 300);
        }
        mostrarToast('Cita cancelada correctamente', 'success');
    } catch (e) {
        mostrarToast('Error de conexión', 'error');
    }
}

// Caches temporales para KPIs/historial
let _comprasCache = null;
let _citasCache = null;

// Suma el total de las compras entregadas del cliente
function calcularTotalGastado() {
    const totalCompras = (_comprasCache || []).filter(c => c.estado === 'Entregado').reduce((acc, c) => acc + (c.total || 0), 0);
    const totalServicios = (_citasCache || []).filter(c => c.estado === 'Completada' && c.servicio?.precioBase).reduce((acc, c) => acc + c.servicio.precioBase, 0);
    return totalCompras + totalServicios;
}

// Actualiza KPIs visibles en el perfil (cantidad, total gastado, servicios)
function actualizarKPIs(compras, citas) {
    if (compras !== null) _comprasCache = compras;
    if (citas !== null) _citasCache = citas;
    if (_comprasCache !== null) {
        document.getElementById('kpi-compras').textContent = _comprasCache.length;
        document.getElementById('hero-compras').textContent = _comprasCache.length;
    }
    if (_citasCache !== null) {
        document.getElementById('kpi-servicios').textContent = _citasCache.length;
        document.getElementById('hero-servicios').textContent = _citasCache.length;
    }
    if (_comprasCache !== null || _citasCache !== null) {
        const totalGastado = calcularTotalGastado();
        document.getElementById('kpi-total').textContent = `S/ ${totalGastado.toFixed(2)}`;
        document.getElementById('hero-total').textContent = `S/${totalGastado.toFixed(0)}`;
    }
}

// Historial combinado de compras y citas mostrado en timeline
let _historialCompras = [];
let _historialCitas = [];

// Construye y renderiza el timeline de actividad del cliente
function renderHistorial(compras, citas) {
    if (compras !== null) _historialCompras = compras;
    if (citas !== null) _historialCitas = citas;
    const timeline = document.querySelector('.u-timeline');
    if (!timeline) return;
    let items = [];
    _historialCompras.filter(c => c.estado === 'Entregado').forEach(c => {
        const productos = c.detalles ? c.detalles.map(d => d.producto?.nombre || 'Producto').join(', ') : 'Productos';
        items.push({ tipo: 'compra', fecha: c.fecha, texto: `${productos} — S/ ${c.total.toFixed(2)}` });
    });
    _historialCitas.filter(c => c.estado !== 'Cancelada').forEach(c => {
        items.push({ tipo: c.estado === 'Completada' ? 'servicio-completado' : 'servicio-agendado', fecha: c.fecha, texto: c.estado === 'Completada' ? `${c.servicio?.nombre || 'Servicio'} — Completado` : `${c.servicio?.nombre || 'Servicio'} agendado para el ${c.fecha}` });
    });
    items.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    if (items.length === 0) {
        timeline.innerHTML = `
        <li class="u-tl-item">
            <div class="u-tl-content">
                <p class="text-muted">No hay actividad reciente.</p>
            </div>
        </li>`;
        return;
    }
    const iconos = { 'compra': { color: 'azul', icon: 'bi-bag-fill', titulo: 'Compra Entregada' }, 'servicio-completado': { color: 'verde', icon: 'bi-check-circle-fill', titulo: 'Servicio Completado' }, 'servicio-agendado': { color: 'celeste', icon: 'bi-calendar-plus-fill', titulo: 'Servicio Agendado' } };
    timeline.innerHTML = items.map((item, i) => {
        const cfg = iconos[item.tipo] || iconos['compra'];
        const ultimo = i === items.length - 1 ? 'ultimo' : '';
        return `
        <li class="u-tl-item ${ultimo}">
            <div class="u-tl-marker ${cfg.color}">
                <i class="bi ${cfg.icon}"></i>
            </div>
            <div class="u-tl-content">
                <h6 class="fw-bold mb-1">${cfg.titulo}</h6>
                <p class="text-muted mb-1 small">${item.texto}</p>
                <span class="u-tl-fecha">
                    <i class="bi bi-calendar3 me-1"></i>${item.fecha || '—'}
                </span>
            </div>
        </li>`;
    }).join('');
}

// Inicia el buscador local sobre la tabla de compras
function iniciarBuscadorCompras() {
    const input = document.getElementById('buscarCompra');
    if (!input) return;
    input.addEventListener('input', () => {
        const termino = input.value.toLowerCase().trim();
        document.querySelectorAll('#tbody-compras tr').forEach(fila => {
            fila.style.display = fila.textContent.toLowerCase().includes(termino) ? '' : 'none';
        });
    });
}

// Inicializa los filtros por estado de citas/servicios (UI)
function iniciarFiltrosServicios() {
    document.querySelectorAll('.u-filtro').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.u-filtro').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            const filtro = btn.dataset.filtro;
            document.querySelectorAll('#grid-servicios [data-estado]').forEach(col => {
                col.style.display = filtro === 'todos' || col.dataset.estado === filtro ? '' : 'none';
            });
        });
    });
}

// Sincroniza la URL del navegador con la pestaña activa, sin recargar la página
function iniciarSincronizacionUrl() {
    const mapaTabUrl = {
        'tab-perfil': 'perfil',
        'tab-compras': 'compras',
        'tab-servicios': 'servicios',
        'tab-historial': 'historial'
    };
    document.querySelectorAll('[data-bs-toggle="tab"]').forEach(btn => {
        btn.addEventListener('shown.bs.tab', (e) => {
            const tabId = e.target.getAttribute('data-bs-target').replace('#', '');
            const segmento = mapaTabUrl[tabId];
            if (segmento) {
                const nuevaUrl = `/panel/cliente/${sesion.id}/${segmento}`;
                history.pushState({ tab: tabId }, '', nuevaUrl);
            }
        });
    });
}

// Muestra detalle de compra (placeholder -> podría abrir modal)
function verDetalleCompra(id) {
    mostrarToast(`Detalle de compra #${id}`, 'info');
}

// Activa una pestaña del perfil y hace scroll a la sección
function activarTab(tabTargetId) {
    const boton = document.querySelector(`[data-bs-target="#${tabTargetId}"]`);
    if (!boton) return;
    bootstrap.Tab.getOrCreateInstance(boton).show();
    document.querySelector('.perfil-tabs-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
// Activa una pestaña del perfil y hace scroll a la sección (opcional)
function activarTab(tabTargetId, hacerScroll = true) {
    const boton = document.querySelector(`[data-bs-target="#${tabTargetId}"]`);
    if (!boton) return;
    bootstrap.Tab.getOrCreateInstance(boton).show();
    if (hacerScroll) {
        document.querySelector('.perfil-tabs-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Crea y muestra toasts transitorios personalizados
function mostrarToast(mensaje, tipo = 'info') {
    let contenedor = document.getElementById('toast-contenedor');
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'toast-contenedor';
        contenedor.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;' + 'display:flex;flex-direction:column;gap:.5rem;';
        document.body.appendChild(contenedor);
    }
    const colores = { success: { bg: '#e8f5e9', borde: '#a5d6a7', texto: '#1a6b3a', icono: 'bi-check-circle-fill' }, info: { bg: '#e3f2fd', borde: '#90caf9', texto: '#0369a1', icono: 'bi-info-circle-fill' }, error: { bg: '#fef2f2', borde: '#fca5a5', texto: '#b91c1c', icono: 'bi-x-circle-fill' } };
    const c = colores[tipo] ?? colores.info;
    const toast = document.createElement('div');
    toast.style.cssText = `
        display:flex;align-items:center;gap:.75rem;
        background:${c.bg};border:1px solid ${c.borde};color:${c.texto};
        padding:.75rem 1.1rem;border-radius:12px;font-size:.85rem;font-weight:600;
        box-shadow:0 4px 16px rgba(0,0,0,.12);max-width:340px;
    `;
    toast.innerHTML = `<i class="bi ${c.icono}" style="font-size:1.1rem;flex-shrink:0;"></i>${mensaje}`;
    contenedor.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity .3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
