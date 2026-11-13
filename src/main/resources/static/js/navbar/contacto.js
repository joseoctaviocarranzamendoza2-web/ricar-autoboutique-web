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
    }
}

// Botón enviar contacto: valida sesión requerida y campos; muestra feedback y resetea solo el asunto y mensaje
document.getElementById('btnContacto')?.addEventListener('click', function () {
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

    // Validación de campos con feedback en cada input
    campos.forEach(({ id, msg, test }) => {
        const el = document.getElementById(id);
        if (!el) return;
        const fb = el.parentNode.querySelector('.invalid-feedback');
        const pasa = test(el.value);
        if (!pasa) {
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

    // Simulación de envío: mostrar alerta, deshabilitar botón y limpiar únicamente el mensaje y el asunto
    document.getElementById('alertaContacto')?.classList.remove('d-none');
    this.disabled = true;
    this.innerHTML = '<i class="bi bi-check2-circle me-2"></i>Enviado';
    setTimeout(() => {
        ['cAsunto', 'cMensaje'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.value = '';
                el.classList.remove('is-valid', 'is-invalid');
            }
        });
        document.getElementById('cContador').textContent = '0 / 400 caracteres';
        document.getElementById('alertaContacto')?.classList.add('d-none');
        this.disabled = false;
        this.innerHTML = '<i class="bi bi-send-fill me-2"></i>Enviar mensaje';
        autocompletarDatosContacto();
    }, 2500);
});

// Inicialización de autocompletado al cargar y al cerrar login
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autocompletarDatosContacto);
} else {
    autocompletarDatosContacto();
}
document.getElementById('modalLogin')?.addEventListener('hidden.bs.modal', autocompletarDatosContacto);
window.addEventListener('storage', autocompletarDatosContacto);
