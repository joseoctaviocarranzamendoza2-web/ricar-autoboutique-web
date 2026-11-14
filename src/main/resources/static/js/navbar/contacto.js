// Textarea del formulario de contacto: Limita a 400 caracteres y actualiza el contador visual
document.getElementById('cMensaje')?.addEventListener('input', function () {
    const max = 400;
    if (this.value.length > max) this.value = this.value.slice(0, max);
    document.getElementById('cContador').textContent = `${this.value.length} / ${max} caracteres`;
});

// Input de teléfono: Permite solo dígitos y limita a 9 caracteres
document.getElementById('cTelefono')?.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 9);
});

// Helper para extraer el nombre completo formateado de la sesión
function obtenerNombreCompletoUsuario(sesion) {
    if (!sesion) return '';
    const partes = [sesion.nombres, sesion.apellidos].filter(Boolean).join(' ').trim();
    return partes || sesion.nombre || '';
}

// Inicializa el custom select para el campo Asunto en el formulario de contacto
function iniciarSelectAsuntoContacto() {
    const select = document.getElementById('cAsunto');
    if (!select || select.dataset.customInit === 'true') return;
    select.dataset.customInit = 'true';

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    select.classList.add('custom-select-native');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'custom-select-trigger';
    trigger.innerHTML = `
        <span class="custom-select-label">${select.options[select.selectedIndex]?.text || 'Seleccionar motivo...'}</span>
        <i class="bi bi-chevron-down custom-select-arrow"></i>
    `;
    wrapper.appendChild(trigger);

    const menu = document.createElement('div');
    menu.className = 'custom-select-menu';

    Array.from(select.options).forEach((opt, idx) => {
        if (idx === 0 && !opt.value) return; // Omite el placeholder como opción seleccionable
        const optDiv = document.createElement('div');
        optDiv.className = `custom-select-option${opt.selected ? ' selected' : ''}`;
        optDiv.textContent = opt.text;
        optDiv.dataset.value = opt.value;
        optDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            select.value = opt.value;
            trigger.querySelector('.custom-select-label').textContent = opt.text;
            menu.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
            optDiv.classList.add('selected');
            wrapper.classList.remove('open');
            select.dispatchEvent(new Event('change', { bubbles: true }));
        });
        menu.appendChild(optDiv);
    });

    wrapper.appendChild(menu);

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const estaAbierto = wrapper.classList.contains('open');
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
        if (!estaAbierto) wrapper.classList.add('open');
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            wrapper.classList.remove('open');
        }
    });

    select._customReset = () => {
        select.value = '';
        trigger.querySelector('.custom-select-label').textContent = select.options[0]?.text || 'Seleccionar motivo...';
        menu.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
    };
}

// Autocompleta automáticamente los campos de nombre, teléfono y correo si el usuario ha iniciado sesión
async function autocompletarDatosContacto() {
    let sesion = (typeof obtenerSesion === 'function') ? obtenerSesion() : null;

    // Si aún no está en sessionStorage pero la URL tiene id de usuario (ej. /contacto/administrador/2)
    if (!sesion) {
        const matchUrl = window.location.pathname.match(/\/contacto\/(?:administrador|cliente|gerente)\/(\d+)/);
        if (matchUrl && matchUrl[1]) {
            try {
                const res = await fetch(`/api/usuarios/${matchUrl[1]}`);
                if (res.ok) {
                    const usuario = await res.json();
                    if (usuario && (usuario.nombres || usuario.nombre)) {
                        if (typeof guardarSesion === 'function') {
                            guardarSesion(usuario);
                        }
                        sesion = usuario;
                    }
                }
            } catch (e) {
                console.warn('No se pudo autocompletar desde endpoint de usuario:', e);
            }
        }
    }

    if (sesion) {
        const cNombre = document.getElementById('cNombre');
        const cTelefono = document.getElementById('cTelefono');
        const cEmail = document.getElementById('cEmail');

        const nombre = obtenerNombreCompletoUsuario(sesion);
        if (cNombre && !cNombre.value && nombre) {
            cNombre.value = nombre;
        }
        if (cTelefono && !cTelefono.value && sesion.telefono) {
            cTelefono.value = sesion.telefono;
        }
        if (cEmail && !cEmail.value && sesion.email) {
            cEmail.value = sesion.email;
        }

        // Configura el botón de ver mis mensajes en el modal de confirmación
        const btnVerMensajes = document.getElementById('btnIrAPerfilMensajes');
        if (btnVerMensajes) {
            btnVerMensajes.href = `/panel/cliente/${sesion.id}/mensajes`;
        }
    }
}

// Botón enviar contacto: valida sesión requerida y campos, envía al backend y abre modal de confirmación
document.getElementById('btnContacto')?.addEventListener('click', async function () {
    const sesion = (typeof obtenerSesion === 'function') ? obtenerSesion() : null;
    if (!sesion) {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.classList.remove('d-none', 'alert-danger');
            loginError.innerHTML = '<i class="bi bi-info-circle me-2"></i>Inicia sesión para enviar tu mensaje.';
            loginError.classList.add('alert-info');
        }
        if (typeof abrirModal === 'function') {
            abrirModal('modalLogin');
        }
        return;
    }

    let valido = true;
    const campos = [
        { id: 'cNombre', msg: 'Ingresa tu nombre', test: v => v.trim().length >= 2 },
        { id: 'cTelefono', msg: 'El teléfono debe empezar con 9 y tener 9 dígitos', test: v => /^9[0-9]{8}$/.test(v.trim()) },
        { id: 'cAsunto', msg: 'Selecciona un asunto', test: v => v.trim() !== '' },
        { id: 'cMensaje', msg: 'Escribe tu mensaje', test: v => v.trim().length >= 1 }
    ];

    // Validación de campos con feedback visual en cada input
    campos.forEach(({ id, msg, test }) => {
        const el = document.getElementById(id);
        if (!el) return;
        const parent = el.closest('.col-sm-6, .col-12');
        const fb = parent ? parent.querySelector('.invalid-feedback') : null;
        const trigger = el._customRefs?.trigger || parent?.querySelector('.custom-select-trigger');
        const pasa = test(el.value);
        if (!pasa) {
            el.classList.add('is-invalid');
            el.classList.remove('is-valid');
            if (trigger) trigger.classList.add('is-invalid');
            if (fb) fb.textContent = msg;
            valido = false;
        } else {
            el.classList.remove('is-invalid');
            el.classList.add('is-valid');
            if (trigger) trigger.classList.remove('is-invalid');
            if (fb) fb.textContent = '';
        }
    });

    if (!valido) return;

    this.disabled = true;
    const textoOriginal = this.innerHTML;
    this.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';

    try {
        const payload = {
            usuarioId: String(sesion.id),
            nombreCompleto: document.getElementById('cNombre')?.value.trim(),
            telefono: document.getElementById('cTelefono')?.value.trim(),
            email: document.getElementById('cEmail')?.value.trim(),
            asunto: document.getElementById('cAsunto')?.value.trim(),
            mensaje: document.getElementById('cMensaje')?.value.trim()
        };

        const resp = await fetch('/api/mensajes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            throw new Error(errData.error || 'No se pudo enviar el mensaje.');
        }

        // Limpiar solo los campos de asunto y mensaje
        const selectAsunto = document.getElementById('cAsunto');
        if (selectAsunto && typeof selectAsunto._customReset === 'function') {
            selectAsunto._customReset();
        } else if (selectAsunto) {
            selectAsunto.value = '';
        }

        const inputMensaje = document.getElementById('cMensaje');
        if (inputMensaje) {
            inputMensaje.value = '';
            inputMensaje.classList.remove('is-valid', 'is-invalid');
        }
        document.getElementById('cContador').textContent = '0 / 400 caracteres';

        // Muestra el modal de confirmación
        const modalEl = document.getElementById('modalConfirmacionContacto');
        if (modalEl) {
            const btnVerMensajes = document.getElementById('btnIrAPerfilMensajes');
            if (btnVerMensajes) {
                btnVerMensajes.href = `/panel/cliente/${sesion.id}/mensajes`;
            }
            const modalInst = bootstrap.Modal.getOrCreateInstance(modalEl);
            modalInst.show();
        } else {
            alert('¡Mensaje enviado con éxito! Tu consulta ha sido registrada.');
        }

    } catch (err) {
        console.error('Error al enviar mensaje:', err);
        alert(err.message || 'Ocurrió un error al enviar el mensaje. Intenta de nuevo.');
    } finally {
        this.disabled = false;
        this.innerHTML = textoOriginal;
        autocompletarDatosContacto();
    }
});

// Inicialización de select custom y autocompletado al cargar y al cerrar login
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        iniciarSelectAsuntoContacto();
        autocompletarDatosContacto();
    });
} else {
    iniciarSelectAsuntoContacto();
    autocompletarDatosContacto();
}
document.getElementById('modalLogin')?.addEventListener('hidden.bs.modal', autocompletarDatosContacto);
window.addEventListener('storage', autocompletarDatosContacto);
