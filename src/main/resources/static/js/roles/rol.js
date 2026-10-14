let rolSeleccionado = null;
let sesionActual = null;

document.addEventListener('DOMContentLoaded', inicializarSeleccionRol);

async function inicializarSeleccionRol() {
    const errorEl = document.getElementById('rolError');
    try {
        const resp = await fetch('/api/usuarios/roles-disponibles');
        if (resp.status === 401) {
            window.location.href = '/inicio';
            return;
        }
        if (!resp.ok) {
            throw new Error('No se pudieron cargar tus roles. Intenta de nuevo más tarde.');
        }

        const usuario = await resp.json();
        const roles = Array.isArray(usuario.roles)
            ? usuario.roles.map(rol => String(rol).toLowerCase()).filter(rol =>
                ['cliente', 'administrador', 'gerente'].includes(rol))
            : [];

        if (!Number.isSafeInteger(Number(usuario.id)) || Number(usuario.id) <= 0 || roles.length === 0) {
            throw new Error('La cuenta no tiene roles de acceso válidos. Contacta con soporte.');
        }

        sesionActual = {
            ...(typeof obtenerSesion === 'function' ? obtenerSesion() : {}),
            ...usuario,
            id: Number(usuario.id),
            roles
        };

        const nombreEl = document.getElementById('usuarioNombre');
        const primerNombre = String(sesionActual.nombres || '').trim().split(/\s+/)[0];
        if (nombreEl && primerNombre) {
            nombreEl.textContent = primerNombre;
        }

        if (roles.length === 1 && roles[0] === 'cliente') {
            sesionActual.rol = 'cliente';
            guardarSesion(sesionActual);
            window.location.href = `/cliente/${sesionActual.id}`;
            return;
        }

        const cardsPorRol = {
            cliente: document.getElementById('opcion-cliente'),
            administrador: document.getElementById('opcion-administrador'),
            gerente: document.getElementById('opcion-gerente')
        };
        ['cliente', 'administrador', 'gerente'].forEach(rol => {
            const card = cardsPorRol[rol];
            if (!card) return;
            if (roles.includes(rol)) {
                card.classList.remove('d-none');
            }
            document.getElementById('rolesContenedor').appendChild(card);
        });

        document.querySelectorAll('.rol-card-item').forEach(card => {
            card.addEventListener('keydown', event => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                seleccionarRolCard(card.dataset.rol);
            });
            card.addEventListener('dblclick', confirmarRolSeleccionado);
        });
    } catch (error) {
        console.error('Error al inicializar la selección de rol:', error);
        if (errorEl) {
            errorEl.textContent = error.message || 'No se pudo cargar la selección de roles.';
            errorEl.classList.remove('d-none');
        }
        document.querySelectorAll('.rol-card-item').forEach(card => card.classList.add('d-none'));
        const continuar = document.getElementById('btnContinuarRol');
        if (continuar) continuar.disabled = true;
    }
}

function seleccionarRolCard(rol) {
    const rolesDisponibles = sesionActual?.roles || [];
    if (!rolesDisponibles.includes(rol)) return;

    rolSeleccionado = rol;
    document.querySelectorAll('.rol-card-item').forEach(card => {
        const seleccionado = card.dataset.rol === rol;
        card.classList.toggle('selected', seleccionado);
        card.setAttribute('aria-pressed', seleccionado ? 'true' : 'false');
    });

    const btnContinuar = document.getElementById('btnContinuarRol');
    if (btnContinuar) btnContinuar.disabled = false;
}

function confirmarRolSeleccionado() {
    if (!rolSeleccionado || !sesionActual?.roles.includes(rolSeleccionado)) return;

    sesionActual.rol = rolSeleccionado;
    guardarSesion(sesionActual);

    const btn = document.getElementById('btnContinuarRol');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Ingresando...';
    }

    const destinos = {
        cliente: `/cliente/${sesionActual.id}`,
        administrador: `/administrador/${sesionActual.id}`,
        gerente: `/gerente/${sesionActual.id}`
    };
    window.location.href = destinos[rolSeleccionado];
}
