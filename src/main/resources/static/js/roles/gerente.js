// Endpoints y constantes usadas por la vista de gerente
const API = { compras: '/api/compras', citas: '/api/citas', productos: '/api/productos', usuarios: '/api/usuarios', servicios: '/api/servicios' };

// Estado local: Caches de datos que usa el panel del gerente
let _compras = [];
let _citas = [];
let _productos = [];
let _usuarios = [];
let _comprasFiltradas = [];
let _citasFiltradas = [];
let _tipoVentasActivo = 'productos'; // 'productos' o 'servicios'
let _paginaVentasActual = 1;
const VENTAS_POR_PAGINA = 20;
let _anioVentas = new Date().getFullYear();

// Inicialización: Valida sesión de gerente, carga datos y configura UI
document.addEventListener('DOMContentLoaded', async () => {
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== 'gerente') {
        window.location.href = '/inicio';
        return;
    }
    const avatar = document.getElementById('gerenteNombreAvatar');
    const menu = document.getElementById('gerenteNombreMenu');
    const breadcrumb = document.getElementById('topbarBreadcrumb');
    const nombreCompleto = `${sesion.nombres || ''} ${sesion.apellidos || ''}`.trim();
    const iniciales = (sesion.nombres[0] + (sesion.apellidos?.[0] || '')).toUpperCase();
    if (avatar) avatar.textContent = iniciales;
    if (menu) menu.textContent = nombreCompleto;
    if (breadcrumb) breadcrumb.textContent = `Gerente ${nombreCompleto}`;
    await cargarTodos();
    iniciarFiltrosVentas();
});

// Carga en paralelo compras, citas, productos y usuarios
async function cargarTodos() {
    try {
        const [rCompras, rCitas, rProductos, rUsuarios] = await Promise.all([fetch('/api/compras').catch(() => null), fetch(API.citas), fetch(API.productos), fetch(API.usuarios)]);
        _compras = (rCompras && rCompras.ok) ? await rCompras.json() : [];
        _citas = rCitas.ok ? await rCitas.json() : [];
        _productos = rProductos.ok ? await rProductos.json() : [];
        _usuarios = rUsuarios.ok ? await rUsuarios.json() : [];
        _comprasFiltradas = ordenarVentasDesc(_compras);
        _citasFiltradas = ordenarVentasDesc(_citas);
        _paginaVentasActual = 1;
        renderDashboard();
        renderVentas();
        renderReportes();
        renderCharts();
    } catch (e) {
        console.error('Error cargando datos del gerente:', e);
    }
}

// Mapa entre nombre de sección y su URL real en el backend
const MAPA_SECCION_URL = {
    dashboard: 'general/resumen',
    ventas: 'analisis/ventas',
    reportes: 'analisis/reportes'
};

// Cambia la sección activa del sidebar y sincroniza la URL sin recargar
function mostrarSeccion(nombre, link) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    const sec = document.getElementById('sec-' + nombre);
    if (sec) sec.classList.add('active');
    const linkActivo = link || document.querySelector(`[data-seccion="${nombre}"]`);
    if (linkActivo) linkActivo.classList.add('active');

    const sesion = obtenerSesion();
    const segmento = MAPA_SECCION_URL[nombre];
    if (sesion && segmento) {
        history.pushState({ seccion: nombre }, '', `/panel/gerente/${sesion.id}/${segmento}`);
    }
}

// Alterna el estado del sidebar (móvil vs desktop)
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

// Cierra sidebar en vista móvil
function cerrarSidebarMobile() {
    document.getElementById('sidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebarOverlay')?.classList.remove('show');
}

// Cierra sesión de gerente (wrapper)
function cerrarSesionGerente() {
    cerrarSesion();
}

// Calcula los ingresos de servicios completados, excluyendo servicios cancelados o pendientes
function calcularIngresosServiciosCompletados(citas = _citas) {
    return (citas || []).filter(c => c.estado === 'Completada' && c.servicio?.precioBase).reduce((acc, c) => acc + c.servicio.precioBase, 0);
}

// Suma los ingresos por compras entregadas y los ingresos por servicios completados
function calcularVentasTotales() {
    const ingresosCompras = _compras.reduce((acc, c) => acc + (c.total || 0), 0);
    const ingresosServicios = calcularIngresosServiciosCompletados(_citas);
    return ingresosCompras + ingresosServicios;
}

// Renderiza KPIs y pequeños resúmenes para el dashboard del gerente
function renderDashboard() {
    const ventasTotal = calcularVentasTotales();
    const citasMes = _citas.length;
    const prodActivos = _productos.filter(p => !p.estado || p.estado === 'Activo').length;
    const clientes = _usuarios.length;
    const kpis = document.querySelectorAll('#sec-dashboard .kpi-value');
    if (kpis[0]) kpis[0].textContent = `S/ ${ventasTotal.toFixed(0)}`;
    if (kpis[1]) kpis[1].textContent = citasMes;
    if (kpis[2]) kpis[2].textContent = prodActivos;
    if (kpis[3]) kpis[3].textContent = clientes;
    const tbodyCitas = document.querySelector('#sec-dashboard tbody');
    if (tbodyCitas) {
        const proximas = _citas.filter(c => c.estado === 'Pendiente' || c.estado === 'Confirmada').slice(0, 5);
        if (proximas.length === 0) {
            tbodyCitas.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-4 align-middle">No hay citas próximas</td>
            </tr>`;
        } else {
            tbodyCitas.innerHTML = proximas.map(c => `
            <tr>
                <td class="fw-semibold text-center align-middle" style="padding-left: 1.25rem;" title="${c.usuario?.nombres || ''} ${c.usuario?.apellidos || ''}">
                    ${c.usuario?.nombres || '—'} ${c.usuario?.apellidos || ''}
                </td>
                <td class="text-center align-middle" style="white-space: normal; line-height: 1.35;" title="${c.servicio?.nombre || ''}">
                    ${c.servicio?.nombre || '—'}
                </td>
                <td class="text-center align-middle" style="white-space: normal; line-height: 1.35;">
                    <div>${c.fecha || '—'}</div>
                    ${c.hora ? `<small class="text-muted">${c.hora}</small>` : ''}
                </td>
                <td class="text-center align-middle" style="padding-right: 1.25rem;">
                    <span class="badge ${c.estado === 'Confirmada' ? 'bg-success' : 'bg-warning'} px-2 py-1">${c.estado}</span>
                </td>
            </tr>`).join('');
        }
    }
    const contadorProductos = {};
    _compras.forEach(compra => {
        (compra.detalles || []).forEach(d => {
            const nombre = d.producto?.nombre || 'Producto';
            contadorProductos[nombre] = (contadorProductos[nombre] || 0) + d.cantidad;
        });
    });
    const topProductos = Object.entries(contadorProductos).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxVentas = topProductos[0]?.[1] || 1;
    const contenedorTop = document.getElementById('productosMasVendidos');
    if (contenedorTop) {
        if (topProductos.length > 0) {
            contenedorTop.className = 'admin-card-body flex-grow-1';
            contenedorTop.innerHTML = topProductos.map(([nombre, cant], idx) => `
        <div class="${idx === topProductos.length - 1 ? 'mb-0' : 'mb-3'}">
            <div class="d-flex justify-content-between mb-1">
                <small class="fw-semibold text-truncate me-2" title="${nombre}">${nombre}</small>
                <small class="text-muted text-nowrap">${cant} uds.</small>
            </div>
            <div class="progress" style="height:8px;">
                <div class="progress-bar" style="width:${Math.round((cant / maxVentas) * 100)}%"></div>
            </div>
        </div>`).join('');
        } else {
            contenedorTop.className = 'admin-card-body flex-grow-1 d-flex flex-column justify-content-center';
            contenedorTop.innerHTML = `<p class="text-muted small text-center py-4 mb-0">No hay compras registradas aún.</p>`;
        }
    }
}

// Alterna entre la tabla de ventas de productos y ventas por servicio
function cambiarTipoVentas(tipo) {
    if (_tipoVentasActivo === tipo) return;
    _tipoVentasActivo = tipo;
    _paginaVentasActual = 1;
    const btnProd = document.getElementById('btnTabVentasProductos');
    const btnServ = document.getElementById('btnTabVentasServicios');
    if (btnProd && btnServ) {
        btnProd.className = tipo === 'productos' ? 'tab-ventas-btn active' : 'tab-ventas-btn';
        btnServ.className = tipo === 'servicios' ? 'tab-ventas-btn active' : 'tab-ventas-btn';
    }
    ejecutarFiltroVentas(false);
}

// Inicializa filtros y acciones del panel de ventas (buscar, filtrar, exportar)
function iniciarFiltrosVentas() {
    const inputBusq = document.getElementById('filtroVentasBuscar') || document.querySelector('#sec-ventas input[type="text"]');
    const inputFechaIni = document.getElementById('filtroVentasDesde') || document.querySelectorAll('#sec-ventas input[type="date"]')[0];
    const inputFechaFin = document.getElementById('filtroVentasHasta') || document.querySelectorAll('#sec-ventas input[type="date"]')[1];
    const btnFiltrar = document.getElementById('btnFiltrarVentas') || document.querySelector('#sec-ventas .btn-primary.w-100');
    const btnExportar = document.getElementById('btnExportarVentas');
    const btnExportarServicios = document.getElementById('btnExportarServicios');

    // Validación interactiva de rangos de fecha (de pasado al presente)
    inputFechaIni?.addEventListener('change', () => {
        if (inputFechaIni.value && inputFechaFin) {
            inputFechaFin.min = inputFechaIni.value;
        }
    });
    inputFechaFin?.addEventListener('change', () => {
        if (inputFechaFin.value && inputFechaIni) {
            inputFechaIni.max = inputFechaFin.value;
        }
    });

    inputBusq?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            btnFiltrar?.click();
        }
    });

    btnFiltrar?.addEventListener('click', () => {
        ejecutarFiltroVentas(true);
    });

    const btnExportarPdf = document.getElementById('btnExportarVentasPdf');
    const btnExportarServiciosPdf = document.getElementById('btnExportarServiciosPdf');

    if (btnExportar && !btnExportar.dataset.bound) {
        btnExportar.dataset.bound = 'true';
        btnExportar.addEventListener('click', (e) => {
            e.preventDefault();
            exportarVentasExcel();
        });
    }
    if (btnExportarServicios && !btnExportarServicios.dataset.bound) {
        btnExportarServicios.dataset.bound = 'true';
        btnExportarServicios.addEventListener('click', (e) => {
            e.preventDefault();
            exportarServiciosExcel();
        });
    }
    if (btnExportarPdf && !btnExportarPdf.dataset.bound) {
        btnExportarPdf.dataset.bound = 'true';
        btnExportarPdf.addEventListener('click', (e) => {
            e.preventDefault();
            exportarVentasPdf();
        });
    }
    if (btnExportarServiciosPdf && !btnExportarServiciosPdf.dataset.bound) {
        btnExportarServiciosPdf.dataset.bound = 'true';
        btnExportarServiciosPdf.addEventListener('click', (e) => {
            e.preventDefault();
            exportarServiciosPdf();
        });
    }
}

// Ejecuta el filtro de búsqueda y rango de fechas para el apartado activo
function ejecutarFiltroVentas(conToast = false) {
    const inputBusq = document.getElementById('filtroVentasBuscar') || document.querySelector('#sec-ventas input[type="text"]');
    const inputFechaIni = document.getElementById('filtroVentasDesde') || document.querySelectorAll('#sec-ventas input[type="date"]')[0];
    const inputFechaFin = document.getElementById('filtroVentasHasta') || document.querySelectorAll('#sec-ventas input[type="date"]')[1];
    const termino = (inputBusq?.value || '').toLowerCase().trim();
    const desde = inputFechaIni?.value || '';
    const hasta = inputFechaFin?.value || '';

    // Validación estricta: el rango no puede ir de presente al pasado
    if (desde && hasta && desde > hasta) {
        mostrarToast('El rango de fechas no es válido. La fecha inicial debe ser anterior o igual a la final.', 'error');
        return;
    }

    if (_tipoVentasActivo === 'productos') {
        const filtradas = _compras.filter(c => {
            const cliente = `${c.usuario?.nombres || ''} ${c.usuario?.apellidos || ''}`.toLowerCase();
            const productos = (c.detalles || []).map(d => d.producto?.nombre || '').join(' ').toLowerCase();
            const matchTexto = !termino || cliente.includes(termino) || productos.includes(termino);
            const fechaCompra = (c.fecha || '').substring(0, 10);
            const matchDesde = !desde || fechaCompra >= desde;
            const matchHasta = !hasta || fechaCompra <= hasta;
            return matchTexto && matchDesde && matchHasta;
        });
        _comprasFiltradas = ordenarVentasDesc(filtradas);
        _paginaVentasActual = 1;
        renderVentas();
        if (conToast) {
            if (_comprasFiltradas.length > 0) {
                mostrarToast(`Filtro aplicado: ${_comprasFiltradas.length} venta(s) de productos encontrada(s)`, 'success');
            } else {
                mostrarToast('No se encontraron ventas para los criterios seleccionados', 'error');
            }
        }
    } else {
        const filtradas = _citas.filter(c => {
            const cliente = `${c.usuario?.nombres || ''} ${c.usuario?.apellidos || ''}`.toLowerCase();
            const servicio = (c.servicio?.nombre || '').toLowerCase();
            const matchTexto = !termino || cliente.includes(termino) || servicio.includes(termino);
            const fechaCita = (c.fecha || '').substring(0, 10);
            const matchDesde = !desde || fechaCita >= desde;
            const matchHasta = !hasta || fechaCita <= hasta;
            return matchTexto && matchDesde && matchHasta;
        });
        _citasFiltradas = ordenarVentasDesc(filtradas);
        _paginaVentasActual = 1;
        renderVentas();
        if (conToast) {
            if (_citasFiltradas.length > 0) {
                mostrarToast(`Filtro aplicado: ${_citasFiltradas.length} venta(s) de servicios encontrada(s)`, 'success');
            } else {
                mostrarToast('No se encontraron ventas para los criterios seleccionados', 'error');
            }
        }
    }
}

// Formatea fechas separando fecha y hora en dos líneas consistentes
function formatearFechaHora(fechaStr, horaStr = '') {
    if (!fechaStr) return '—';
    if (horaStr) {
        return `<div>${fechaStr}</div><small class="text-muted">${horaStr}</small>`;
    }
    if (fechaStr.includes('T')) {
        const [f, h] = fechaStr.split('T');
        return `<div>${f}</div><small class="text-muted">${(h || '').substring(0, 5)}</small>`;
    }
    const partes = (fechaStr || '').trim().split(/\s+/);
    if (partes.length > 1) {
        const f = partes[0];
        const h = partes.slice(1).join(' ').substring(0, 5);
        return `<div>${f}</div><small class="text-muted">${h}</small>`;
    }
    return `<div>${fechaStr}</div>`;
}

// Ordena transacciones (ventas de productos o servicios) mostrando la última venta registrada primero
function ordenarVentasDesc(lista) {
    return [...(lista || [])].sort((a, b) => {
        // Criterio 1: Fecha (más reciente primero)
        const fA = (a.fecha || '').substring(0, 10);
        const fB = (b.fecha || '').substring(0, 10);
        if (fA !== fB) {
            return fB.localeCompare(fA);
        }
        // Criterio 2: Hora
        const hA = (a.hora || (a.fecha || '').substring(11)).trim();
        const hB = (b.hora || (b.fecha || '').substring(11)).trim();
        if (hA && hB && hA !== hB) {
            return hB.localeCompare(hA);
        }
        // Criterio 3: ID de transacción descendente (último registro creado en BD primero)
        return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
}

// Actualiza el contenedor del total con diseño en letras limpias (sin bordes ni fondos)
function actualizarTotalVentasUI(totalEl, etiqueta, monto) {
    if (!totalEl) return;
    totalEl.className = 'mb-0 lbl-total-ventas';
    totalEl.innerHTML = `<strong>${etiqueta}</strong> <span class="lbl-total-monto">S/ ${Number(monto || 0).toFixed(2)}</span>`;
}

// Renderiza la tabla de ventas según el tipo activo (Productos o Servicios) con paginación
function renderVentas() {
    const thead = document.getElementById('theadVentas') || document.querySelector('#sec-ventas thead');
    const tbody = document.getElementById('tbodyVentas') || document.querySelector('#sec-ventas tbody');
    const totalEl = document.getElementById('lblTotalVentas') || document.querySelector('#sec-ventas .admin-card-body.border-top p');
    if (!tbody) return;

    if (_tipoVentasActivo === 'productos') {
        if (thead) {
            thead.innerHTML = `
            <tr>
                <th class="text-center" style="width: 9%; padding-left: 1.25rem;">#VENTA</th>
                <th class="text-center" style="width: 16%;">CLIENTE</th>
                <th class="text-center" style="width: 29%;">PRODUCTOS</th>
                <th class="text-center" style="width: 13%;">FECHA</th>
                <th class="text-center" style="width: 10%;">TOTAL</th>
                <th class="text-center" style="width: 11%;">ESTADO</th>
                <th class="text-center" style="width: 12%; padding-right: 1.25rem;">PAGO</th>
            </tr>`;
        }

        if (_comprasFiltradas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4 align-middle">No hay ventas registradas para este filtro.</td></tr>`;
            actualizarTotalVentasUI(totalEl, 'Total de la venta semanal:', 0);
            renderPaginacionVentas(0);
            return;
        }

        const totalPaginas = Math.max(1, Math.ceil(_comprasFiltradas.length / VENTAS_POR_PAGINA));
        if (_paginaVentasActual > totalPaginas) _paginaVentasActual = totalPaginas;
        if (_paginaVentasActual < 1) _paginaVentasActual = 1;
        const inicio = (_paginaVentasActual - 1) * VENTAS_POR_PAGINA;
        const paginaCompras = _comprasFiltradas.slice(inicio, inicio + VENTAS_POR_PAGINA);

        const badgeEstado = { 'Entregado': 'bg-success', 'Por entregar': 'bg-warning', 'Sin pagar': 'bg-danger' };
        tbody.innerHTML = paginaCompras.map((c) => {
            const productos = (c.detalles || []).map(d => `${d.producto?.nombre || 'Prod.'} x${d.cantidad}`).join(', ') || '—';
            const claseEstado = badgeEstado[c.estado] || 'bg-secondary';
            const metodoPago = c.metodoPago || 'No especificado';
            return `
            <tr>
                <td class="fw-semibold text-center align-middle" style="padding-left: 1.25rem;">#V-${String(c.id).padStart(3, '0')}</td>
                <td class="text-center align-middle" style="white-space: normal; line-height: 1.35;">${c.usuario?.nombres || '—'} ${c.usuario?.apellidos || ''}</td>
                <td class="text-center align-middle" style="white-space: normal; line-height: 1.35;">${productos}</td>
                <td class="text-center align-middle" style="white-space: normal; line-height: 1.35;">${formatearFechaHora(c.fecha, c.hora)}</td>
                <td class="text-center align-middle"><span class="monto-tabla">S/ ${(c.total || 0).toFixed(2)}</span></td>
                <td class="text-center align-middle"><span class="badge ${claseEstado} px-2 py-1">${c.estado || '—'}</span></td>
                <td class="text-center align-middle" style="padding-right: 1.25rem;"><span class="badge bg-info text-dark px-2 py-1">${metodoPago}</span></td>
            </tr>`;
        }).join('');

        const total = _comprasFiltradas.reduce((acc, c) => acc + (c.total || 0), 0);
        actualizarTotalVentasUI(totalEl, 'Total de la venta semanal:', total);
        renderPaginacionVentas(_comprasFiltradas.length);

    } else {
        // Modo ventas por servicio
        if (thead) {
            thead.innerHTML = `
            <tr>
                <th class="text-center" style="width: 9%; padding-left: 1.25rem;">#SERVICIO</th>
                <th class="text-center" style="width: 16%;">CLIENTE</th>
                <th class="text-center" style="width: 29%;">SERVICIO</th>
                <th class="text-center" style="width: 13%;">FECHA</th>
                <th class="text-center" style="width: 10%;">TOTAL</th>
                <th class="text-center" style="width: 11%;">ESTADO</th>
                <th class="text-center" style="width: 12%; padding-right: 1.25rem;">PAGO</th>
            </tr>`;
        }

        if (_citasFiltradas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4 align-middle">No hay ventas registradas para este filtro.</td></tr>`;
            actualizarTotalVentasUI(totalEl, 'Total de servicios:', 0);
            renderPaginacionVentas(0);
            return;
        }

        const totalPaginas = Math.max(1, Math.ceil(_citasFiltradas.length / VENTAS_POR_PAGINA));
        if (_paginaVentasActual > totalPaginas) _paginaVentasActual = totalPaginas;
        if (_paginaVentasActual < 1) _paginaVentasActual = 1;
        const inicio = (_paginaVentasActual - 1) * VENTAS_POR_PAGINA;
        const paginaCitas = _citasFiltradas.slice(inicio, inicio + VENTAS_POR_PAGINA);

        const badgeEstadoCita = {
            'Completada': 'bg-success',
            'Confirmada': 'bg-primary',
            'Pendiente': 'bg-warning',
            'Cancelada': 'bg-danger'
        };

        tbody.innerHTML = paginaCitas.map((c) => {
            const claseEstado = badgeEstadoCita[c.estado] || 'bg-secondary';
            const precio = c.servicio?.precioBase || 0;
            const metodoPago = c.metodoPago || (c.estado === 'Completada' ? 'Efectivo' : 'Pendiente');
            const badgePago = c.estado === 'Completada' ? 'bg-info text-dark' : 'bg-warning text-dark';
            return `
            <tr>
                <td class="fw-semibold text-center align-middle" style="padding-left: 1.25rem;">#S-${String(c.id).padStart(3, '0')}</td>
                <td class="text-center align-middle" style="white-space: normal; line-height: 1.35;">${c.usuario?.nombres || '—'} ${c.usuario?.apellidos || ''}</td>
                <td class="text-center align-middle" style="white-space: normal; line-height: 1.35;">${c.servicio?.nombre || '—'}</td>
                <td class="text-center align-middle" style="white-space: normal; line-height: 1.35;">${formatearFechaHora(c.fecha, c.hora)}</td>
                <td class="text-center align-middle"><span class="monto-tabla">S/ ${precio.toFixed(2)}</span></td>
                <td class="text-center align-middle"><span class="badge ${claseEstado} px-2 py-1">${c.estado || '—'}</span></td>
                <td class="text-center align-middle" style="padding-right: 1.25rem;"><span class="badge ${badgePago} px-2 py-1">${metodoPago}</span></td>
            </tr>`;
        }).join('');

        const total = _citasFiltradas.reduce((acc, c) => acc + (c.servicio?.precioBase || 0), 0);
        actualizarTotalVentasUI(totalEl, 'Total de servicios:', total);
        renderPaginacionVentas(_citasFiltradas.length);
    }
}

// Renderiza los controles de paginación numérica a la derecha del total
function renderPaginacionVentas(totalRegistros) {
    const cont = document.getElementById('paginacionVentas');
    if (!cont) return;
    if (!totalRegistros || totalRegistros === 0) {
        cont.innerHTML = '';
        return;
    }
    const totalPaginas = Math.max(1, Math.ceil(totalRegistros / VENTAS_POR_PAGINA));
    const maxBotones = Math.min(5, totalPaginas);
    let html = '';
    for (let i = 1; i <= maxBotones; i++) {
        const activo = i === _paginaVentasActual ? 'active' : '';
        html += `<button type="button" class="btn-paginacion-ventas ${activo}" onclick="irAPaginaVentas(${i})">${i}</button>`;
    }
    if (totalPaginas > 5) {
        html += `<span class="paginacion-resumen-paginas ms-2">… de ${totalPaginas} págs.</span>`;
    }
    cont.innerHTML = html;
}

// Navega a la página indicada en la tabla de ventas
function irAPaginaVentas(pagina) {
    _paginaVentasActual = pagina;
    renderVentas();
}

// Variable de control para evitar descargas duplicadas o peticiones simultáneas
let _exportandoExcel = false;

// Generador modular de hojas Excel profesionales con diseño corporativo, anchos automáticos y formatos numéricos
async function generarExcelProfesional({ titulo, subtitulo, nombreHoja, nombreArchivo, cabeceras, filas, columnaTotalIndex = 0 }) {
    if (typeof ExcelJS !== 'undefined') {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Ricar Autoboutique';
        workbook.created = new Date();
        const worksheet = workbook.addWorksheet(nombreHoja, {
            views: [{ showGridLines: true }]
        });

        const totalCols = cabeceras.length;
        const endColLetter = String.fromCharCode(64 + totalCols);

        // Fila 1: Banner de título corporativo centrado
        worksheet.mergeCells(`A1:${endColLetter}1`);
        const titleCell = worksheet.getCell('A1');
        titleCell.value = titulo;
        titleCell.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A3D6B' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 30;

        // Fila 2: Subtítulo con metadata y filtros centrado
        worksheet.mergeCells(`A2:${endColLetter}2`);
        const subCell = worksheet.getCell('A2');
        subCell.value = subtitulo;
        subCell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF334155' } };
        subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        subCell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(2).height = 20;

        // Fila 3: Espaciador
        worksheet.getRow(3).height = 8;

        // Fila 4: Cabeceras de tabla centradas
        const headerRow = worksheet.getRow(4);
        headerRow.values = cabeceras;
        headerRow.height = 26;
        headerRow.eachCell((cell) => {
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A3D6B' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF0A3D6B' } },
                left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                bottom: { style: 'medium', color: { argb: 'FF0A3D6B' } },
                right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
            };
        });

        // Filas de datos (a partir de la fila 5) - TODOS LOS CAMPOS CENTRADOS
        filas.forEach((datosFila, idx) => {
            const row = worksheet.addRow(datosFila);
            row.height = 22;
            const bgArgb = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';

            row.eachCell((cell, colNumber) => {
                cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF1E293B' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                };

                // Todos los campos centrados tanto horizontal como verticalmente
                cell.alignment = { vertical: 'middle', horizontal: 'center' };

                if (colNumber === 1) {
                    cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0A3D6B' } };
                } else if (colNumber === columnaTotalIndex) {
                    cell.numFmt = '"S/" #,##0.00';
                    cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0A3D6B' } };
                }
            });
        });

        // Fila resumen de total general centrada
        if (columnaTotalIndex > 0 && filas.length > 0) {
            const totalRowIndex = worksheet.rowCount + 1;
            const totalRow = worksheet.getRow(totalRowIndex);
            totalRow.height = 26;

            const etiquetaColIndex = columnaTotalIndex - 1 > 0 ? columnaTotalIndex - 1 : 1;
            const etiquetaCell = totalRow.getCell(etiquetaColIndex);
            etiquetaCell.value = 'TOTAL:';
            etiquetaCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0A3D6B' } };
            etiquetaCell.alignment = { vertical: 'middle', horizontal: 'center' };

            const totalCell = totalRow.getCell(columnaTotalIndex);
            const totalLetra = String.fromCharCode(64 + columnaTotalIndex);
            totalCell.value = { formula: `SUM(${totalLetra}5:${totalLetra}${totalRowIndex - 1})` };
            totalCell.numFmt = '"S/" #,##0.00';
            totalCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0A3D6B' } };
            totalCell.alignment = { vertical: 'middle', horizontal: 'center' };

            totalRow.eachCell((cell) => {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F1FF' } };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF94A3B8' } },
                    bottom: { style: 'double', color: { argb: 'FF0A3D6B' } }
                };
            });
        }

        // Ajuste automático de anchura de columnas
        worksheet.columns.forEach((column) => {
            let maxLen = 12;
            column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
                if (rowNumber >= 4) {
                    const val = cell.value;
                    const str = val ? (typeof val === 'object' && val.result ? String(val.result) : String(val)) : '';
                    if (str.length > maxLen) {
                        maxLen = str.length;
                    }
                }
            });
            column.width = Math.min(Math.max(maxLen + 4, 15), 55);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = nombreArchivo;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            if (a.parentNode) {
                a.parentNode.removeChild(a);
            }
            window.URL.revokeObjectURL(url);
        }, 200);
        return true;
    } else if (typeof XLSX !== 'undefined') {
        // Soporte alternativo con SheetJS
        const datosObj = filas.map(f => {
            const obj = {};
            cabeceras.forEach((c, idx) => {
                obj[c] = f[idx];
            });
            return obj;
        });
        const hoja = XLSX.utils.json_to_sheet(datosObj);
        hoja['!cols'] = cabeceras.map(() => ({ wch: 22 }));
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, nombreHoja);
        XLSX.writeFile(libro, nombreArchivo);
        return true;
    } else {
        throw new Error('No se encontró ninguna librería de exportación a Excel disponible.');
    }
}

// Exporta las ventas filtradas a Excel analizando la pestaña actualmente seleccionada (Productos o Servicios)
async function exportarVentasExcel() {
    if (_exportandoExcel) return;
    _exportandoExcel = true;

    try {
        // Analiza directamente el botón activo en la interfaz
        const btnServicios = document.getElementById('btnTabVentasServicios');
        const esServicios = btnServicios?.classList.contains('active') || _tipoVentasActivo === 'servicios';
        const ahora = new Date().toLocaleString('es-PE');
        const fechaISO = new Date().toISOString().slice(0, 10);

        if (esServicios) {
            if (!_citasFiltradas || _citasFiltradas.length === 0) {
                mostrarToast('No hay ventas por servicio registradas para exportar', 'error');
                return;
            }
            const cabeceras = ['# SERVICIO', 'CLIENTE', 'SERVICIO', 'FECHA Y HORA', 'TOTAL', 'ESTADO', 'MÉTODO DE PAGO'];
            const filas = _citasFiltradas.map(c => [
                `#S-${String(c.id).padStart(3, '0')}`,
                `${c.usuario?.nombres || ''} ${c.usuario?.apellidos || ''}`.trim() || '—',
                c.servicio?.nombre || '—',
                `${c.fecha || ''} ${c.hora || ''}`.trim() || '—',
                Number(c.servicio?.precioBase || 0),
                c.estado || '—',
                c.metodoPago || (c.estado === 'Completada' ? 'Efectivo' : 'Pendiente')
            ]);
            await generarExcelProfesional({
                titulo: 'RICAR AUTOBOUTIQUE - REGISTRO DE VENTAS POR SERVICIO',
                subtitulo: `Exportado el ${ahora} | Total transacciones: ${filas.length}`,
                nombreHoja: 'Ventas por Servicio',
                nombreArchivo: `ventas_servicios_${fechaISO}.xlsx`,
                cabeceras,
                filas,
                columnaTotalIndex: 5
            });
            mostrarToast('Reporte de ventas por servicio exportado en Excel exitosamente', 'success');
        } else {
            if (!_comprasFiltradas || _comprasFiltradas.length === 0) {
                mostrarToast('No hay ventas de productos registradas para exportar', 'error');
                return;
            }
            const cabeceras = ['# VENTA', 'CLIENTE', 'PRODUCTOS ADQUIRIDOS', 'FECHA Y HORA', 'TOTAL', 'ESTADO', 'MÉTODO DE PAGO'];
            const filas = _comprasFiltradas.map(c => [
                `#V-${String(c.id).padStart(3, '0')}`,
                `${c.usuario?.nombres || ''} ${c.usuario?.apellidos || ''}`.trim() || '—',
                (c.detalles || []).map(d => `${d.producto?.nombre || 'Prod.'} x${d.cantidad}`).join(', ') || '—',
                `${c.fecha || ''} ${c.hora || ''}`.trim() || '—',
                Number(c.total || 0),
                c.estado || '—',
                c.metodoPago || 'No especificado'
            ]);
            await generarExcelProfesional({
                titulo: 'RICAR AUTOBOUTIQUE - REGISTRO DE VENTAS DE PRODUCTOS',
                subtitulo: `Exportado el ${ahora} | Total transacciones: ${filas.length}`,
                nombreHoja: 'Ventas de Productos',
                nombreArchivo: `ventas_productos_${fechaISO}.xlsx`,
                cabeceras,
                filas,
                columnaTotalIndex: 5
            });
            mostrarToast('Reporte de ventas de productos exportado en Excel exitosamente', 'success');
        }
    } catch (e) {
        console.error('Error al exportar ventas:', e);
        mostrarToast('Error al exportar reporte de ventas a Excel', 'error');
    } finally {
        setTimeout(() => { _exportandoExcel = false; }, 1000);
    }
}

// Exporta reportes por servicio a Excel usando formato corporativo completo
async function exportarServiciosExcel() {
    if (_exportandoExcel) return;
    _exportandoExcel = true;

    try {
        const porServicio = {};
        const citasCompletadas = _citas.filter(c => c.estado === 'Completada' && c.servicio?.precioBase);
        citasCompletadas.forEach(c => {
            const nombre = c.servicio?.nombre || 'Sin nombre';
            const precio = c.servicio.precioBase || 0;
            if (!porServicio[nombre]) porServicio[nombre] = { citas: 0, ingresos: 0 };
            porServicio[nombre].citas++;
            porServicio[nombre].ingresos += precio;
        });
        const totalIngresos = Object.values(porServicio).reduce((acc, s) => acc + s.ingresos, 0);
        const serviciosOrdenados = Object.entries(porServicio).sort((a, b) => b[1].citas - a[1].citas);

        if (serviciosOrdenados.length === 0) {
            mostrarToast('No hay datos en el reporte para exportar a Excel', 'error');
            return;
        }

        const ahora = new Date().toLocaleString('es-PE');
        const fechaISO = new Date().toISOString().slice(0, 10);
        const cabeceras = ['SERVICIO', 'CITAS ATENDIDAS', 'INGRESOS', '% DEL TOTAL', 'TENDENCIA'];
        const filas = serviciosOrdenados.map(([nombre, d]) => [
            nombre,
            d.citas,
            Number(d.ingresos || 0),
            totalIngresos > 0 ? `${Math.round((d.ingresos / totalIngresos) * 100)}%` : '0%',
            `${d.citas} en este período`
        ]);

        await generarExcelProfesional({
            titulo: 'RICAR AUTOBOUTIQUE - REPORTE DE VENTAS POR SERVICIO',
            subtitulo: `Exportado el ${ahora} | Servicios evaluados: ${filas.length}`,
            nombreHoja: 'Resumen por Servicio',
            nombreArchivo: `reporte_ventas_servicio_${fechaISO}.xlsx`,
            cabeceras,
            filas,
            columnaTotalIndex: 3
        });
        mostrarToast('Reporte de servicios exportado en Excel exitosamente', 'success');
    } catch (e) {
        console.error('Error al exportar reporte de servicios:', e);
        mostrarToast('Error al exportar reporte a Excel', 'error');
    } finally {
        setTimeout(() => { _exportandoExcel = false; }, 1000);
    }
}

// Variable de control para evitar descargas múltiples simultáneas de PDF
let _exportandoPdf = false;

// Generador modular de PDFs profesionales con diseño corporativo y tablas centradas
async function generarPdfProfesional({ titulo, subtitulo, nombreArchivo, cabeceras, filas, columnaTotalIndex = 0 }) {
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        throw new Error('La librería jsPDF no está disponible. Verifica tu conexión a internet.');
    }

    const { jsPDF } = window.jspdf;
    // Orientación horizontal para visualización óptima de tablas de transacciones
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Banner superior corporativo
    doc.setFillColor(10, 61, 107); // Azul marino #0A3D6B
    doc.rect(0, 0, pageWidth, 56, 'F');

    // Título principal centrado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(titulo, pageWidth / 2, 27, { align: 'center' });

    // Subtítulo con metadata centrado
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(215, 230, 250);
    doc.text(subtitulo, pageWidth / 2, 44, { align: 'center' });

    // 2. Mapeo de datos con formato monetario y valores limpios
    const bodyFilas = filas.map(fila => fila.map((val, idx) => {
        if (idx === columnaTotalIndex - 1 && typeof val === 'number') {
            return `S/ ${val.toFixed(2)}`;
        }
        return String(val ?? '—');
    }));

    // Fila resumen total al pie de tabla si aplica
    let footFilas = [];
    if (columnaTotalIndex > 0 && filas.length > 0) {
        const sumaTotal = filas.reduce((acc, f) => acc + (Number(f[columnaTotalIndex - 1]) || 0), 0);
        const footFila = cabeceras.map((_, i) => {
            if (i === columnaTotalIndex - 2) return 'TOTAL:';
            if (i === columnaTotalIndex - 1) return `S/ ${sumaTotal.toFixed(2)}`;
            return '';
        });
        footFilas = [footFila];
    }

    // 3. Renderizado de tabla con AutoTable (todos los campos centrados)
    doc.autoTable({
        head: [cabeceras],
        body: bodyFilas,
        foot: footFilas.length > 0 ? footFilas : undefined,
        startY: 68,
        margin: { top: 68, left: 32, right: 32, bottom: 34 },
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 8,
            halign: 'center', // Todos los campos centrados
            valign: 'middle',
            cellPadding: 5.5,
            lineColor: [226, 232, 240],
            lineWidth: 0.6
        },
        headStyles: {
            fillColor: [10, 61, 107], // Azul corporativo
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8.5,
            halign: 'center',
            cellPadding: 6.5
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        footStyles: {
            fillColor: [232, 241, 255],
            textColor: [10, 61, 107],
            fontStyle: 'bold',
            fontSize: 8.5,
            halign: 'center',
            cellPadding: 6
        },
        didDrawPage: (data) => {
            const totalPaginas = doc.internal.getNumberOfPages();
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text('RICAR AUTOBOUTIQUE S.A.C. — Reporte Oficial de Gestión', 32, pageHeight - 14, { align: 'left' });
            doc.text(`Página ${data.pageNumber} de ${totalPaginas}`, pageWidth - 32, pageHeight - 14, { align: 'right' });
        }
    });

    doc.save(nombreArchivo);
    return true;
}

// Exporta las ventas filtradas a PDF analizando la pestaña actualmente seleccionada (Productos o Servicios)
async function exportarVentasPdf() {
    if (_exportandoPdf) return;
    _exportandoPdf = true;

    try {
        const btnServicios = document.getElementById('btnTabVentasServicios');
        const esServicios = btnServicios?.classList.contains('active') || _tipoVentasActivo === 'servicios';
        const ahora = new Date().toLocaleString('es-PE');
        const fechaISO = new Date().toISOString().slice(0, 10);

        if (esServicios) {
            if (!_citasFiltradas || _citasFiltradas.length === 0) {
                mostrarToast('No hay ventas por servicio registradas para exportar a PDF', 'error');
                return;
            }
            const cabeceras = ['# SERVICIO', 'CLIENTE', 'SERVICIO', 'FECHA Y HORA', 'TOTAL', 'ESTADO', 'MÉTODO DE PAGO'];
            const filas = _citasFiltradas.map(c => [
                `#S-${String(c.id).padStart(3, '0')}`,
                `${c.usuario?.nombres || ''} ${c.usuario?.apellidos || ''}`.trim() || '—',
                c.servicio?.nombre || '—',
                `${c.fecha || ''} ${c.hora || ''}`.trim() || '—',
                Number(c.servicio?.precioBase || 0),
                c.estado || '—',
                c.metodoPago || (c.estado === 'Completada' ? 'Efectivo' : 'Pendiente')
            ]);
            await generarPdfProfesional({
                titulo: 'RICAR AUTOBOUTIQUE — REGISTRO DE VENTAS POR SERVICIO',
                subtitulo: `Generado el ${ahora} | Total transacciones: ${filas.length} | Panel de Gerente`,
                nombreArchivo: `ventas_servicios_${fechaISO}.pdf`,
                cabeceras,
                filas,
                columnaTotalIndex: 5
            });
            mostrarToast('Reporte de ventas por servicio exportado en PDF exitosamente', 'success');
        } else {
            if (!_comprasFiltradas || _comprasFiltradas.length === 0) {
                mostrarToast('No hay ventas de productos registradas para exportar a PDF', 'error');
                return;
            }
            const cabeceras = ['# VENTA', 'CLIENTE', 'PRODUCTOS ADQUIRIDOS', 'FECHA Y HORA', 'TOTAL', 'ESTADO', 'MÉTODO DE PAGO'];
            const filas = _comprasFiltradas.map(c => [
                `#V-${String(c.id).padStart(3, '0')}`,
                `${c.usuario?.nombres || ''} ${c.usuario?.apellidos || ''}`.trim() || '—',
                (c.detalles || []).map(d => `${d.producto?.nombre || 'Prod.'} x${d.cantidad}`).join(', ') || '—',
                `${c.fecha || ''} ${c.hora || ''}`.trim() || '—',
                Number(c.total || 0),
                c.estado || '—',
                c.metodoPago || 'No especificado'
            ]);
            await generarPdfProfesional({
                titulo: 'RICAR AUTOBOUTIQUE — REGISTRO DE VENTAS DE PRODUCTOS',
                subtitulo: `Generado el ${ahora} | Total transacciones: ${filas.length} | Panel de Gerente`,
                nombreArchivo: `ventas_productos_${fechaISO}.pdf`,
                cabeceras,
                filas,
                columnaTotalIndex: 5
            });
            mostrarToast('Reporte de ventas de productos exportado en PDF exitosamente', 'success');
        }
    } catch (e) {
        console.error('Error al exportar ventas a PDF:', e);
        mostrarToast('Error al generar el documento PDF', 'error');
    } finally {
        setTimeout(() => { _exportandoPdf = false; }, 1000);
    }
}

// Exporta reportes por servicio a PDF usando formato corporativo completo
async function exportarServiciosPdf() {
    if (_exportandoPdf) return;
    _exportandoPdf = true;

    try {
        const porServicio = {};
        const citasCompletadas = _citas.filter(c => c.estado === 'Completada' && c.servicio?.precioBase);
        citasCompletadas.forEach(c => {
            const nombre = c.servicio?.nombre || 'Sin nombre';
            const precio = c.servicio.precioBase || 0;
            if (!porServicio[nombre]) porServicio[nombre] = { citas: 0, ingresos: 0 };
            porServicio[nombre].citas++;
            porServicio[nombre].ingresos += precio;
        });
        const totalIngresos = Object.values(porServicio).reduce((acc, s) => acc + s.ingresos, 0);
        const serviciosOrdenados = Object.entries(porServicio).sort((a, b) => b[1].citas - a[1].citas);

        if (serviciosOrdenados.length === 0) {
            mostrarToast('No hay datos en el reporte para exportar a PDF', 'error');
            return;
        }

        const ahora = new Date().toLocaleString('es-PE');
        const fechaISO = new Date().toISOString().slice(0, 10);
        const cabeceras = ['SERVICIO', 'CITAS ATENDIDAS', 'INGRESOS', '% DEL TOTAL', 'TENDENCIA'];
        const filas = serviciosOrdenados.map(([nombre, d]) => [
            nombre,
            d.citas,
            Number(d.ingresos || 0),
            totalIngresos > 0 ? `${Math.round((d.ingresos / totalIngresos) * 100)}%` : '0%',
            `${d.citas} en este período`
        ]);

        await generarPdfProfesional({
            titulo: 'RICAR AUTOBOUTIQUE — REPORTE DE VENTAS POR SERVICIO',
            subtitulo: `Generado el ${ahora} | Servicios evaluados: ${filas.length} | Panel de Gerente`,
            nombreArchivo: `reporte_ventas_servicio_${fechaISO}.pdf`,
            cabeceras,
            filas,
            columnaTotalIndex: 3
        });
        mostrarToast('Reporte de servicios exportado en PDF exitosamente', 'success');
    } catch (e) {
        console.error('Error al exportar reporte de servicios a PDF:', e);
        mostrarToast('Error al generar el documento PDF', 'error');
    } finally {
        setTimeout(() => { _exportandoPdf = false; }, 1000);
    }
}

// Comprueba si una fecha corresponde a la semana actual del calendario
function fechaEstaSemana(fechaISO) {
    if (!fechaISO) return false;
    const fechaParts = fechaISO.substring(0, 10).split('-').map(Number);
    if (fechaParts.length !== 3 || fechaParts.some(Number.isNaN)) return false;
    const fecha = new Date(fechaParts[0], fechaParts[1] - 1, fechaParts[2]);
    const hoy = new Date();
    const inicioSemana = new Date(hoy);
    inicioSemana.setHours(0, 0, 0, 0);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    finSemana.setHours(23, 59, 59, 999);
    return fecha >= inicioSemana && fecha <= finSemana;
}

// Calcula y renderiza reportes/resúmenes por servicio y métricas
function renderReportes() {
    const ventasTotal = calcularVentasTotales();
    const porServicio = {};
    const citasCompletadas = _citas.filter(c => c.estado === 'Completada' && c.servicio?.precioBase);
    citasCompletadas.forEach(c => {
        const nombre = c.servicio?.nombre || 'Sin nombre';
        const precio = c.servicio.precioBase || 0;
        if (!porServicio[nombre]) {
            porServicio[nombre] = { citas: 0, ingresos: 0 };
        }
        porServicio[nombre].citas++;
        porServicio[nombre].ingresos += precio;
    });
    const totalCitasIngresos = Object.values(porServicio).reduce((acc, s) => acc + s.ingresos, 0);
    const ventasSemanaCompras = _compras.filter(c => fechaEstaSemana(c.fecha)).reduce((acc, c) => acc + (c.total || 0), 0);
    const ventasSemanaServicios = citasCompletadas.filter(c => fechaEstaSemana(c.fecha)).reduce((acc, c) => acc + (c.servicio?.precioBase || 0), 0);
    const ventasSemana = ventasSemanaCompras + ventasSemanaServicios;
    const citasSemana = _citas.filter(c => fechaEstaSemana(c.fecha)).length;
    const cards = document.querySelectorAll('#sec-reportes .admin-card-body');
    if (cards[0]) {
        const valores = cards[0].querySelectorAll('.fw-bold');
        if (valores[0]) valores[0].textContent = `S/ ${ventasSemana.toFixed(0)}`;
        if (valores[1]) valores[1].textContent = citasSemana;
        if (valores[2]) {
            const units = _compras.slice(-7).reduce((acc, c) => acc + (c.detalles || []).reduce((s, d) => s + d.cantidad, 0), 0);
            valores[2].textContent = `${units} uds.`;
        }
        if (valores[3]) valores[3].textContent = _usuarios.length;
    }
    if (cards[1]) {
        const valores = cards[1].querySelectorAll('.fw-bold');
        if (valores[0]) valores[0].textContent = `S/ ${ventasTotal.toFixed(0)}`;
        if (valores[1]) valores[1].textContent = _citas.length;
        if (valores[2]) {
            const units = _compras.reduce((acc, c) => acc + (c.detalles || []).reduce((s, d) => s + d.cantidad, 0), 0);
            valores[2].textContent = `${units} uds.`;
        }
        if (valores[3]) valores[3].textContent = _usuarios.length;
    }
    if (cards[2]) {
        const valores = cards[2].querySelectorAll('.fw-bold');
        if (valores[0]) valores[0].textContent = `S/ ${ventasTotal.toFixed(0)}`;
        if (valores[1]) valores[1].textContent = _citas.length;
        if (valores[2]) {
            const units = _compras.reduce((acc, c) => acc + (c.detalles || []).reduce((s, d) => s + d.cantidad, 0), 0);
            valores[2].textContent = `${units} uds.`;
        }
        if (valores[3]) valores[3].textContent = _usuarios.length;
    }
    const tbodyServ = document.querySelector('#sec-reportes tbody');
    if (!tbodyServ) return;
    const serviciosOrdenados = Object.entries(porServicio).sort((a, b) => b[1].citas - a[1].citas);
    if (serviciosOrdenados.length === 0) {
        tbodyServ.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4 align-middle">No hay datos de servicios aún.</td></tr>`;
        return;
    }
    tbodyServ.innerHTML = serviciosOrdenados.map(([nombre, datos]) => {
        const pct = totalCitasIngresos > 0 ? Math.round((datos.ingresos / totalCitasIngresos) * 100) : 0;
        return `
        <tr>
            <td class="fw-semibold text-center align-middle" style="padding-left: 1.25rem; white-space: normal; line-height: 1.35;">${nombre}</td>
            <td class="text-center align-middle">${datos.citas}</td>
            <td class="text-center align-middle"><span class="monto-tabla">S/ ${datos.ingresos.toFixed(2)}</span></td>
            <td class="text-center align-middle">${pct}%</td>
            <td class="text-center align-middle" style="padding-right: 1.25rem;"><span class="text-muted">${datos.citas} este período</span></td>
        </tr>`;
    }).join('');
}



// Cambia el año del gráfico de ventas mensuales
function cambiarAnioVentas(delta) {
    _anioVentas += delta;
    renderCharts();
}

// Construye y actualiza gráficos (ventas por mes con escala incremental, distribución por categoría)
function renderCharts() {
    const lblAnio = document.getElementById('lblAnioVentas');
    if (lblAnio) lblAnio.textContent = _anioVentas;

    const ctxVentas = document.getElementById('chartVentas');
    if (ctxVentas) {
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const ventasPorMes = Array(12).fill(0);
        _compras.forEach(c => {
            if (!c.fecha) return;
            const anio = parseInt((c.fecha || '').substring(0, 4));
            if (anio !== _anioVentas) return;
            const mes = parseInt((c.fecha || '').substring(5, 7)) - 1;
            if (mes >= 0 && mes < 12) {
                ventasPorMes[mes] += (c.total || 0);
            }
        });
        _citas.filter(c => c.estado === 'Completada' && c.servicio?.precioBase).forEach(c => {
            if (!c.fecha) return;
            const anio = parseInt((c.fecha || '').substring(0, 4));
            if (anio !== _anioVentas) return;
            const mes = parseInt((c.fecha || '').substring(5, 7)) - 1;
            if (mes >= 0 && mes < 12) {
                ventasPorMes[mes] += c.servicio.precioBase;
            }
        });

        // Escala del eje Y: por defecto 0 - 1000 con pasos de 100 (10 pasos exactos); si supera 1000, tope al siguiente múltiplo de 1000 con 10 divisiones
        const maxVenta = Math.max(...ventasPorMes, 0);
        let maxEscala = 1000;
        if (maxVenta > 1000) {
            maxEscala = Math.ceil(maxVenta / 1000) * 1000;
        }
        const stepEscala = Math.round(maxEscala / 10);

        if (window._chartVentas) window._chartVentas.destroy();
        window._chartVentas = new Chart(ctxVentas, {
            type: 'bar',
            data: {
                labels: meses,
                datasets: [{
                    label: 'Ventas (S/)',
                    data: ventasPorMes,
                    backgroundColor: 'rgba(86,174,232,0.7)',
                    borderColor: '#56aee8',
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        min: 0,
                        max: maxEscala,
                        ticks: {
                            stepSize: stepEscala,
                            callback: v => `S/ ${v}`
                        }
                    }
                }
            }
        });
    }
    const ctxCat = document.getElementById('chartCategorias');
    const legendCatEl = document.getElementById('legendCategorias');
    if (ctxCat) {
        const porCat = {};
        _productos.forEach(p => {
            const cat = (p.categoria && p.categoria.nombre) ? p.categoria.nombre : 'Sin categoría';
            porCat[cat] = (porCat[cat] || 0) + 1;
        });
        const labels = Object.keys(porCat);
        const data = Object.values(porCat);
        const paletaColores = [
            '#56aee8', '#1565c0', '#0a3d6b', '#4caf50',
            '#ff9800', '#e53935', '#9c27b0', '#00bcd4',
            '#3f51b5', '#009688', '#8bc34a', '#ffc107',
            '#ff5722', '#795548', '#607d8b', '#e91e63'
        ];
        const colores = labels.map((_, i) => paletaColores[i % paletaColores.length]);

        if (window._chartCat) window._chartCat.destroy();

        if (labels.length === 0) {
            if (legendCatEl) {
                legendCatEl.innerHTML = '<p class="text-muted small text-center mb-0 py-3">No hay productos ni categorías registradas</p>';
            }
        } else {
            window._chartCat = new Chart(ctxCat, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data,
                        backgroundColor: colores,
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const val = context.parsed || 0;
                                    return ` ${context.label}: ${val} prod.`;
                                }
                            }
                        }
                    },
                    cutout: '62%'
                }
            });

            if (legendCatEl) {
                const totalCategorias = labels.length;
                const filasPorColumna = Math.max(1, Math.ceil(totalCategorias / 2));
                legendCatEl.style.setProperty('--legend-rows', filasPorColumna);
                legendCatEl.className = 'legend-cat-grid mt-3 pt-3 border-top';
                legendCatEl.innerHTML = labels.map((label, idx) => `
                    <div class="legend-cat-item" data-index="${idx}" title="${label} (${data[idx]} productos)">
                        <span class="legend-cat-color" style="background-color: ${colores[idx]};"></span>
                        <span class="legend-cat-text">${label}</span>
                    </div>
                `).join('');

                legendCatEl.querySelectorAll('.legend-cat-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const idx = parseInt(item.getAttribute('data-index'), 10);
                        if (!window._chartCat || isNaN(idx)) return;
                        const isVisible = window._chartCat.getDataVisibility(idx);
                        window._chartCat.toggleDataVisibility(idx);
                        window._chartCat.update();
                        item.classList.toggle('legend-cat-inactive', isVisible);
                    });
                });
            }
        }
    }
}

// Abre modal para editar los datos del gerente
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

// Guarda los cambios de datos personales del gerente al backend
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
        if (breadcrumb) breadcrumb.textContent = `Gerente ${nombreCompleto}`;
        bootstrap.Modal.getInstance(document.getElementById('modalEditarDatos'))?.hide();
        mostrarToast('Datos actualizados correctamente', 'success');
    } catch (e) {
        errorEl.textContent = 'Error de conexión';
        errorEl.classList.remove('d-none');
    }
}

// Muestra toasts usando el template existente en la página
function mostrarToast(mensaje, tipo = 'success') {
    const toast = document.getElementById('toastExito');
    const toastMsg = document.getElementById('toastMensaje');
    const toastIcon = document.getElementById('toastIcono');
    if (!toast) return;
    toast.className = `toast align-items-center border-0 ${tipo === 'success' ? 'text-bg-success' : 'text-bg-danger'}`;
    if (toastIcon) {
        toastIcon.className = tipo === 'success' ? 'bi bi-check-circle-fill me-2 fs-5' : 'bi bi-exclamation-triangle-fill me-2 fs-5';
    }
    if (toastMsg) toastMsg.textContent = mensaje;
    new bootstrap.Toast(toast, { delay: 3500 }).show();
}
