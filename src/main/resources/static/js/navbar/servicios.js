// Id del servicio seleccionado actualmente (usado al agendar)
let servicioActualId = null;
let servicioActualNombre = '';

// Mapa de palabras clave a iconos Bootstrap para mostrar en cada tarjeta de servicio
const ICONOS_SERV = { 'aceite': 'bi-droplet-fill', 'lubric': 'bi-droplet-fill', 'eléctric': 'bi-battery-charging', 'electr': 'bi-battery-charging', 'manten': 'bi-gear-fill', 'diagnós': 'bi-speedometer2', 'diagnos': 'bi-speedometer2', 'alineac': 'bi-arrows-angle-expand', 'freno': 'bi-shield-check', 'suspens': 'bi-shield-check', 'aire': 'bi-wind', 'combustible': 'bi-fuel-pump-fill', 'inyect': 'bi-fuel-pump-fill', 'refriger': 'bi-thermometer-half', 'motor': 'bi-wrench-adjustable', 'revisión': 'bi-car-front-fill', 'revision': 'bi-car-front-fill', 'tecnica': 'bi-car-front-fill', 'técnica': 'bi-car-front-fill', 'transmis': 'bi-arrow-repeat', 'lavado': 'bi-droplet', 'pintura': 'bi-brush-fill' };

// Determina el icono apropiado según palabras clave presentes en el nombre del servicio
function iconoPorNombre(nombre) {
    const lower = nombre.toLowerCase();
    for (const [key, icon] of Object.entries(ICONOS_SERV)) {
        if (lower.includes(key)) return icon;
    }
    return 'bi-gear-fill';
}

// Inicializaciones al cargar la página: Cargar servicios y preparar modales/botones
document.addEventListener('DOMContentLoaded', async () => {
    await cargarServiciosDesdeDB();
    iniciarModalCita();
    iniciarModalPersonalizado();
    iniciarBotonHero();
});

// Configura el botón hero para agendar una "Cita general" (valida sesión y rol)
function iniciarBotonHero() {
    const btnHero = document.querySelector('.btn-agendar-serv[data-servicio="Cita general"]');
    if (!btnHero) return;
    btnHero.removeAttribute('data-servicio');
    btnHero.addEventListener('click', () => {
        const sesion = obtenerSesion();
        if (!sesion) {
            const loginError = document.getElementById('loginError');
            if (loginError) {
                loginError.innerHTML = '<i class="bi bi-info-circle me-2"></i>Inicia sesión para agendar tu cita.';
                loginError.classList.remove('d-none', 'alert-danger');
                loginError.classList.add('alert-info');
            }
            abrirModal('modalLogin');
            return;
        }
        if (sesion.rol !== 'cliente') {
            mostrarModalNoPermitido();
            return;
        }
        abrirModalPersonalizadoConDatos();
    });
}

// Obtiene el catálogo de servicios activos desde la API y muestra un spinner mientras carga
async function cargarServiciosDesdeDB() {
    const grid = document.getElementById('grid-servicios-catalogo');
    if (!grid) return;
    grid.innerHTML = `
    <div class="col-12 text-center py-5 text-muted">
        <div class="spinner-border text-primary mb-3" style="width:3rem;height:3rem;"></div>
        <p class="fw-semibold">Cargando servicios...</p>
    </div>`;
    try {
        const resp = await fetch('/api/servicios/activos');
        if (!resp.ok) throw new Error('Error al cargar servicios');
        const servicios = await resp.json();
        if (servicios.length === 0) {
            grid.innerHTML = `
            <div class="col-12 text-center py-5 text-muted">
                <i class="bi bi-gear display-4 d-block mb-3"></i>
                <p class="fw-semibold">No hay servicios disponibles aún.</p>
                <p class="small">El administrador debe cargar el catálogo de servicios.</p>
            </div>`;
            return;
        }
        renderizarServicios(grid, servicios);
    } catch (e) {
        console.error('Error cargando servicios:', e);
        grid.innerHTML = `
        <div class="col-12 text-center py-5 text-muted">
            <i class="bi bi-wifi-off display-4 d-block mb-3 text-danger"></i>
            <p class="fw-semibold">Error de conexión al cargar servicios.</p>
            <button class="btn btn-primary mt-2" onclick="cargarServiciosDesdeDB()">
                <i class="bi bi-arrow-clockwise me-1"></i>Reintentar
            </button>
        </div>`;
    }
}

// Renderiza las tarjetas de servicio en el grid y añade una tarjeta especial "Personalizado"
function renderizarServicios(grid, servicios) {
    const cards = servicios.map(s => {
        const icono = iconoPorNombre(s.nombre);
        const duracion = s.duracionMinutos ? `${s.duracionMinutos} min` : 'Variable';
        const precio = `Desde S/ ${s.precioBase.toFixed(2)}`;
        const desc = s.descripcion || 'Servicio profesional con garantía de calidad.';
        return `
        <div class="col-md-6 col-lg-4">
            <div class="card-serv h-100">
                <div class="card-serv-header">
                    <div class="card-serv-icono"><i class="bi ${icono}"></i></div>
                    <div class="card-serv-precio">${precio}</div>
                </div>
                <div class="card-serv-body">
                    <h5>${s.nombre}</h5>
                    <p>${desc}</p>${s.categoria ? `<p class="text-muted small mb-0"><i class="bi bi-tag me-1"></i>${s.categoria}</p>` : ''}
                </div>
                <div class="card-serv-footer">
                    <span class="badge-duracion"><i class="bi bi-clock me-1"></i>${duracion}</span>
                    <button class="btn btn-sm btn-serv btn-agendar-serv"data-servicio-id="${s.id}"data-servicio="${s.nombre}"><i class="bi bi-calendar-check me-1"></i>Agendar</button>
                </div>
            </div>
        </div>`;
    }).join('');
    const cardPersonalizado = `
    <div class="col-md-6 col-lg-4">
        <div class="card-serv card-serv-custom h-100">
            <div class="card-serv-custom-header">
                <div class="custom-badge-top"><i class="bi bi-stars me-1"></i>Personalizado</div>
                <div class="card-serv-icono-custom"><i class="bi bi-sliders"></i></div>
                <h5 class="text-white mt-3 mb-1">Servicio a Medida</h5>
                <p class="text-white-75 mb-0" style="font-size:0.85rem;">Describe tu problema y nosotros encontramos la solución perfecta para tu vehículo.</p>
            </div>
            <div class="card-serv-custom-body">
                <p class="text-muted small mb-3">
                    ¿No encontraste lo que buscas? Cuéntanos qué necesita tu vehículo y nuestro
                    equipo te contactará con una cotización personalizada y sin compromiso.
                </p>
                <ul class="card-serv-lista mb-4">
                    <li><i class="bi bi-check2-circle"></i>Diagnóstico inicial sin costo</li>
                    <li><i class="bi bi-check2-circle"></i>Cotización detallada en 24 h</li>
                    <li><i class="bi bi-check2-circle"></i>Técnico asignado exclusivo</li>
                    <li><i class="bi bi-check2-circle"></i>Garantía en todo trabajo realizado</li>
                </ul>
                <button class="btn btn-custom-serv w-100 btn-personalizado"><i class="bi bi-pencil-square me-2"></i>Detallar mi solicitud</button>
            </div>
        </div>
    </div>`;
    grid.innerHTML = cards + cardPersonalizado;
    asociarEventosBotones();
}

// Agrega listeners a los botones generados: Agendar y personalizado
function asociarEventosBotones() {
    document.querySelectorAll('.btn-agendar-serv').forEach(btn => {
        btn.addEventListener('click', function () {
            const sesion = obtenerSesion();
            if (!sesion) {
                const loginError = document.getElementById('loginError');
                if (loginError) {
                    loginError.innerHTML = '<i class="bi bi-info-circle me-2"></i>Inicia sesión para agendar tu cita.';
                    loginError.classList.remove('d-none', 'alert-danger');
                    loginError.classList.add('alert-info');
                }
                abrirModal('modalLogin');
                return;
            }
            if (sesion.rol !== 'cliente') {
                mostrarModalNoPermitido();
                return;
            }
            servicioActualId = parseInt(this.dataset.servicioId) || null;
            servicioActualNombre = this.dataset.servicio || '—';
            const spanNombre = document.getElementById('citaNombreServicio');
            if (spanNombre) spanNombre.textContent = servicioActualNombre;
            precargarDatosCita(sesion);
            abrirModal('modalCita');
        });
    });
    // Botón de servicio personalizado: Abre modal con datos pre-cargados
    document.querySelector('.btn-personalizado')?.addEventListener('click', function () {
        const sesion = obtenerSesion();
        if (!sesion) {
            const loginError = document.getElementById('loginError');
            if (loginError) {
                loginError.innerHTML = '<i class="bi bi-info-circle me-2"></i>Inicia sesión para enviar tu solicitud.';
                loginError.classList.remove('d-none', 'alert-danger');
                loginError.classList.add('alert-info');
            }
            abrirModal('modalLogin');
            return;
        }
        if (sesion.rol !== 'cliente') {
            mostrarModalNoPermitido();
            return;
        }
        abrirModalPersonalizadoConDatos();
    });
}

// Precarga en el formulario de cita datos como nombre y teléfono desde la sesión
function precargarDatosCita(sesion) {
    const campoCitaNombre = document.getElementById('citaNombre');
    if (campoCitaNombre) {
        const nombreCompleto = ((sesion.nombres || '') + ' ' + (sesion.apellidos || '')).trim();
        if (nombreCompleto) campoCitaNombre.value = nombreCompleto;
    }
    const campoCitaTel = document.getElementById('citaTelefono');
    if (campoCitaTel && sesion.telefono) {
        campoCitaTel.value = sesion.telefono;
    }
}

// Abre el modal de servicio personalizado y completa los campos del usuario en sesión
function abrirModalPersonalizadoConDatos() {
    const sesion = obtenerSesion();
    if (!sesion) return;
    const nombreCompleto = ((sesion.nombres || '') + ' ' + (sesion.apellidos || '')).trim();
    const campoNombre = document.getElementById('pNombre');
    if (campoNombre) campoNombre.value = nombreCompleto;
    const campoTel = document.getElementById('pTelefono');
    if (campoTel && sesion.telefono) campoTel.value = sesion.telefono;
    const campoEmail = document.getElementById('pEmail');
    if (campoEmail && sesion.email) campoEmail.value = sesion.email;
    abrirModal('modalServicioPersonalizado');
}

// Inicializa el modal de agendar cita, fija la fecha mínima a mañana y valida campos antes de enviar
function iniciarModalCita() {
    const actualizarMinFecha = () => {
        const hoy = new Date();
        hoy.setDate(hoy.getDate() + 1);
        const min = hoy.toISOString().split('T')[0];
        const campoFecha = document.getElementById('citaFecha');
        if (campoFecha) campoFecha.min = min;
    };
    actualizarMinFecha();
    document.getElementById('modalCita')?.addEventListener('show.bs.modal', actualizarMinFecha);
    document.getElementById('citaDescripcion')?.addEventListener('input', function () {
        document.getElementById('citaDescContador').textContent = this.value.length + ' / 400';
    });
    document.getElementById('citaTelefono')?.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').slice(0, 9);
    });
    document.getElementById('modalCita')?.addEventListener('hidden.bs.modal', () => {
        ['citaNombre', 'citaTelefono', 'citaFecha', 'citaModelo', 'citaAnio', 'citaDescripcion'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.value = '';
                el.classList.remove('is-valid', 'is-invalid');
            }
        });
        ['citaMarca', 'citaHora'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.value = '';
                el.classList.remove('is-valid', 'is-invalid');
            }
        });
        document.getElementById('citaDescContador').textContent = '0 / 400';
        document.getElementById('citaExito')?.classList.add('d-none');
        const btn = document.getElementById('btnConfirmarCita');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-calendar-check me-2"></i>Confirmar cita';
        }
        servicioActualId = null;
    });
    document.getElementById('modalLogin')?.addEventListener('hidden.bs.modal', () => {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.classList.add('d-none');
            loginError.classList.remove('alert-info');
            loginError.classList.add('alert-danger');
            loginError.innerHTML = '<i class="bi bi-exclamation-circle me-2"></i>Correo o contraseña incorrectos.';
        }
    });
    // Handler para confirmar y registrar la cita en el backend tras validar campos y disponibilidad
    document.getElementById('btnConfirmarCita')?.addEventListener('click', async function () {
        const sesion = obtenerSesion();
        if (!sesion) return;
        let valido = true;
        const requeridos = [{ id: 'citaNombre', test: v => v.trim().length >= 3 }, { id: 'citaTelefono', test: v => /^9[0-9]{8}$/.test(v.trim()) }, { id: 'citaFecha', test: v => v !== '' }, { id: 'citaHora', test: v => v !== '' }, { id: 'citaMarca', test: v => v !== '' }, { id: 'citaModelo', test: v => v.trim().length >= 1 }, { id: 'citaAnio', test: v => +v >= 1990 && +v <= 2026 }];
        requeridos.forEach(({ id, test }) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (test(el.value)) {
                el.classList.remove('is-invalid');
                el.classList.add('is-valid');
            } else {
                el.classList.add('is-invalid');
                el.classList.remove('is-valid');
                valido = false;
            }
        });
        if (!valido) return;
        const fecha = document.getElementById('citaFecha').value;
        const hora = document.getElementById('citaHora').value;
        const hoy = new Date().toISOString().split('T')[0];
        if (fecha <= hoy) {
            document.getElementById('citaFecha').classList.add('is-invalid');
            document.getElementById('citaFecha').classList.remove('is-valid');
            mostrarResultado('La fecha debe ser a partir de mañana.', 'warning');
            return;
        }
        const marca = document.getElementById('citaMarca').value;
        const modelo = document.getElementById('citaModelo').value.trim();
        const anio = document.getElementById('citaAnio').value;
        const notas = document.getElementById('citaDescripcion').value.trim();
        const vehiculo = `${marca} ${modelo} ${anio}`.trim();
        this.disabled = true;
        this.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';
        const mostrarResultado = (msg, tipo) => {
            const el = document.getElementById('citaExito');
            document.getElementById('citaExitoMsg').textContent = msg;
            el.className = `alert alert-${tipo} py-3 text-center`;
            el.classList.remove('d-none');
        };
        try {
            const dispResp = await fetch(`/api/citas/disponible?fecha=${fecha}&hora=${encodeURIComponent(hora)}`);
            const disp = await dispResp.json();
            if (!disp.disponible) {
                document.getElementById('citaFecha').classList.add('is-invalid');
                document.getElementById('citaHora').classList.add('is-invalid');
                mostrarResultado('Este horario ya está ocupado. Elige otro.', 'warning');
                return;
            }
            let idServicio = servicioActualId;
            if (!idServicio) {
                mostrarResultado('No se identificó el servicio. Usa el catálogo para seleccionar uno.', 'warning');
                return;
            }
            const body = { fecha, hora, vehiculo, notas, estado: 'Pendiente', usuario: { id: sesion.id }, servicio: { id: idServicio } };
            const resp = await fetch('/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (resp.status === 409) {
                document.getElementById('citaFecha').classList.add('is-invalid');
                document.getElementById('citaHora').classList.add('is-invalid');
                mostrarResultado('Este horario ya está ocupado. Elige otro.', 'warning');
                return;
            }
            if (!resp.ok) throw new Error('Error del servidor');
            const nombre = sesion.nombres.split(' ')[0];
            mostrarResultado(`${nombre}, tu cita para "${servicioActualNombre}" el ${fecha} ` + `a las ${hora} fue registrada. Te confirmaremos pronto.`, 'success');
            this.innerHTML = '<i class="bi bi-check2-circle me-2"></i>Cita confirmada';
            setTimeout(() => {
                bootstrap.Modal.getInstance(document.getElementById('modalCita'))?.hide();
            }, 3000);
        } catch (e) {
            console.error(e);
            mostrarResultado('Error de conexión. Intenta de nuevo.', 'danger');
        } finally {
            if (this.innerHTML.includes('Procesando')) {
                this.disabled = false;
                this.innerHTML = '<i class="bi bi-calendar-check me-2"></i>Confirmar cita';
            }
        }
    });
}

// Configura el modal de servicio personalizado: contador, validaciones y envío de la solicitud
function iniciarModalPersonalizado() {
    document.getElementById('pDescripcion')?.addEventListener('input', function () {
        const max = 500;
        if (this.value.length > max) this.value = this.value.slice(0, max);
        document.getElementById('contadorDesc').textContent = `${Math.min(this.value.length, max)} / ${max} caracteres`;
    });
    document.getElementById('pTelefono')?.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').slice(0, 9);
    });
    document.getElementById('btnEnviarPersonalizado')?.addEventListener('click', async function () {
        const sesion = obtenerSesion();
        if (!sesion) return;
        let valido = true;
        const campos = [{ id: 'pMarca', msg: 'Selecciona la marca del vehículo' }, { id: 'pModelo', msg: 'Ingresa el modelo' }, { id: 'pAnio', msg: 'Ingresa el año del vehículo' }, { id: 'pDescripcion', msg: 'Describe el problema' }, { id: 'pNombre', msg: 'Ingresa tu nombre' }, { id: 'pTelefono', msg: 'El teléfono debe empezar con 9 y tener 9 dígitos', test: v => /^9[0-9]{8}$/.test(v.trim()) }];
        campos.forEach(({ id, msg, test }) => {
            const el = document.getElementById(id);
            if (!el) return;
            const fb = el.parentNode.querySelector('.invalid-feedback');
            const pasó = test ? test(el.value) : el.value.trim() !== '';
            if (!pasó) {
                el.classList.add('is-invalid');
                el.classList.remove('is-valid');
                if (fb) fb.textContent = msg;
                valido = false;
            } else {
                el.classList.remove('is-invalid');
                el.classList.add('is-valid');
                if (fb) fb.textContent = '';
            }
        });
        if (!valido) return;
        const areas = [];
        ['aMotor', 'aElectrico', 'aFrenosS', 'aRefrig', 'aTransmision', 'aOtro'].forEach(id => {
            const chk = document.getElementById(id);
            if (chk?.checked) areas.push(chk.nextElementSibling.textContent.trim());
        });
        const urgencia = document.querySelector('input[name="urgencia"]:checked')?.value || 'baja';
        const vehiculo = `${document.getElementById('pMarca').value} ${document.getElementById('pModelo').value} ${document.getElementById('pAnio').value}`.trim();
        const descripcion = document.getElementById('pDescripcion').value.trim();
        const notas = `Solicitud de servicio personalizado.\n` + `Vehículo: ${vehiculo}\n` + `Tipo: ${document.getElementById('pTipoVehiculo').value || 'No especificado'}\n` + `Kilometraje: ${document.getElementById('pKm').value || 'No especificado'}\n` + `Áreas afectadas: ${areas.join(', ') || 'No especificado'}\n` + `Urgencia: ${urgencia}\n` + `Descripción: ${descripcion}\n` + `Contacto preferido: ${document.getElementById('pContactoPref').value}`;
        this.disabled = true;
        this.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';
        try {
            const servResp = await fetch('/api/servicios/activos');
            const servicios = await servResp.json();
            const personalizado = servicios.find(s => s.nombre.toLowerCase().includes('personalizad'));
            const idServicio = personalizado ? personalizado.id : (servicios[0]?.id || null);
            if (!idServicio) {
                document.getElementById('alertaServPersonalizado').className = 'alert alert-warning py-2 text-center';
                document.getElementById('alertaServPersonalizado').innerHTML = '<i class="bi bi-exclamation-circle me-2"></i>No hay servicios disponibles para registrar la solicitud.';
                document.getElementById('alertaServPersonalizado').classList.remove('d-none');
                this.disabled = false;
                this.innerHTML = '<i class="bi bi-send-fill me-2"></i>Enviar solicitud';
                return;
            }
            const mañana = new Date();
            mañana.setDate(mañana.getDate() + 1);
            const fechaTentativa = mañana.toISOString().split('T')[0];
            const body = { fecha: fechaTentativa, hora: 'Por confirmar', vehiculo, notas, estado: 'Pendiente', usuario: { id: sesion.id }, servicio: { id: idServicio } };
            const resp = await fetch('/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!resp.ok) throw new Error('Error del servidor');
            document.getElementById('alertaServPersonalizado').className = 'alert alert-success py-2 text-center';
            document.getElementById('alertaServPersonalizado').innerHTML = '<i class="bi bi-check-circle-fill me-2"></i>¡Solicitud enviada! Te contactaremos en menos de 24 horas.';
            document.getElementById('alertaServPersonalizado').classList.remove('d-none');
            this.innerHTML = '<i class="bi bi-check2-circle me-2"></i>Solicitud enviada';
            setTimeout(() => {
                bootstrap.Modal.getInstance(document.getElementById('modalServicioPersonalizado'))?.hide();
                ['pMarca', 'pModelo', 'pAnio', 'pTipoVehiculo', 'pKm', 'pDescripcion', 'pCuando', 'pNombre', 'pTelefono', 'pEmail'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.value = '';
                        el.classList.remove('is-valid', 'is-invalid');
                    }
                });
                document.querySelectorAll('#checkAreas .check-area-input').forEach(c => c.checked = false);
                document.getElementById('uBaja').checked = true;
                document.getElementById('alertaServPersonalizado').classList.add('d-none');
                document.getElementById('contadorDesc').textContent = '0 / 500 caracteres';
                this.disabled = false;
                this.innerHTML = '<i class="bi bi-send-fill me-2"></i>Enviar solicitud';
            }, 2200);
        } catch (e) {
            console.error(e);
            document.getElementById('alertaServPersonalizado').className = 'alert alert-danger py-2 text-center';
            document.getElementById('alertaServPersonalizado').innerHTML = '<i class="bi bi-x-circle me-2"></i>Error de conexión. Intenta de nuevo.';
            document.getElementById('alertaServPersonalizado').classList.remove('d-none');
            this.disabled = false;
            this.innerHTML = '<i class="bi bi-send-fill me-2"></i>Enviar solicitud';
        }
    });
}
