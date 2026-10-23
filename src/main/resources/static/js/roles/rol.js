let rolSeleccionado = null;
let sesionActual = null;

document.addEventListener('DOMContentLoaded', inicializarSeleccionRol);

async function inicializarSeleccionRol() {
    const errorEl = document.getElementById('rolError');

    // Fuente primaria: datos ya guardados en sessionStorage (no requiere llamada al servidor)
    const sesionGuardada = (typeof obtenerSesion === 'function') ? obtenerSesion() : null;

    if (sesionGuardada && sesionGuardada.id &&
        Array.isArray(sesionGuardada.roles) && sesionGuardada.roles.length > 0) {

        sesionActual = Object.assign({}, sesionGuardada);
        const roles = sesionActual.roles
            .map(function(r) { return String(r).toLowerCase(); })
            .filter(function(r) { return ['cliente', 'administrador', 'gerente'].indexOf(r) !== -1; });

        if (roles.length === 0) {
            mostrarError(errorEl, 'La cuenta no tiene roles de acceso validos. Contacta con soporte.');
            return;
        }
        sesionActual.roles = roles;
        configurarUI(roles, errorEl);

        // Sincronizacion silenciosa con servidor (no bloquea la UI)
        sincronizarConServidor().catch(function() {
            console.warn('No se pudo sincronizar roles con el servidor. Usando datos locales.');
        });
        return;
    }

    // Fallback: sin sessionStorage, intentar via JWT
    try {
        const resp = await fetch('/api/usuarios/roles-disponibles');
        if (resp.status === 401) {
            window.location.href = '/inicio';
            return;
        }
        if (!resp.ok) {
            throw new Error('No se pudieron cargar tus roles. Intenta de nuevo mas tarde.');
        }

        const usuario = await resp.json();
        const roles = Array.isArray(usuario.roles)
            ? usuario.roles
                .map(function(rol) { return String(rol).toLowerCase(); })
                .filter(function(rol) { return ['cliente', 'administrador', 'gerente'].indexOf(rol) !== -1; })
            : [];

        if (!Number.isSafeInteger(Number(usuario.id)) || Number(usuario.id) <= 0 || roles.length === 0) {
            throw new Error('La cuenta no tiene roles de acceso validos. Contacta con soporte.');
        }

        sesionActual = Object.assign({}, sesionGuardada || {}, usuario, {
            id: Number(usuario.id),
            roles: roles
        });

        configurarUI(roles, errorEl);
    } catch (error) {
        console.error('Error al inicializar la seleccion de rol:', error);
        mostrarError(errorEl, error.message || 'No se pudo cargar la seleccion de roles.');
    }
}

async function sincronizarConServidor() {
    const resp = await fetch('/api/usuarios/roles-disponibles');
    if (!resp.ok) return;
    const usuario = await resp.json();
    const rolesActualizados = Array.isArray(usuario.roles)
        ? usuario.roles
            .map(function(r) { return String(r).toLowerCase(); })
            .filter(function(r) { return ['cliente', 'administrador', 'gerente'].indexOf(r) !== -1; })
        : [];
    if (rolesActualizados.length > 0) {
        sesionActual = Object.assign({}, sesionActual, usuario, {
            id: Number(usuario.id),
            roles: rolesActualizados
        });
    }
}

function configurarUI(roles, errorEl) {
    const nombreEl = document.getElementById('usuarioNombre');
    const primerNombre = String(sesionActual.nombres || '').trim().split(/\s+/)[0];
    if (nombreEl && primerNombre) {
        nombreEl.textContent = primerNombre;
    }

    if (roles.length === 1 && roles[0] === 'cliente') {
        sesionActual.rol = 'cliente';
        guardarSesion(sesionActual);
        window.location.href = '/cliente/' + sesionActual.id;
        return;
    }

    const cardsPorRol = {
        cliente: document.getElementById('opcion-cliente'),
        administrador: document.getElementById('opcion-administrador'),
        gerente: document.getElementById('opcion-gerente')
    };

    ['cliente', 'administrador', 'gerente'].forEach(function(rol) {
        const card = cardsPorRol[rol];
        if (!card) return;
        if (roles.indexOf(rol) !== -1) {
            card.classList.remove('d-none');
        }
        document.getElementById('rolesContenedor').appendChild(card);
    });

    document.querySelectorAll('.rol-card-item').forEach(function(card) {
        card.addEventListener('keydown', function(event) {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            seleccionarRolCard(card.dataset.rol);
        });
        card.addEventListener('dblclick', confirmarRolSeleccionado);
    });
}

function mostrarError(errorEl, mensaje) {
    if (errorEl) {
        errorEl.textContent = mensaje;
        errorEl.classList.remove('d-none');
    }
    document.querySelectorAll('.rol-card-item').forEach(function(card) { card.classList.add('d-none'); });
    const continuar = document.getElementById('btnContinuarRol');
    if (continuar) continuar.disabled = true;
}

function seleccionarRolCard(rol) {
    const rolesDisponibles = (sesionActual && sesionActual.roles) ? sesionActual.roles : [];
    if (rolesDisponibles.indexOf(rol) === -1) return;

    rolSeleccionado = rol;
    document.querySelectorAll('.rol-card-item').forEach(function(card) {
        const seleccionado = card.dataset.rol === rol;
        card.classList.toggle('selected', seleccionado);
        card.setAttribute('aria-pressed', seleccionado ? 'true' : 'false');
    });

    const btnContinuar = document.getElementById('btnContinuarRol');
    if (btnContinuar) btnContinuar.disabled = false;
}

function confirmarRolSeleccionado() {
    if (!rolSeleccionado || !sesionActual || sesionActual.roles.indexOf(rolSeleccionado) === -1) return;

    if (!sesionActual.rolBase) {
        sesionActual.rolBase = sesionActual.roles.indexOf('gerente') !== -1 ? 'gerente' : (sesionActual.roles.indexOf('administrador') !== -1 ? 'administrador' : 'cliente');
    }
    sesionActual.rol = rolSeleccionado;
    guardarSesion(sesionActual);

    const btn = document.getElementById('btnContinuarRol');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Ingresando...';
    }

    const destinos = {
        cliente: '/cliente/' + sesionActual.id,
        administrador: '/administrador/' + sesionActual.id,
        gerente: '/gerente/' + sesionActual.id
    };
    window.location.href = destinos[rolSeleccionado];
}
