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

// Botón enviar contacto: valida sesión, rol y campos; muestra feedback y resetea el formulario
document.getElementById('btnContacto')?.addEventListener('click', function () {
    const sesion = obtenerSesion();
    if (!sesion) {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.classList.remove('d-none', 'alert-danger');
            loginError.innerHTML = '<i class="bi bi-info-circle me-2"></i>Inicia sesión para enviar tu mensaje.';
            loginError.classList.add('alert-info');
        }
        abrirModal('modalLogin');
        return;
    }
    // Solo clientes pueden enviar mensajes desde la UI de contacto
    if (sesion.rol !== 'cliente') {
        mostrarModalNoPermitido();
        return;
    }
    let valido = true;
    const campos = [{ id: 'cNombre', msg: 'Ingresa tu nombre', test: v => v.trim().length >= 2 }, { id: 'cTelefono', msg: 'El teléfono debe empezar con 9 y tener 9 dígitos', test: v => /^9[0-9]{8}$/.test(v.trim()) }, { id: 'cAsunto', msg: 'Selecciona un asunto', test: v => v.trim() !== '' }, { id: 'cMensaje', msg: 'Escribe tu mensaje', test: v => v.trim().length >= 1 }];
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
    // Simulación de envío: mostrar alerta, deshabilitar botón y limpiar campos tras delay
    document.getElementById('alertaContacto').classList.remove('d-none');
    this.disabled = true;
    this.innerHTML = '<i class="bi bi-check2-circle me-2"></i>Enviado';
    setTimeout(() => {
        ['cNombre', 'cTelefono', 'cEmail', 'cAsunto', 'cMensaje'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.value = '';
                el.classList.remove('is-valid', 'is-invalid');
            }
        });
        document.getElementById('cContador').textContent = '0 / 400 caracteres';
        document.getElementById('alertaContacto').classList.add('d-none');
        this.disabled = false;
        this.innerHTML = '<i class="bi bi-send-fill me-2"></i>Enviar mensaje';
    }, 2500);
});
