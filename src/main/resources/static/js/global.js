// Claves usadas en sessionStorage y localStorage para guardar la sesión del usuario y tokens
const SESION_KEY = 'mecatools_sesion';
const JWT_KEY = 'mecatools_access_token';
const REFRESH_KEY = 'mecatools_refresh_token';
const ACTIVIDAD_KEY = 'mecatools_ultima_actividad';
const TOKEN_TIMESTAMP_KEY = 'mecatools_token_timestamp';

// Helper para leer el valor de una cookie por nombre
function obtenerCookie(nombre) {
    const matches = document.cookie.match(new RegExp('(?:^|; )' + nombre.replace(/([.$?*|{}()\[\]\\\/+^])/g, '\\$1') + '=([^;]*)'));
    return matches ? decodeURIComponent(matches[1]) : null;
}

// Sanitiza cadenas de texto para prevenir inyecciones HTML en el renderizado dinámico
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Registro de actividad del usuario: detecta interacción activa en la página
let _ultimaActividadLocal = Date.now();
function registrarActividadUsuario() {
    const ahora = Date.now();
    if (ahora - _ultimaActividadLocal > 15000) {
        _ultimaActividadLocal = ahora;
        try {
            localStorage.setItem(ACTIVIDAD_KEY, String(ahora));
        } catch (e) {}
    }
}
['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove', 'click'].forEach(evt => {
    window.addEventListener(evt, registrarActividadUsuario, { passive: true });
});

// Función centralizada para renovar el Access Token mediante el Refresh Token
let _promesaRenovacion = null;
async function renovarTokenJWT() {
    if (_promesaRenovacion) return _promesaRenovacion;
    _promesaRenovacion = (async () => {
        try {
            const refreshToken = sessionStorage.getItem(REFRESH_KEY)
                || (function () { try { return localStorage.getItem(REFRESH_KEY); } catch (e) { return null; } })()
                || obtenerCookie('refresh_token');

            if (!refreshToken) {
                return null;
            }

            const resp = await fetchOriginal('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Refresh-Token': refreshToken
                },
                body: JSON.stringify({ refreshToken })
            });

            if (!resp.ok) {
                console.warn('Renovación de token rechazada por el servidor:', resp.status);
                if (resp.status === 401 || resp.status === 403) {
                    sessionStorage.removeItem(REFRESH_KEY);
                    try { localStorage.removeItem(REFRESH_KEY); } catch (e) {}
                }
                return null;
            }

            const data = await resp.json();
            if (data && data.token) {
                const ahora = Date.now();
                sessionStorage.setItem(JWT_KEY, data.token);
                sessionStorage.setItem(TOKEN_TIMESTAMP_KEY, String(ahora));
                document.cookie = `access_token=${data.token}; path=/; max-age=${20 * 60}; SameSite=Lax`;

                if (data.refreshToken) {
                    sessionStorage.setItem(REFRESH_KEY, data.refreshToken);
                    try { localStorage.setItem(REFRESH_KEY, data.refreshToken); } catch (e) {}
                    document.cookie = `refresh_token=${data.refreshToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
                }

                if (data.usuario) {
                    const sesionActual = obtenerSesion();
                    if (sesionActual) {
                        Object.assign(sesionActual, data.usuario);
                        sessionStorage.setItem(SESION_KEY, JSON.stringify(sesionActual));
                    }
                }

                console.log('[JWT] Token renovado exitosamente por actividad activa del usuario.');
                return data.token;
            }
            return null;
        } catch (err) {
            console.error('Error durante la renovación de token JWT:', err);
            return null;
        } finally {
            _promesaRenovacion = null;
        }
    })();
    return _promesaRenovacion;
}

// Interceptor de fetch para inyectar token y renovar reactivamente en caso de 401
const fetchOriginal = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
    const url = new URL(input instanceof Request ? input.url : input, window.location.href);
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) {
        return fetchOriginal(input, init);
    }

    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    let token = sessionStorage.getItem(JWT_KEY) || (typeof obtenerCookie === 'function' ? obtenerCookie('access_token') : null);
    if (token && !sessionStorage.getItem(JWT_KEY)) {
        try { sessionStorage.setItem(JWT_KEY, token); } catch (e) {}
    }
    const method = String(init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const esLecturaPublica = method === 'GET'
        && /^\/api\/(productos|servicios|categorias|comentarios)(\/|$)/.test(url.pathname);
    if (token && !esLecturaPublica && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    let respuesta = await fetchOriginal(input, { ...init, headers });

    // Si la API responde 401 y no es petición de auth (login/refresh), intentar renovar silenciosamente y reintentar
    if (respuesta.status === 401 && !url.pathname.includes('/refresh') && !url.pathname.includes('/login')) {
        const sesion = (typeof obtenerSesion === 'function') ? obtenerSesion() : null;
        if (sesion) {
            const nuevoToken = await renovarTokenJWT();
            if (nuevoToken) {
                headers.set('Authorization', `Bearer ${nuevoToken}`);
                respuesta = await fetchOriginal(input, { ...init, headers });
            }
        }
    }
    return respuesta;
};

// Recupera el objeto de sesión desde sessionStorage o null si no existe
function obtenerSesion() {
    const data = sessionStorage.getItem(SESION_KEY);
    return data ? JSON.parse(data) : null;
}

// Guarda el usuario en sessionStorage para mantener sesión en el cliente y sincroniza tokens y cookies
function guardarSesion(usuario) {
    const datosSesion = { ...usuario };
    const token = (typeof datosSesion.token === 'string' && datosSesion.token)
        ? datosSesion.token
        : sessionStorage.getItem(JWT_KEY);

    const refreshToken = (typeof datosSesion.refreshToken === 'string' && datosSesion.refreshToken)
        ? datosSesion.refreshToken
        : sessionStorage.getItem(REFRESH_KEY);

    const ahora = Date.now();

    if (token) {
        sessionStorage.setItem(JWT_KEY, token);
        sessionStorage.setItem(TOKEN_TIMESTAMP_KEY, String(ahora));
        sessionStorage.setItem(TOKEN_TIMESTAMP_KEY, String(ahora));
        // Persistir en cookie de 20 minutos para todas las navegaciones entre vistas y cambios de rol
        document.cookie = `access_token=${token}; path=/; max-age=${20 * 60}; SameSite=Lax`;
        delete datosSesion.token;
    }
    if (refreshToken) {
        sessionStorage.setItem(REFRESH_KEY, refreshToken);
        try { localStorage.setItem(REFRESH_KEY, refreshToken); } catch (e) {}
        document.cookie = `refresh_token=${refreshToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        delete datosSesion.refreshToken;
    }
    if (datosSesion.rol) {
        document.cookie = `rol_activo=${datosSesion.rol}; path=/; max-age=${20 * 60}; SameSite=Lax`;
    }
    sessionStorage.setItem(SESION_KEY, JSON.stringify(datosSesion));
}

// Elimina la sesión del cliente, limpia cookies y redirige al inicio
async function cerrarSesion() {
    sessionStorage.removeItem(SESION_KEY);
    sessionStorage.removeItem(JWT_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(TOKEN_TIMESTAMP_KEY);
    try {
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(ACTIVIDAD_KEY);
    } catch (e) {}
    document.cookie = 'access_token=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'jwt_token=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'refresh_token=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'rol_activo=; path=/; max-age=0; SameSite=Lax';
    try {
        await fetchOriginal('/logout', { method: 'POST' });
    } catch (error) {
        console.error('No se pudo invalidar la sesión web en el servidor:', error);
    }
    window.location.href = '/inicio';
}

// Obtiene el parámetro 'nombre' de la query string de la URL
function getNombreParam() {
    const params = new URLSearchParams(window.location.search);
    return params.get('nombre');
}

// Actualiza visualmente los botones de la barra de navegación según la sesión y la ruta
function actualizarNavbar() {
    const sesion = obtenerSesion();
    const btns = { registrarse: document.getElementById('btn-registrarse'), login: document.getElementById('btn-login'), perfil: document.getElementById('btn-perfil'), administracion: document.getElementById('btn-administracion'), gestion: document.getElementById('btn-gestion'), regresar: document.getElementById('btn-regresar'), cerrarSesion: document.getElementById('btn-cerrar-sesion') };
    const ruta = window.location.pathname;
    const esPanel = ruta.includes('/cliente') || ruta.includes('/administrador') || ruta.includes('/gerente');
    Object.values(btns).forEach(btn => btn?.classList.add('d-none'));
    if (!sesion) {
        btns.registrarse?.classList.remove('d-none');
        btns.login?.classList.remove('d-none');
        return;
    }
    btns.cerrarSesion?.classList.remove('d-none');
    if (esPanel) {
        if (ruta.includes('/cliente')) btns.perfil?.classList.remove('d-none');
        else if (ruta.includes('/administrador')) btns.administracion?.classList.remove('d-none');
        else if (ruta.includes('/gerente')) btns.gestion?.classList.remove('d-none');
        else btns.regresar?.classList.remove('d-none');
    } else {
        const mapaRolBoton = { cliente: btns.perfil, administrador: btns.administracion, gerente: btns.gestion };
        mapaRolBoton[sesion.rol]?.classList.remove('d-none');
    }
}

// Redirige al panel de cliente del usuario en sesión
function irAPerfil() {
    const sesion = obtenerSesion();
    window.location.href = `/cliente/${sesion.id}`;
}

// Redirige al panel de administración del usuario en sesión respetando la última sección guardada
function irAAdministracion() {
    const sesion = obtenerSesion();
    if (!sesion) {
        window.location.href = '/login';
        return;
    }
    const ultima = localStorage.getItem('ultimaSeccionAdmin');
    const MAPA = {
        'citas': 'reservas/citas',
        'productos': 'catalogo/productos',
        'servicios': 'catalogo/servicios',
        'categorias': 'catalogo/categorias',
        'clientes': 'gestion/clientes',
        'mensajes': 'gestion/mensajes'
    };
    if (ultima && MAPA[ultima]) {
        window.location.href = `/panel/administrador/${sesion.id}/${MAPA[ultima]}`;
    } else {
        window.location.href = `/administrador/${sesion.id}`;
    }
}

// Redirige al panel de gerente del usuario en sesión respetando la última sección guardada
function irAGestion() {
    const sesion = obtenerSesion();
    if (!sesion) {
        window.location.href = '/login';
        return;
    }
    const ultima = localStorage.getItem('ultimaSeccionGerente');
    const MAPA = {
        'dashboard': 'general/resumen',
        'ventas': 'analisis/ventas',
        'reportes': 'analisis/reportes'
    };
    if (ultima && MAPA[ultima]) {
        window.location.href = `/panel/gerente/${sesion.id}/${MAPA[ultima]}`;
    } else {
        window.location.href = `/gerente/${sesion.id}`;
    }
}

function navegarConParametro(url) {
    const sesion = obtenerSesion();
    if (sesion) {
        window.location.href = `${url}/${sesion.rol}/${sesion.id}`;
    } else {
        window.location.href = url;
    }
}

// Accesos rápidos que preservan contexto de sesión (rol/id) cuando corresponde
function irAInicio() {
    navegarConParametro('/inicio');
}
function irAServicios() {
    navegarConParametro('/servicios');
}
function irAProductos() {
    navegarConParametro('/productos');
}
function irANosotros() {
    navegarConParametro('/nosotros');
}
function irAContacto() {
    navegarConParametro('/contacto');
}

// Maneja la acción del botón "Agendar": Valida sesión y rol, muestra modal o redirige según corresponda
function manejarBtnAgendar() {
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
    if (sesion.rol === 'cliente' || (Array.isArray(sesion.roles) && sesion.roles.includes('cliente'))) {
        navegarConParametro('/servicios');
        return;
    }
    mostrarModalNoPermitido();
}

// Crea y muestra un modal informativo cuando el rol no puede realizar la acción solicitada
function mostrarModalNoPermitido() {
    let modal = document.getElementById('modalNoPermitido');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
        <div class="modal fade" id="modalNoPermitido" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header justify-content-center" style="background:var(--azul-oscuro,#0d1b2a);">
                        <h6 class="modal-title text-white fw-bold">
                            <i class="bi bi-shield-exclamation me-2"></i>Acción no disponible
                        </h6>
                    </div>
                    <div class="modal-body text-center py-4 px-4">
                        <div style="font-size:3rem; color:var(--celeste,#56aee8);">
                            <i class="bi bi-person-badge"></i>
                        </div>
                        <h5 class="mt-3 mb-2 fw-bold text-dark">Esta acción es solo para clientes</h5>
                        <p class="text-muted small mb-3">
                            Tu cuenta se encuentra actualmente con el rol de <strong id="rolNoPermitido" class="text-capitalize text-primary"></strong>, por lo que no puede agendar citas ni realizar compras. Por favor cambia a tu rol de <strong>Cliente</strong> para realizar esta acción.
                        </p>
                    </div>
                    <div class="modal-footer border-0 justify-content-center gap-2 pb-4">
                        <button type="button" class="btn btn-primary px-3 fw-semibold" onclick="cambiarRolDirecto('cliente')">
                            <i class="bi bi-arrow-repeat me-1"></i>Cambiar a rol Cliente
                        </button>
                        <button type="button" class="btn btn-outline-secondary px-3" data-bs-dismiss="modal">Entendido</button>
                    </div>
                </div>
            </div>
        </div>`);
        modal = document.getElementById('modalNoPermitido');
    }
    const sesion = obtenerSesion();
    const rolEl = document.getElementById('rolNoPermitido');
    if (rolEl && sesion) {
        rolEl.textContent = sesion.rol === 'administrador' ? 'administrador' : 'gerente';
    }
    abrirModal('modalNoPermitido');
}

// Redirige al selector de rol
function irACambiarRol() {
    window.location.href = '/rol';
}

// Cambia el rol activo directamente y redirige
function cambiarRolDirecto(nuevoRol) {
    const sesion = obtenerSesion();
    if (!sesion) {
        window.location.href = '/inicio';
        return;
    }
    sesion.rol = nuevoRol;
    guardarSesion(sesion);
    const m1 = bootstrap.Modal.getInstance(document.getElementById('modalNoPermitido'));
    if (m1) m1.hide();
    const m2 = bootstrap.Modal.getInstance(document.getElementById('modalNoPermitidoComentario'));
    if (m2) m2.hide();
    const path = window.location.pathname;
    if (path.startsWith('/productos')) {
        window.location.href = `/productos/${nuevoRol}/${sesion.id}`;
    } else if (path.startsWith('/servicios')) {
        window.location.href = `/servicios/${nuevoRol}/${sesion.id}`;
    } else if (path.startsWith('/inicio')) {
        window.location.href = `/inicio/${nuevoRol}/${sesion.id}`;
    } else if (path.startsWith('/nosotros')) {
        window.location.href = `/nosotros/${nuevoRol}/${sesion.id}`;
    } else if (path.startsWith('/contacto')) {
        window.location.href = `/contacto/${nuevoRol}/${sesion.id}`;
    } else if (nuevoRol === 'cliente') {
        window.location.href = `/cliente/${sesion.id}`;
    } else {
        window.location.href = `/${nuevoRol}/${sesion.id}`;
    }
}

// Abre un modal de Bootstrap por id
function abrirModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const instancia = bootstrap.Modal.getOrCreateInstance(el);
    instancia.show();
}

// Sufijo de URL asociado a cada modal de autenticación (ej: /inicio/login, /servicios/register)
const SUFIJOS_MODAL_AUTH = { modalLogin: 'login', modalRegister: 'register' };
const REGEX_SUFIJO_AUTH = /\/(login|register)\/?$/;

// Modal de autenticación que actualmente "posee" la URL (evita que el modal que se cierra pise la URL del que se abre)
let modalAuthActivo = null;
// Query string y hash de la página antes de abrir el primer modal, para restaurarlos al cerrar
let extraUrlPreviaAuth = '';

// Indica si la URL actual corresponde a un modal de autenticación (/login o /register)
function esUrlDeModalAuth() {
    return REGEX_SUFIJO_AUTH.test(window.location.pathname);
}

// Devuelve la ruta de la página actual sin el sufijo /login o /register (ej: /inicio/login -> /inicio)
function obtenerRutaBaseAuth() {
    const ruta = window.location.pathname.replace(REGEX_SUFIJO_AUTH, '').replace(/\/+$/, '');
    return ruta || '/inicio';
}

// Refleja en la URL el modal de autenticación que se está abriendo
function actualizarUrlModalAuth(idModal) {
    const sufijo = SUFIJOS_MODAL_AUTH[idModal];
    if (!sufijo) return;
    const rutaDestino = `${obtenerRutaBaseAuth()}/${sufijo}`;
    const vieneDeOtroModal = esUrlDeModalAuth();
    modalAuthActivo = idModal;
    if (window.location.pathname === rutaDestino) return;
    const estado = { ...(window.history.state || {}), modalAuth: idModal };
    if (vieneDeOtroModal) {
        // Cambio entre login <-> registro: se reemplaza la entrada para no acumular historial
        window.history.replaceState(estado, '', rutaDestino);
    } else {
        extraUrlPreviaAuth = `${window.location.search}${window.location.hash}`;
        window.history.pushState(estado, '', rutaDestino);
    }
}

// Restaura la URL base al cerrar un modal, solo si sigue siendo el modal activo
function restaurarUrlModalAuth(idModal) {
    if (modalAuthActivo !== idModal) return;
    modalAuthActivo = null;
    if (!esUrlDeModalAuth()) return;
    const { modalAuth, ...estadoSinModal } = window.history.state || {};
    window.history.replaceState(estadoSinModal, '', `${obtenerRutaBaseAuth()}${extraUrlPreviaAuth}`);
    extraUrlPreviaAuth = '';
}

// Limpia fondos (backdrops) sobrantes de modales para evitar problemas de scroll/overlay
function limpiarBackdropsSobrantes() {
    const modalesAbiertos = document.querySelectorAll('.modal.show');
    if (modalesAbiertos.length === 0) {
        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
    } else {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        if (backdrops.length > modalesAbiertos.length) {
            for (let i = 0; i < backdrops.length - modalesAbiertos.length; i++) {
                backdrops[i].remove();
            }
        }
    }
}

// Carrusel automático de fondos/indicadores: Controla avance y pausa al interactuar
(function iniciarCarrusel() {
    const fondos = document.querySelectorAll('.fondo-slide');
    const indicadores = document.querySelectorAll('.indicador');
    if (!fondos.length) return;
    let actual = 0;
    let intervalo = null;
    function irA(index) {
        fondos[actual].classList.remove('activo');
        indicadores[actual]?.classList.remove('activo');
        actual = (index + fondos.length) % fondos.length;
        fondos[actual].classList.add('activo');
        indicadores[actual]?.classList.add('activo');
    }
    function iniciarAuto() {
        intervalo = setInterval(() => irA(actual + 1), 5000);
    }
    function detenerAuto() {
        clearInterval(intervalo);
    }
    indicadores.forEach((btn, i) => {
        btn.addEventListener('click', () => {
            detenerAuto();
            irA(i);
            iniciarAuto();
        });
    });
    iniciarAuto();
})();

// Cambia la clase del navbar cuando la página se desplaza para ajustar estilos
window.addEventListener('scroll', () => {
    document.getElementById('navbar-principal')?.classList.toggle('navbar-scrolled', window.scrollY > 50);
});

// Almacena temporalmente el rol empresarial pendiente de verificación durante el registro
let rolPendienteVerificacion = null;

// Contraseñas de verificación para cuentas empresariales (soporta las variantes definidas)
const PASS_EMPRESARIAL = {
    administrador: ['admin123456789', '#admin$101010$access', '123456789', 'admin123'],
    gerente: ['gerente987654321', '#gerente$202020$access', '987654321', 'gerente123']
};

// Verifica si la contraseña ingresada coincide con las contraseñas válidas para el rol
function esPasswordEmpresarialValida(rol, pass) {
    if (!rol || !pass) return false;
    const rolNorm = rol.toLowerCase().trim();
    const passNorm = pass.trim();
    const permitidas = PASS_EMPRESARIAL[rolNorm];
    if (Array.isArray(permitidas)) {
        return permitidas.includes(passNorm);
    }
    return permitidas === passNorm;
}

// Prepara y muestra el modal para confirmar creación de cuentas empresariales
function abrirModalEmpresarial(rol) {
    rolPendienteVerificacion = (rol || '').toLowerCase().trim();
    const texto = document.getElementById('rolEmpresarialTexto');
    const input = document.getElementById('passEmpresarial');
    const err = document.getElementById('empresarialError');
    if (texto) texto.textContent = rolPendienteVerificacion === 'administrador' ? 'Administrador' : 'Gerente';
    if (input) {
        input.value = '';
        input.type = 'password';
        input.classList.remove('is-invalid');
    }
    const icon = input?.parentElement?.querySelector('.btn-toggle-password i');
    if (icon) icon.className = 'bi bi-eye';
    err?.classList.add('d-none');
    const modalRegister = document.getElementById('modalRegister');
    modalRegister.addEventListener('hidden.bs.modal', function handler() {
        abrirModal('modalEmpresarial');
        modalRegister.removeEventListener('hidden.bs.modal', handler);
    }, { once: true });
    bootstrap.Modal.getInstance(modalRegister)?.hide();
}

// Valida la contraseña empresarial y, si es correcta, ejecuta el flujo de registro
async function confirmarEmpresarial() {
    const input = document.getElementById('passEmpresarial');
    const err = document.getElementById('empresarialError');
    const btn = document.getElementById('btnConfirmarEmpresarial');
    err?.classList.add('d-none');
    input?.classList.remove('is-invalid');
    const passIngresada = (input?.value || '').trim();

    // Detección segura del rol en caso de que la variable global se haya desincronizado
    let rolActual = (rolPendienteVerificacion || '').toLowerCase().trim();
    if (!rolActual) {
        const textoModal = (document.getElementById('rolEmpresarialTexto')?.textContent || '').toLowerCase();
        if (textoModal.includes('admin')) {
            rolActual = 'administrador';
        } else if (textoModal.includes('gerente')) {
            rolActual = 'gerente';
        } else {
            rolActual = (document.getElementById('regRol')?.value || 'administrador').toLowerCase();
        }
        rolPendienteVerificacion = rolActual;
    }

    if (!esPasswordEmpresarialValida(rolActual, passIngresada)) {
        input?.classList.add('is-invalid');
        if (err) {
            err.innerHTML = '<i class="bi bi-x-circle me-2"></i>Contraseña incorrecta.';
            err.className = 'alert alert-danger text-center py-2';
            err.classList.remove('d-none');
        }
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Verificando...';
    }
    const exito = await ejecutarRegistro(rolActual);
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check-lg me-2"></i>Confirmar';
    }
    if (exito) {
        if (err) {
            err.innerHTML = '<i class="bi bi-check-circle me-2"></i>¡Cuenta creada correctamente!';
            err.className = 'alert alert-success text-center py-2';
            err.classList.remove('d-none');
        }
        setTimeout(() => {
            bootstrap.Modal.getInstance(document.getElementById('modalEmpresarial'))?.hide();
            rolPendienteVerificacion = null;
        }, 1500);
    } else {
        if (err) {
            err.innerHTML = '<i class="bi bi-x-circle me-2"></i>Error al crear la cuenta. Intenta de nuevo.';
            err.className = 'alert alert-danger text-center py-2';
            err.classList.remove('d-none');
        }
    }
}

// Inicializaciones y bindings que deben ejecutarse cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    // Garantiza que la cookie access_token de 20m, refresh_token y rol_activo estén activas si ya existen en sessionStorage
    const tokenActivo = sessionStorage.getItem(JWT_KEY);
    if (tokenActivo && !document.cookie.includes('access_token=')) {
        document.cookie = `access_token=${tokenActivo}; path=/; max-age=${20 * 60}; SameSite=Lax`;
    }
    const refreshTokenActivo = sessionStorage.getItem(REFRESH_KEY) || (function () { try { return localStorage.getItem(REFRESH_KEY); } catch (e) { return null; } })();
    if (refreshTokenActivo && !document.cookie.includes('refresh_token=')) {
        document.cookie = `refresh_token=${refreshTokenActivo}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    }
    if (tokenActivo && !sessionStorage.getItem(TOKEN_TIMESTAMP_KEY)) {
        sessionStorage.setItem(TOKEN_TIMESTAMP_KEY, String(Date.now()));
    }
    const sesionActiva = (typeof obtenerSesion === 'function') ? obtenerSesion() : null;
    if (sesionActiva && sesionActiva.rol && !document.cookie.includes('rol_activo=')) {
        document.cookie = `rol_activo=${sesionActiva.rol}; path=/; max-age=${20 * 60}; SameSite=Lax`;
    }
    actualizarNavbar();
    document.addEventListener('hidden.bs.modal', limpiarBackdropsSobrantes);
    const modalLogin = document.getElementById('modalLogin');
    const modalRegister = document.getElementById('modalRegister');
    modalLogin?.addEventListener('show.bs.modal', () => actualizarUrlModalAuth('modalLogin'));
    modalLogin?.addEventListener('hidden.bs.modal', () => restaurarUrlModalAuth('modalLogin'));
    modalRegister?.addEventListener('show.bs.modal', () => actualizarUrlModalAuth('modalRegister'));
    modalRegister?.addEventListener('hidden.bs.modal', () => restaurarUrlModalAuth('modalRegister'));
    // Sincroniza el modal visible con la URL (carga directa y botones atrás/adelante del navegador)
    const sincronizarModalesConUrl = () => {
        const ruta = window.location.pathname.replace(/\/+$/, '');
        [[modalLogin, '/login'], [modalRegister, '/register']].forEach(([modal, sufijo]) => {
            if (!modal) return;
            const instancia = bootstrap.Modal.getOrCreateInstance(modal);
            const debeEstarAbierto = ruta.endsWith(sufijo);
            if (debeEstarAbierto && !modal.classList.contains('show')) instancia.show();
            else if (!debeEstarAbierto && modal.classList.contains('show')) instancia.hide();
        });
    };
    sincronizarModalesConUrl();
    window.addEventListener('popstate', sincronizarModalesConUrl);
    const btnAgendar = document.getElementById('btn-agendar-hero');
    if (btnAgendar) {
        btnAgendar.removeAttribute('data-bs-toggle');
        btnAgendar.removeAttribute('data-bs-target');
        btnAgendar.addEventListener('click', manejarBtnAgendar);
    }
    document.getElementById('modalLogin')?.addEventListener('hidden.bs.modal', () => {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.classList.add('d-none');
            loginError.classList.remove('alert-info');
            loginError.classList.add('alert-danger');
            loginError.innerHTML = '<i class="bi bi-exclamation-circle me-2"></i>Correo o contraseña incorrectos.';
        }
    });
    const inputTel = document.getElementById('regTel');
    inputTel?.addEventListener('keypress', e => {
        if (!/[0-9]/.test(e.key)) e.preventDefault();
    });
    inputTel?.addEventListener('input', () => {
        inputTel.value = inputTel.value.replace(/\D/g, '').slice(0, 9);
    });
    ['regNombres', 'regApellidos'].forEach(id => {
        document.getElementById(id)?.addEventListener('keypress', e => {
            if (!/[A-Za-záéíóúÁÉÍÓÚñÑ\s]/.test(e.key)) e.preventDefault();
        });
    });
    document.getElementById('modalLogin')?.addEventListener('show.bs.modal', () => limpiarModal('modalLogin'));
    document.getElementById('modalRegister')?.addEventListener('show.bs.modal', () => limpiarModal('modalRegister'));
    ['loginEmail', 'loginPassword'].forEach(id => {
        document.getElementById(id)?.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                manejarLogin();
            }
        });
    });
    ['regNombres', 'regApellidos', 'regEmail', 'regTel', 'regPassword', 'regConfirm'].forEach(id => {
        document.getElementById(id)?.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                manejarRegister();
            }
        });
    });
    ['regNombres', 'regApellidos', 'regEmail', 'regTel', 'regPassword', 'regConfirm', 'loginEmail', 'loginPassword'].forEach(id => {
        const input = document.getElementById(id);
        input?.addEventListener('input', () => {
            if (input.classList.contains('is-invalid')) {
                input.classList.remove('is-invalid');
                const fb = input.parentNode.querySelector('.invalid-feedback') || input.closest('.mb-3, .col-sm-6, .col-12')?.querySelector('.invalid-feedback');
                if (fb) fb.textContent = '';
            }
        });
    });
    document.getElementById('aceptaTerminos')?.addEventListener('change', e => {
        if (e.target.checked) {
            marcarValido(e.target);
        }
        e.target.blur();
    });
    document.getElementById('btnLogin')?.addEventListener('click', manejarLogin);
    document.getElementById('btnRegister')?.addEventListener('click', manejarRegister);
    document.getElementById('btnConfirmarEmpresarial')?.addEventListener('click', confirmarEmpresarial);
    document.getElementById('passEmpresarial')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmarEmpresarial();
        }
    });
});

// Monitor de actividad y renovación silenciosa: cada 60s verifica si el usuario sigue activo
// y renueva el token JWT automáticamente cuando el token actual supere los 15 minutos de antigüedad
setInterval(async () => {
    const sesion = (typeof obtenerSesion === 'function') ? obtenerSesion() : null;
    if (!sesion) return;

    const ahora = Date.now();
    let ultimaActividad = _ultimaActividadLocal;
    try {
        const actStore = Number(localStorage.getItem(ACTIVIDAD_KEY) || '0');
        if (actStore > ultimaActividad) ultimaActividad = actStore;
    } catch (e) {}

    const tiempoInactivo = ahora - ultimaActividad;
    // Si el usuario tuvo interacción en los últimos 20 minutos
    if (tiempoInactivo < 20 * 60 * 1000) {
        const emitidoEn = Number(sessionStorage.getItem(TOKEN_TIMESTAMP_KEY) || '0');
        // Renueva preventivamente a partir de los 15 minutos (antes del corte a los 20 min)
        if (ahora - emitidoEn >= 15 * 60 * 1000) {
            await renovarTokenJWT();
        }
    }
}, 60000);

// Maneja el proceso de inicio de sesión: Validaciones, llamada al endpoint y manejo de UI
async function manejarLogin() {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const divExito = document.getElementById('loginExito');
    const divError = document.getElementById('loginError');
    const btnLogin = document.getElementById('btnLogin');
    btnLogin?.blur();
    divExito?.classList.add('d-none');
    divError?.classList.add('d-none');
    const emailValido = validarEmail(emailInput);
    const passwordValido = validarRequerido(passwordInput, 'La contraseña es obligatoria');
    if (!emailValido || !passwordValido) {
        btnLogin?.blur();
        return;
    }
    if (btnLogin) {
        btnLogin.disabled = true;
        btnLogin.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Cargando...';
    }
    try {
        const formData = new URLSearchParams();
        formData.append('email', emailInput.value.trim());
        formData.append('password', passwordInput.value);
        const resp = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData });
        if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));

            // Si la cuenta se encuentra inhabilitada y las credenciales fueron correctas
            if (errData.inhabilitado === true) {
                emailInput.classList.remove('is-invalid');
                passwordInput.classList.remove('is-invalid');
                const fbEmail = emailInput.parentElement?.querySelector('.invalid-feedback') || emailInput.closest('.mb-3')?.querySelector('.invalid-feedback');
                if (fbEmail) fbEmail.textContent = '';
                const fbPass = passwordInput.parentElement?.querySelector('.invalid-feedback') || passwordInput.closest('.mb-3')?.querySelector('.invalid-feedback');
                if (fbPass) fbPass.textContent = '';

                window._datosInhabilitado = errData;
                renderizarAlertaInhabilitado(errData);
                return;
            }

            window._datosInhabilitado = null;
            const msg = errData.message || 'Correo o contraseña incorrectos';
            marcarInvalido(emailInput, msg);
            marcarInvalido(passwordInput, msg);
            if (divError) {
                divError.innerHTML = `<i class="bi bi-exclamation-circle me-2"></i>${msg}`;
                divError.classList.remove('d-none');
            }
            return;
        }
        const usuario = await resp.json();
        guardarSesion(usuario);
        divExito?.classList.remove('d-none');
        const roles = Array.isArray(usuario.roles) ? usuario.roles.map(r => String(r).toLowerCase()) : [String(usuario.rol || 'cliente').toLowerCase()];
        const esAdmin = roles.includes('administrador') || (usuario.rol && usuario.rol.toLowerCase().includes('admin'));
        const esGerente = roles.includes('gerente') || (usuario.rol && usuario.rol.toLowerCase().includes('gerente'));

        let destino;
        if (esAdmin || esGerente || roles.length > 1) {
            destino = '/rol';
        } else {
            destino = `/cliente/${usuario.id}`;
        }
        setTimeout(() => {
            bootstrap.Modal.getInstance(document.getElementById('modalLogin'))?.hide();
            window.location.href = destino;
        }, 1200);
    } catch (err) {
        console.error('Error de conexión:', err);
        if (divError) {
            divError.innerHTML = '<i class="bi bi-wifi-off me-2"></i>Error de conexión. Intenta de nuevo.';
            divError.classList.remove('d-none');
        }
    } finally {
        if (btnLogin) {
            btnLogin.disabled = false;
            btnLogin.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Ingresar';
            btnLogin.blur();
        }
    }
}

// Formatea fechas ISO de forma segura para los modales de clientes
function formatearFechaSimple(val) {
    if (!val) return '---';
    try {
        let d;
        if (Array.isArray(val)) {
            d = new Date(val[0], val[1] - 1, val[2], val[3] || 0, val[4] || 0);
        } else {
            d = new Date(val);
        }
        if (isNaN(d.getTime())) return String(val);
        const dia = String(d.getDate()).padStart(2, '0');
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const anio = d.getFullYear();
        const horas = String(d.getHours()).padStart(2, '0');
        const minutos = String(d.getMinutes()).padStart(2, '0');
        return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
    } catch (e) {
        return String(val);
    }
}

// Renderiza el mensaje de alerta para usuarios inhabilitados con los botones de acción requeridos
function renderizarAlertaInhabilitado(errData) {
    const divError = document.getElementById('loginError');
    if (!divError) return;
    divError.classList.remove('d-none', 'alert-info', 'alert-success');
    divError.classList.add('alert-danger');

    const tieneRespuesta = Boolean(errData.respuestaApelacion || errData.estadoApelacion === 'RECHAZADA' || errData.estadoApelacion === 'ACEPTADA' || errData.mensajeHabilitacion);
    const esPendiente = (errData.estadoApelacion || '').toUpperCase() === 'PENDIENTE';
    const puedeApelar = errData.puedeApelar !== false;

    let btnApelarHtml = '';
    if (esPendiente) {
        btnApelarHtml = `
            <div class="badge bg-warning text-dark py-2 px-2 fw-semibold text-wrap text-center" style="font-size:0.78rem;">
                <i class="bi bi-hourglass-split me-1"></i>Apelación enviada en revisión por administración
            </div>
        `;
    } else if (puedeApelar) {
        btnApelarHtml = `
            <button type="button" class="btn btn-sm btn-danger fw-semibold w-100 text-white" onclick="abrirModalEnviarApelacion()">
                <i class="bi bi-shield-exclamation me-1"></i>Solicitar apelación
            </button>
        `;
    } else {
        const dias = errData.diasRestantes || 1;
        btnApelarHtml = `
            <button type="button" class="btn btn-sm btn-secondary fw-semibold w-100 text-white opacity-75" disabled title="Solo puedes apelar una vez cada 7 días">
                <i class="bi bi-clock-history me-1"></i>Nueva apelación disponible en ${dias} día(s)
            </button>
        `;
    }

    divError.innerHTML = `
        <div class="text-center mb-2" style="line-height: 1.4;">
            <strong class="d-block text-danger">Tu cuenta se encuentra inhabilitada.</strong>
            <span class="small text-danger text-opacity-75">Contacta con administración.</span>
        </div>
        <div class="d-flex flex-column gap-2 mt-2 pt-2 border-top border-danger border-opacity-25">
            <button type="button" class="btn btn-sm btn-outline-danger fw-semibold w-100" onclick="abrirModalVerMotivoBloqueo()">
                <i class="bi bi-info-circle me-1"></i>Ver motivo de suspensión
            </button>
            ${tieneRespuesta ? `
                <button type="button" class="btn btn-sm btn-outline-danger fw-semibold w-100" onclick="abrirModalVerRespuestaAdmin()">
                    <i class="bi bi-chat-right-quote me-1"></i>Ver respuesta de administración
                </button>
            ` : ''}
            ${btnApelarHtml}
        </div>
    `;
}

// Cierra modal secundario y regresa fluidamente al modal de Login
function volverALoginDesdeModal(idModalCerrar) {
    const el = document.getElementById(idModalCerrar);
    if (el) {
        bootstrap.Modal.getInstance(el)?.hide();
    }
    setTimeout(() => {
        const modalLogin = document.getElementById('modalLogin');
        if (modalLogin) {
            const err = window._datosInhabilitado || {};
            const fueAceptada = (err.estadoApelacion || '').toUpperCase() === 'ACEPTADA' || err.estado === 'Activo';
            if (fueAceptada) {
                const loginError = document.getElementById('loginError');
                if (loginError) {
                    loginError.classList.add('d-none');
                }
            }
            bootstrap.Modal.getOrCreateInstance(modalLogin).show();
        }
    }, 200);
}

// Abre el modal para ver el motivo de suspensión y evidencia adjunta
function abrirModalVerMotivoBloqueo() {
    const err = window._datosInhabilitado || {};
    const modalLogin = document.getElementById('modalLogin');
    if (modalLogin) {
        bootstrap.Modal.getInstance(modalLogin)?.hide();
    }

    const nombreEl = document.getElementById('motivoBloqueoClienteNombre');
    const fechaEl = document.getElementById('motivoBloqueoFecha');
    const textoEl = document.getElementById('motivoBloqueoTexto');
    const imgCont = document.getElementById('motivoBloqueoEvidenciaContenedor');
    const imgEl = document.getElementById('motivoBloqueoEvidenciaImg');

    if (nombreEl) nombreEl.textContent = err.nombres ? `Cuenta de ${err.nombres} inhabilitada` : 'Cuenta inhabilitada';
    if (fechaEl) fechaEl.textContent = `Fecha de suspensión: ${formatearFechaSimple(err.fechaBloqueo)}`;
    if (textoEl) textoEl.textContent = err.motivoBloqueo || 'Sin motivo especificado.';

    if (imgCont && imgEl) {
        if (err.evidenciaBloqueo) {
            imgEl.src = err.evidenciaBloqueo;
            imgCont.classList.remove('d-none');
        } else {
            imgEl.src = '';
            imgCont.classList.add('d-none');
        }
    }

    const modal = document.getElementById('modalVerMotivoBloqueo');
    if (modal) {
        bootstrap.Modal.getOrCreateInstance(modal).show();
    }
}

// Abre el modal para redactar y enviar una apelación a la administración
function abrirModalEnviarApelacion() {
    const err = window._datosInhabilitado || {};
    const modalLogin = document.getElementById('modalLogin');
    if (modalLogin) {
        bootstrap.Modal.getInstance(modalLogin)?.hide();
    }

    const txtArea = document.getElementById('txtMensajeApelacionCliente');
    const counter = document.getElementById('contadorCharsApelacion');
    const alertaCd = document.getElementById('alertaCooldownApelacion');
    const alertaOk = document.getElementById('alertaExitoApelacion');
    const diasTxt = document.getElementById('diasRestantesApelacionTxt');
    const btnSubmit = document.getElementById('btnEnviarApelacionSubmit');
    const errorMsg = document.getElementById('errorMensajeApelacion');

    if (txtArea) {
        txtArea.value = '';
        txtArea.classList.remove('is-invalid');
    }
    if (counter) counter.textContent = '0';
    if (errorMsg) errorMsg.textContent = '';
    alertaOk?.classList.add('d-none');

    const puedeApelar = err.puedeApelar !== false;
    if (!puedeApelar) {
        if (diasTxt) diasTxt.textContent = String(err.diasRestantes || 1);
        alertaCd?.classList.remove('d-none');
        if (txtArea) txtArea.disabled = true;
        if (btnSubmit) btnSubmit.disabled = true;
    } else {
        alertaCd?.classList.add('d-none');
        if (txtArea) txtArea.disabled = false;
        if (btnSubmit) btnSubmit.disabled = false;
    }

    // Listener para actualizar el contador de caracteres en tiempo real
    if (txtArea && !txtArea._hasCounterListener) {
        txtArea._hasCounterListener = true;
        txtArea.addEventListener('input', () => {
            const cnt = document.getElementById('contadorCharsApelacion');
            if (cnt) cnt.textContent = String(txtArea.value.length);
            if (txtArea.value.trim().length > 0) {
                txtArea.classList.remove('is-invalid');
            }
        });
    }

    const modal = document.getElementById('modalEnviarApelacion');
    if (modal) {
        bootstrap.Modal.getOrCreateInstance(modal).show();
    }
}

// Envía la solicitud de apelación del cliente a /api/usuarios/apelar
async function enviarApelacionCliente() {
    const txtArea = document.getElementById('txtMensajeApelacionCliente');
    const btnSubmit = document.getElementById('btnEnviarApelacionSubmit');
    const alertaOk = document.getElementById('alertaExitoApelacion');
    const errorMsg = document.getElementById('errorMensajeApelacion');
    const err = window._datosInhabilitado || {};

    const mensaje = txtArea ? txtArea.value.trim() : '';
    if (!mensaje) {
        if (txtArea) txtArea.classList.add('is-invalid');
        if (errorMsg) errorMsg.textContent = 'Por favor escribe un mensaje detallando tu apelación.';
        return;
    }

    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';
    }

    try {
        const resp = await fetch('/api/usuarios/apelar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: err.email, mensaje: mensaje })
        });
        const data = await resp.json().catch(() => ({}));

        if (!resp.ok) {
            if (txtArea) txtArea.classList.add('is-invalid');
            if (errorMsg) errorMsg.textContent = data.message || 'No se pudo enviar la apelación.';
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="bi bi-send me-1"></i>Enviar apelación';
            }
            return;
        }

        // Éxito al enviar la apelación
        if (alertaOk) {
            alertaOk.textContent = data.message || '¡Apelación enviada con éxito! La administración evaluará tu solicitud.';
            alertaOk.classList.remove('d-none');
        }
        if (txtArea) txtArea.disabled = true;
        if (btnSubmit) {
            btnSubmit.innerHTML = '<i class="bi bi-check2 me-1"></i>Enviado';
        }

        // Actualizar el estado en memoria para reflejarlo en el login
        if (window._datosInhabilitado) {
            window._datosInhabilitado.estadoApelacion = 'PENDIENTE';
            window._datosInhabilitado.puedeApelar = false;
            window._datosInhabilitado.mensajeApelacion = mensaje;
            renderizarAlertaInhabilitado(window._datosInhabilitado);
        }

        setTimeout(() => {
            volverALoginDesdeModal('modalEnviarApelacion');
        }, 1500);

    } catch (e) {
        console.error('Error al enviar apelación:', e);
        if (errorMsg) errorMsg.textContent = 'Error de conexión. Intenta de nuevo.';
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="bi bi-send me-1"></i>Enviar apelación';
        }
    }
}

// Abre el modal para visualizar la respuesta / resolución de la administración
function abrirModalVerRespuestaAdmin() {
    const err = window._datosInhabilitado || {};
    const modalLogin = document.getElementById('modalLogin');
    if (modalLogin) {
        bootstrap.Modal.getInstance(modalLogin)?.hide();
    }

    const header = document.getElementById('headerModalVerRespuesta');
    const icono = document.getElementById('iconoRespuestaAdmin');
    const titulo = document.getElementById('estadoResolucionTitulo');
    const fechaEl = document.getElementById('fechaRespuestaAdmin');
    const textoEl = document.getElementById('textoRespuestaAdminDetalle');
    const imgCont = document.getElementById('evidenciaRespuestaAdminContenedor');
    const imgEl = document.getElementById('evidenciaRespuestaAdminImg');
    const avisoReactivada = document.getElementById('avisoReactivacionCuenta');
    const btnAccion = document.getElementById('btnAccionRespuestaAdmin');

    const fueAceptada = (err.estadoApelacion || '').toUpperCase() === 'ACEPTADA' || err.estado === 'Activo';

    if (fueAceptada) {
        if (header) header.style.background = '#198754';
        if (icono) {
            icono.style.background = '#dcfce7';
            icono.style.color = '#15803d';
            icono.innerHTML = '<i class="bi bi-check-circle-fill"></i>';
        }
        if (titulo) {
            titulo.textContent = '¡Apelación Aprobada!';
            titulo.className = 'fw-bold mb-1 text-success';
        }
        avisoReactivada?.classList.remove('d-none');
        if (btnAccion) {
            btnAccion.className = 'btn btn-success py-2 fw-semibold';
            btnAccion.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i>Iniciar Sesión';
        }
    } else {
        if (header) header.style.background = 'var(--azul-oscuro, #0a3d6b)';
        if (icono) {
            icono.style.background = '#fee2e2';
            icono.style.color = '#dc3545';
            icono.innerHTML = '<i class="bi bi-x-circle-fill"></i>';
        }
        if (titulo) {
            titulo.textContent = 'Apelación Revisada - Cuenta Inhabilitada';
            titulo.className = 'fw-bold mb-1 text-danger';
        }
        avisoReactivada?.classList.add('d-none');
        if (btnAccion) {
            btnAccion.className = 'btn btn-primary py-2 fw-semibold';
            btnAccion.innerHTML = '<i class="bi bi-arrow-left me-1"></i>Volver al inicio de sesión';
        }
    }

    const fechaResp = err.fechaRespuestaApelacion || err.fechaHabilitacion || err.fechaBloqueo;
    if (fechaEl) fechaEl.textContent = `Fecha de respuesta: ${formatearFechaSimple(fechaResp)}`;

    const mensajeRespuesta = err.respuestaApelacion || err.mensajeHabilitacion || 'La administración ha revisado el caso y determinó mantener el estado actual de la cuenta.';
    if (textoEl) textoEl.textContent = mensajeRespuesta;

    const evidencia = err.evidenciaRespuesta || err.evidenciaHabilitacion;
    if (imgCont && imgEl) {
        if (evidencia) {
            imgEl.src = evidencia;
            imgCont.classList.remove('d-none');
        } else {
            imgEl.src = '';
            imgCont.classList.add('d-none');
        }
    }

    const modal = document.getElementById('modalVerRespuestaAdmin');
    if (modal) {
        bootstrap.Modal.getOrCreateInstance(modal).show();
    }
}

// Maneja el registro de usuarios: Valida campos en el cliente y dispara el registro al servidor
async function manejarRegister() {
    document.getElementById('btnRegister')?.blur();
    const campos = {
        nombres: document.getElementById('regNombres'),
        apellidos: document.getElementById('regApellidos'),
        email: document.getElementById('regEmail'),
        tel: document.getElementById('regTel'),
        password: document.getElementById('regPassword'),
        confirm: document.getElementById('regConfirm'),
        checkbox: document.getElementById('aceptaTerminos')
    };
    const rolSeleccionado = (document.getElementById('regRol')?.value || 'cliente').toLowerCase().trim();
    const divExito = document.getElementById('registerExito');
    const divError = document.getElementById('registerError');
    divExito?.classList.add('d-none');
    divError?.classList.add('d-none');

    // Validación local del formulario (aprovecha recursos del cliente, sin peticiones innecesarias al servidor)
    const valido = validarTexto(campos.nombres, 'El nombre es obligatorio') &
                   validarTexto(campos.apellidos, 'El apellido es obligatorio') &
                   validarEmail(campos.email) &
                   validarTel(campos.tel) &
                   validarPassword(campos.password) &
                   validarConfirm(campos.password, campos.confirm) &
                   validarCheckbox(campos.checkbox);
    if (!valido) return;

    if (rolSeleccionado !== 'cliente') {
        rolPendienteVerificacion = rolSeleccionado;
        abrirModalEmpresarial(rolSeleccionado);
        return;
    }

    // Envía la petición al servidor en una sola llamada completa
    const exito = await ejecutarRegistro(rolSeleccionado);
    if (exito) {
        setTimeout(() => {
            bootstrap.Modal.getInstance(document.getElementById('modalRegister'))?.hide();
        }, 2000);
    }
}

// Realiza la llamada al endpoint de registro y actualiza la UI según la respuesta de la BD
async function ejecutarRegistro(rol) {
    const btnReg = document.getElementById('btnRegister');
    const divExito = document.getElementById('registerExito');
    const divError = document.getElementById('registerError');
    const msgError = document.getElementById('registerErrorMsg');

    // Muestra estado de cargando con icono giratorio y deshabilita el botón
    if (btnReg) {
        btnReg.disabled = true;
        btnReg.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Cargando...';
    }
    divExito?.classList.add('d-none');
    divError?.classList.add('d-none');

    try {
        const resp = await fetch('/api/usuarios/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombres: document.getElementById('regNombres')?.value.trim(),
                apellidos: document.getElementById('regApellidos')?.value.trim(),
                email: document.getElementById('regEmail')?.value.trim(),
                telefono: document.getElementById('regTel')?.value.trim(),
                password: document.getElementById('regPassword')?.value,
                rol: rol
            })
        });

        // Caso 409 Conflict: El correo ya existe registrado en la BD del servidor
        if (resp.status === 409) {
            const dataErr = await resp.json().catch(() => ({}));
            const campoEmail = document.getElementById('regEmail');
            if (campoEmail) {
                marcarInvalido(campoEmail, 'Este correo ya se encuentra registrado. Usa otro correo o inicia sesión.');
                campoEmail.focus();
            }
            if (msgError) {
                msgError.textContent = 'Este correo ya se encuentra registrado en el sistema. Inicia sesión o utiliza otro correo.';
            }
            divError?.classList.remove('d-none');
            return false;
        }

        // Si el servidor responde con otro error
        if (!resp.ok) {
            const dataErr = await resp.json().catch(() => ({}));
            const errorDetalle = dataErr.error || 'Hubo un error al registrar la cuenta. Por favor, inténtalo de nuevo.';
            if (msgError) msgError.textContent = errorDetalle;
            divError?.classList.remove('d-none');
            return false;
        }

        // Éxito: Los datos llegaron a la BD exitosamente
        const dataOk = await resp.json().catch(() => ({}));
        if (divExito) {
            divExito.innerHTML = '<i class="bi bi-check-circle me-2"></i>¡Cuenta creada con éxito! Ya puedes iniciar sesión.';
            divExito.classList.remove('d-none');
        }
        limpiarCamposRegister();
        return true;
    } catch (e) {
        console.error('Error al registrar usuario:', e);
        if (msgError) {
            msgError.textContent = 'Hubo un problema de conexión con el servidor. Por favor, inténtalo de nuevo.';
        }
        divError?.classList.remove('d-none');
        return false;
    } finally {
        // Restaura el botón a su estado normal
        if (btnReg) {
            btnReg.disabled = false;
            btnReg.innerHTML = '<i class="bi bi-person-check me-2"></i>Crear mi cuenta';
        }
    }
}

// Validación de campo requerido genérico
function validarRequerido(campo, mensaje) {
    if (!campo.value.trim()) {
        marcarInvalido(campo, mensaje);
        return false;
    }
    marcarValido(campo);
    return true;
}

// Validación que acepta solo letras y espacios para campos de nombre/apellidos
function validarTexto(campo, mensaje) {
    const v = campo.value.trim();
    if (!v) {
        marcarInvalido(campo, mensaje);
        return false;
    }
    if (!/^[A-Za-záéíóúÁÉÍÓÚñÑ\s]+$/.test(v)) {
        marcarInvalido(campo, 'Solo se permiten letras y espacios');
        return false;
    }
    marcarValido(campo);
    return true;
}

// Validación de correo que exige dominio @gmail.com
function validarEmail(campo) {
    const v = campo.value.trim();
    if (!v) {
        marcarInvalido(campo, 'El correo electrónico es obligatorio');
        return false;
    }
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(v)) {
        marcarInvalido(campo, 'Ingresa un correo @gmail.com válido');
        return false;
    }
    marcarValido(campo);
    return true;
}

// Validación asíncrona de email que comprueba formato y unicidad en la Base de Datos
async function verificarEmailUnicoBD(campo) {
    if (!campo) return false;
    const v = campo.value.trim();
    if (!v) {
        marcarInvalido(campo, 'El correo electrónico es obligatorio');
        return false;
    }
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(v)) {
        marcarInvalido(campo, 'Ingresa un correo @gmail.com válido');
        return false;
    }
    try {
        const resp = await fetch(`/api/usuarios/verificar-email?email=${encodeURIComponent(v.toLowerCase())}`);
        if (resp.ok) {
            const data = await resp.json();
            if (data.existe) {
                marcarInvalido(campo, 'Este correo ya se encuentra registrado. Usa otro correo o inicia sesión.');
                return false;
            }
        }
    } catch (e) {
        console.warn('Error al verificar unicidad del correo:', e);
    }
    marcarValido(campo);
    return true;
}

// Validación de teléfono: Debe tener exactamente 9 dígitos numéricos y comenzar en 9
function validarTel(campo) {
    const v = campo.value.trim();
    if (!v) {
        marcarInvalido(campo, 'El teléfono es obligatorio');
        return false;
    }
    if (!/^9\d{8}$/.test(v)) {
        marcarInvalido(campo, 'El teléfono debe tener 9 dígitos y empezar con 9');
        return false;
    }
    marcarValido(campo);
    return true;
}

// Validación de contraseña con longitud mínima de 8 caracteres
function validarPassword(campo) {
    const v = campo.value;
    if (!v) {
        marcarInvalido(campo, 'La contraseña es obligatoria');
        return false;
    }
    if (v.length < 8) {
        marcarInvalido(campo, 'La contraseña debe tener al menos 8 caracteres');
        return false;
    }
    marcarValido(campo);
    return true;
}

// Validación de confirmación de contraseña
function validarConfirm(passCampo, confirmCampo) {
    const c = confirmCampo.value;
    if (!c) {
        marcarInvalido(confirmCampo, 'Confirmar tu contraseña es obligatorio');
        return false;
    }
    if (c !== passCampo.value) {
        marcarInvalido(confirmCampo, 'Las contraseñas no coinciden');
        return false;
    }
    marcarValido(confirmCampo);
    return true;
}

// Validación para la casilla de aceptación de términos y condiciones
function validarCheckbox(checkbox) {
    if (!checkbox.checked) {
        marcarInvalido(checkbox, 'Debes aceptar nuestros términos y condiciones');
        return false;
    }
    marcarValido(checkbox);
    return true;
}

// Alterna la visibilidad de la contraseña (tipo password <-> text) y conmuta el icono del ojito
function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const esPassword = input.type === 'password';
    input.type = esPassword ? 'text' : 'password';
    const icon = btn ? btn.querySelector('i') : null;
    if (icon) {
        // Al revelar la contraseña (tipo text) se muestra el ojo normal sin tachar ('bi bi-eye')
        // Al ocultar la contraseña (tipo password en puntos) se muestra el ojo tachado ('bi bi-eye-slash')
        icon.className = esPassword ? 'bi bi-eye' : 'bi bi-eye-slash';
    }
    btn?.blur();
}

// Aplica estilos de campo inválido y muestra el mensaje de error correspondiente
function marcarInvalido(campo, mensaje) {
    campo.classList.remove('is-valid');
    campo.classList.add('is-invalid');
    const fb = campo.parentNode.querySelector('.invalid-feedback') || campo.closest('.mb-3, .col-sm-6, .col-12')?.querySelector('.invalid-feedback');
    if (fb) {
        fb.textContent = mensaje;
        fb.style.display = 'block';
    }
}

// Aplica estilos de campo válido y limpia mensajes de error
function marcarValido(campo) {
    campo.classList.remove('is-invalid');
    campo.classList.add('is-valid');
    const fb = campo.parentNode.querySelector('.invalid-feedback') || campo.closest('.mb-3, .col-sm-6, .col-12')?.querySelector('.invalid-feedback');
    if (fb) {
        fb.textContent = '';
        fb.style.display = '';
    }
}

// Limpia los campos y estados de un modal específico (inputs, feedback, checkboxes, ojitos)
function limpiarModal(modalId) {
    document.querySelectorAll(`#${modalId} .form-control`).forEach(campo => {
        campo.classList.remove('is-invalid', 'is-valid');
        campo.value = '';
        const fb = campo.parentNode.querySelector('.invalid-feedback') || campo.closest('.mb-3, .col-sm-6, .col-12')?.querySelector('.invalid-feedback');
        if (fb) fb.textContent = '';
    });
    // Restablece los campos de contraseña a tipo password y el icono del ojito a bi-eye-slash
    document.querySelectorAll(`#${modalId} input[id$="Password"], #${modalId} input[id$="Confirm"]`).forEach(input => {
        input.type = 'password';
    });
    document.querySelectorAll(`#${modalId} .btn-toggle-password i`).forEach(icon => {
        icon.className = 'bi bi-eye-slash';
    });
    const checkbox = document.getElementById('aceptaTerminos');
    if (checkbox) {
        checkbox.checked = false;
        checkbox.classList.remove('is-invalid', 'is-valid');
        const fb = checkbox.parentNode.querySelector('.invalid-feedback') || checkbox.closest('.col-12')?.querySelector('.invalid-feedback');
        if (fb) fb.textContent = '';
    }
    document.getElementById('registerExito')?.classList.add('d-none');
    document.getElementById('registerError')?.classList.add('d-none');
    document.getElementById('loginExito')?.classList.add('d-none');
    document.getElementById('loginError')?.classList.add('d-none');
}

// Limpia los campos del formulario de registro
function limpiarCamposRegister() {
    ['regNombres', 'regApellidos', 'regEmail', 'regTel', 'regPassword', 'regConfirm'].forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            campo.value = '';
            campo.classList.remove('is-valid', 'is-invalid');
            const fb = campo.parentNode.querySelector('.invalid-feedback') || campo.closest('.mb-3, .col-sm-6, .col-12')?.querySelector('.invalid-feedback');
            if (fb) fb.textContent = '';
        }
    });
    ['regPassword', 'regConfirm'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.type = 'password';
    });
    document.querySelectorAll('#modalRegister .btn-toggle-password i').forEach(icon => {
        icon.className = 'bi bi-eye-slash';
    });
    const checkbox = document.getElementById('aceptaTerminos');
    if (checkbox) {
        checkbox.checked = false;
        checkbox.classList.remove('is-valid', 'is-invalid');
    }
}

// ========================================================
// COMPONENTE DESPLEGABLE PERSONALIZADO (CUSTOM SELECT)
// ========================================================

// Resuelve el elemento <select> a partir de su ID o referencia directa
function resolverElementoSelect(selectTarget) {
    return typeof selectTarget === 'string' ? document.getElementById(selectTarget) : selectTarget;
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

// Posiciona un menú portal sobre la pantalla alineado con su botón disparador
function posicionarMenuPortal(trigger, menu) {
    const rect = trigger.getBoundingClientRect();
    menu.style.left = `${rect.left}px`;
    menu.style.width = `${rect.width}px`;
    menu.classList.add('open');
    const altoMenu = menu.offsetHeight || 120;
    const cabeAbajo = rect.bottom + 2 + altoMenu <= window.innerHeight - 12;
    const topPos = cabeAbajo ? rect.bottom + 2 : Math.max(8, rect.top - altoMenu - 2);
    menu.style.top = `${topPos}px`;
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

        if (opt.disabled) {
            li.classList.add('disabled');
            li.setAttribute('aria-disabled', 'true');
        } else {
            li.addEventListener('click', e => {
                e.stopPropagation();
                if (select.value !== opt.value) {
                    select.value = opt.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
                sincronizarSelectPersonalizado(select);
                cerrarTodosSelectsPersonalizados();
            });
        }
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
