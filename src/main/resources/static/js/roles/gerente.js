// Endpoints y constantes usadas por la vista de gerente
const API = { compras: '/api/compras', citas: '/api/citas', productos: '/api/productos', usuarios: '/api/usuarios', servicios: '/api/servicios' };

// Estado local: Caches de datos que usa el panel del gerente
let _compras = [];
let _citas = [];
let _productos = [];
let _usuarios = [];
let _comprasFiltradas = [];
let _paginaClientesGerente = 1;
const CLIENTES_POR_PAGINA_G = 10;

// Inicialización: Valida sesión de gerente, carga datos y configura UI
document.addEventListener('DOMContentLoaded', async () => {
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== 'gerente') {
        window.location.href = '/inicio';
        return;
    }
    const avatar = document.getElementById('gerenteNombreAvatar');
    const menu = document.getElementById('gerenteNombreMenu');
    const iniciales = (sesion.nombres[0] + (sesion.apellidos?.[0] || '')).toUpperCase();
    if (avatar) avatar.textContent = iniciales;
    if (menu) menu.textContent = sesion.nombres + ' ' + (sesion.apellidos || '');
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
        _comprasFiltradas = _compras;
        renderDashboard();
        renderVentas();
        renderReportes();
        renderCharts();
        renderClientesGerente();
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
    const prodActivos = _productos.length;
    const clientes = _usuarios.length;
    const stockBajo = _productos.filter(p => p.stock <= 5).length;
    const kpis = document.querySelectorAll('#sec-dashboard .kpi-value');
    if (kpis[0]) kpis[0].textContent = `S/ ${ventasTotal.toFixed(0)}`;
    if (kpis[1]) kpis[1].textContent = citasMes;
    if (kpis[2]) kpis[2].textContent = prodActivos;
    if (kpis[3]) kpis[3].textContent = clientes;
    const kpiCards = document.querySelectorAll('#sec-dashboard .kpi-card');
    if (kpiCards[0]) {
        const s = kpiCards[0].querySelector('small.text-muted');
        if (s) s.textContent = 'Periodo actual';
    }
    if (kpiCards[1]) {
        const s = kpiCards[1].querySelector('small.text-muted');
        if (s) s.textContent = `${citasMes} este mes`;
    }
    if (kpiCards[2]) {
        const s = kpiCards[2].querySelector('small.text-muted');
        if (s) s.textContent = `${prodActivos} productos · ${stockBajo > 0 ? stockBajo + ' con stock bajo' : 'Stock OK'}`;
    }
    if (kpiCards[3]) {
        const s = kpiCards[3].querySelector('small.text-muted');
        if (s) s.textContent = `${clientes} registrados`;
    }
    const tendencias = document.querySelectorAll('#sec-dashboard .kpi-card small');
    if (tendencias[2]) tendencias[2].textContent = stockBajo > 0 ? `${stockBajo} con stock bajo` : 'Stock OK';
    const tbodyCitas = document.querySelector('#sec-dashboard tbody');
    if (tbodyCitas) {
        const proximas = _citas.filter(c => c.estado === 'Pendiente' || c.estado === 'Confirmada').slice(0, 5);
        if (proximas.length === 0) {
            tbodyCitas.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-3">No hay citas próximas</td>
            </tr>`;
        } else {
            tbodyCitas.innerHTML = proximas.map(c => `
            <tr>
                <td class="fw-semibold">${c.usuario?.nombres || '—'} ${c.usuario?.apellidos || ''}</td>
                <td>${c.servicio?.nombre || '—'}</td>
                <td>${c.fecha || '—'}, ${c.hora || ''}</td>
                <td><span class="badge ${c.estado === 'Confirmada' ? 'bg-success' : 'bg-warning'}">${c.estado}</span></td>
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
            contenedorTop.innerHTML = topProductos.map(([nombre, cant]) => `
        <div class="mb-3">
            <div class="d-flex justify-content-between mb-1">
                <small class="fw-semibold">${nombre}</small>
                <small class="text-muted">${cant} uds.</small>
            </div>
            <div class="progress" style="height:8px;">
                <div class="progress-bar" style="width:${Math.round((cant / maxVentas) * 100)}%"></div>
            </div>
        </div>`).join('');
        } else {
            contenedorTop.innerHTML = `<p class="text-muted small text-center py-2">No hay compras registradas aún.</p>`;
        }
    }
}

// Inicializa filtros y acciones del panel de ventas (buscar, filtrar, exportar)
function iniciarFiltrosVentas() {
    const inputBusq = document.querySelector('#sec-ventas input[type="text"]');
    const inputFechaIni = document.querySelectorAll('#sec-ventas input[type="date"]')[0];
    const inputFechaFin = document.querySelectorAll('#sec-ventas input[type="date"]')[1];
    const btnFiltrar = document.querySelector('#sec-ventas .btn-primary.w-100');
    const btnExportar = document.getElementById('btnExportarVentas');
    btnFiltrar?.addEventListener('click', () => {
        const termino = (inputBusq?.value || '').toLowerCase().trim();
        const desde = inputFechaIni?.value || '';
        const hasta = inputFechaFin?.value || '';
        _comprasFiltradas = _compras.filter(c => {
            const cliente = `${c.usuario?.nombres || ''} ${c.usuario?.apellidos || ''}`.toLowerCase();
            const productos = (c.detalles || []).map(d => d.producto?.nombre || '').join(' ').toLowerCase();
            const matchTexto = !termino || cliente.includes(termino) || productos.includes(termino);
            const fechaCompra = (c.fecha || '').substring(0, 10);
            const matchDesde = !desde || fechaCompra >= desde;
            const matchHasta = !hasta || fechaCompra <= hasta;
            return matchTexto && matchDesde && matchHasta;
        });
        renderVentas();
    });
    btnExportar?.addEventListener('click', exportarVentasExcel);
}

// Renderiza la tabla de ventas usando la lista filtrada
function renderVentas() {
    const tbody = document.querySelector('#sec-ventas tbody');
    if (!tbody) return;
    if (_comprasFiltradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No hay ventas registradas para este filtro.</td></tr>`;
        const totalEl = document.querySelector('#sec-ventas .admin-card-body.border-top p');
        if (totalEl) totalEl.innerHTML = `<strong>Total período:</strong><span class="text-primary fw-bold">S/ 0.00</span>`;
        return;
    }
    const badgeEstado = { 'Entregado': 'bg-success', 'Por entregar': 'bg-warning', 'Sin pagar': 'bg-danger' };
    tbody.innerHTML = _comprasFiltradas.map((c) => {
        const productos = (c.detalles || []).map(d => `${d.producto?.nombre || 'Prod.'} x${d.cantidad}`).join(', ') || '—';
        const claseEstado = badgeEstado[c.estado] || 'bg-secondary';
        const metodoPago = c.metodoPago || 'No especificado';
        return `
        <tr>
            <td class="fw-semibold">#V-${String(c.id).padStart(3, '0')}</td>
            <td>${c.usuario?.nombres || '—'} ${c.usuario?.apellidos || ''}</td>
            <td>${productos}</td>
            <td>${c.fecha || '—'}</td>
            <td><strong class="text-primary">S/ ${(c.total || 0).toFixed(2)}</strong></td>
            <td><span class="badge ${claseEstado}">${c.estado || '—'}</span></td>
            <td><span class="badge bg-info text-dark">${metodoPago}</span></td>
        </tr>`;
    }).join('');
    const total = _comprasFiltradas.reduce((acc, c) => acc + (c.total || 0), 0);
    const totalEl = document.querySelector('#sec-ventas .admin-card-body.border-top p');
    if (totalEl) totalEl.innerHTML = `<strong>Total período: </strong><span class="text-primary fw-bold">S/ ${total.toFixed(2)}</span>`;
}

// Exporta las ventas filtradas a Excel usando SheetJS
function exportarVentasExcel() {
    if (typeof XLSX === 'undefined') {
        alert('No se pudo cargar la librería de exportación. Verifica tu conexión a internet.');
        return;
    }
    const datos = _comprasFiltradas.map(c => ({ 'N° Venta': `V-${String(c.id).padStart(3, '0')}`, 'Cliente': `${c.usuario?.nombres || ''} ${c.usuario?.apellidos || ''}`.trim(), 'Productos': (c.detalles || []).map(d => `${d.producto?.nombre || 'Prod.'} x${d.cantidad}`).join(', '), 'Fecha': c.fecha || '', 'Total (S/)': c.total || 0, 'Estado': c.estado || '', 'Método de pago': c.metodoPago || 'No especificado' }));
    const hoja = XLSX.utils.json_to_sheet(datos);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Ventas');
    XLSX.writeFile(libro, `ventas_mecatools_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// Exporta reportes por servicio a Excel usando SheetJS
function exportarServiciosExcel() {
    if (typeof XLSX === 'undefined') {
        alert('No se pudo cargar la librería de exportación. Verifica tu conexión a internet.');
        return;
    }
    const porServicio = {};
    _citas.filter(c => c.estado === 'Completada' && c.servicio?.precioBase).forEach(c => {
        const nombre = c.servicio?.nombre || 'Sin nombre';
        const precio = c.servicio.precioBase || 0;
        if (!porServicio[nombre]) porServicio[nombre] = { citas: 0, ingresos: 0 };
        porServicio[nombre].citas++;
        porServicio[nombre].ingresos += precio;
    });
    const totalIngresos = Object.values(porServicio).reduce((acc, s) => acc + s.ingresos, 0);
    const datos = Object.entries(porServicio).map(([nombre, datos]) => ({ 'Servicio': nombre, 'Citas': datos.citas, 'Ingresos (S/)': datos.ingresos, '% del total': totalIngresos > 0 ? `${Math.round((datos.ingresos / totalIngresos) * 100)}%` : '0%' }));
    const hoja = XLSX.utils.json_to_sheet(datos);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Ventas por Servicio');
    XLSX.writeFile(libro, `ventas_por_servicio_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
        tbodyServ.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No hay datos de servicios aún.</td></tr>`;
        return;
    }
    tbodyServ.innerHTML = serviciosOrdenados.map(([nombre, datos]) => {
        const pct = totalCitasIngresos > 0 ? Math.round((datos.ingresos / totalCitasIngresos) * 100) : 0;
        return `
        <tr>
            <td class="fw-semibold">${nombre}</td>
            <td>${datos.citas}</td>
            <td class="text-primary">S/ ${datos.ingresos.toFixed(2)}</td>
            <td>${pct}%</td>
            <td><span class="text-muted">${datos.citas} este período</span></td>
        </tr>`;
    }).join('');
    const btnExportarReportes = document.getElementById('btnExportarServicios');
    if (btnExportarReportes && !btnExportarReportes.dataset.bound) {
        btnExportarReportes.dataset.bound = 'true';
        btnExportarReportes.addEventListener('click', exportarServiciosExcel);
    }
}

// Renderiza tabla paginada de clientes para el gerente
function renderClientesGerente() {
    const tbody = document.getElementById('tablaClientesGerente');
    if (!tbody) return;
    if (_usuarios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">No hay clientes registrados</td></tr>`;
        renderPaginacionClientesGerente();
        return;
    }
    const totalPaginas = Math.max(1, Math.ceil(_usuarios.length / CLIENTES_POR_PAGINA_G));
    if (_paginaClientesGerente > totalPaginas) _paginaClientesGerente = totalPaginas;
    const inicio = (_paginaClientesGerente - 1) * CLIENTES_POR_PAGINA_G;
    const pagina = _usuarios.slice(inicio, inicio + CLIENTES_POR_PAGINA_G);
    tbody.innerHTML = pagina.map(u => {
        const citasCliente = _citas.filter(c => c.usuario?.id === u.id);
        const comprasCliente = _compras.filter(c => c.usuario?.id === u.id);
        const gastoCompras = comprasCliente.filter(c => c.estado === 'Entregado').reduce((acc, c) => acc + (c.total || 0), 0);
        const gastoCitas = citasCliente.filter(c => c.estado === 'Completada' && c.servicio?.precioBase).reduce((acc, c) => acc + c.servicio.precioBase, 0);
        return `
        <tr>
            <td class="fw-semibold">${u.nombres} ${u.apellidos}</td>
            <td><small>${u.telefono || '—'}</small></td>
            <td>${citasCliente.length}</td>
            <td>${comprasCliente.length}</td>
            <td class="text-primary fw-semibold">S/ ${(gastoCompras + gastoCitas).toFixed(2)}</td>
        </tr>`;
    }).join('');
    renderPaginacionClientesGerente();
}

// Genera controles de paginación para la lista de clientes del gerente
function renderPaginacionClientesGerente() {
    const cont = document.getElementById('paginacionClientesGerente');
    if (!cont) return;
    const totalPaginas = Math.max(1, Math.ceil(_usuarios.length / CLIENTES_POR_PAGINA_G));
    const maxBotones = Math.min(5, totalPaginas);
    let html = '';
    for (let i = 1; i <= maxBotones; i++) {
        const activo = i === _paginaClientesGerente ? 'btn-primary' : 'btn-outline-primary';
        html += `<button class="btn btn-sm ${activo}" onclick="irAPaginaClientesGerente(${i})">${i}</button>`;
    }
    if (totalPaginas > 5) {
        html += `<span class="align-self-center text-muted small">… ${totalPaginas} pág.</span>`;
    }
    cont.innerHTML = html;
}

// Navega a la página indicada y refresca la lista visible de clientes
function irAPaginaClientesGerente(pagina) {
    _paginaClientesGerente = pagina;
    renderClientesGerente();
}

// Construye y actualiza gráficos (ventas por mes, distribución por categoría)
function renderCharts() {
    const ctxVentas = document.getElementById('chartVentas');
    if (ctxVentas) {
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const ventasPorMes = Array(12).fill(0);
        _compras.forEach(c => {
            if (!c.fecha) return;
            const mes = parseInt((c.fecha || '').substring(5, 7)) - 1;
            if (mes >= 0 && mes < 12) {
                ventasPorMes[mes] += (c.total || 0);
            }
        });
        _citas.filter(c => c.estado === 'Completada' && c.servicio?.precioBase).forEach(c => {
            if (!c.fecha) return;
            const mes = parseInt((c.fecha || '').substring(5, 7)) - 1;
            if (mes >= 0 && mes < 12) {
                ventasPorMes[mes] += c.servicio.precioBase;
            }
        });
        if (window._chartVentas) window._chartVentas.destroy();
        window._chartVentas = new Chart(ctxVentas, { type: 'bar', data: { labels: meses, datasets: [{ label: 'Ventas (S/)', data: ventasPorMes, backgroundColor: 'rgba(86,174,232,0.7)', borderColor: '#56aee8', borderWidth: 1, borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => `S/ ${v}` } } } } });
    }
    const ctxCat = document.getElementById('chartCategorias');
    if (ctxCat) {
        const porCat = {};
        _productos.forEach(p => {
            const cat = (p.categoria && p.categoria.nombre) ? p.categoria.nombre : 'Sin categoría';
            porCat[cat] = (porCat[cat] || 0) + 1;
        });
        const labels = Object.keys(porCat);
        const data = Object.values(porCat);
        const colores = ['#56aee8', '#1565c0', '#0a3d6b', '#4caf50', '#ff9800', '#e53935', '#9c27b0', '#00bcd4'];
        if (window._chartCat) window._chartCat.destroy();
        window._chartCat = new Chart(ctxCat, { type: 'doughnut', data: { labels, datasets: [{ data, backgroundColor: colores.slice(0, labels.length), borderWidth: 2, borderColor: '#fff' }] }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } } });
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
        if (avatar) avatar.textContent = iniciales;
        if (menu) menu.textContent = nombres + ' ' + apellidos;
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
    if (!toast) return;
    toast.className = `toast align-items-center border-0 ${tipo === 'success' ? 'text-bg-success' : 'text-bg-danger'}`;
    if (toastMsg) toastMsg.textContent = mensaje;
    new bootstrap.Toast(toast, { delay: 3000 }).show();
}
