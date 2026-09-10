// Clave usada en sessionStorage para guardar la sesión del usuario
const SESION_KEY = 'mecatools_sesion';

// Recupera el objeto de sesión desde sessionStorage o null si no existe
function obtenerSesion() {
    const data = sessionStorage.getItem(SESION_KEY);
    return data ? JSON.parse(data) : null;
}

// Guarda el usuario en sessionStorage para mantener sesión en el cliente
function guardarSesion(usuario) {
    sessionStorage.setItem(SESION_KEY, JSON.stringify(usuario));
}

// Elimina la sesión del cliente y redirige al inicio
function cerrarSesion() {
    sessionStorage.removeItem(SESION_KEY);
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

// Redirige al panel de administración del usuario en sesión
function irAAdministracion() {
    const sesion = obtenerSesion();
    window.location.href = `/administrador/${sesion.id}`;
}

// Redirige al panel de gerente del usuario en sesión
function irAGestion() {
    const sesion = obtenerSesion();
    window.location.href = `/gerente/${sesion.id}`;
}

// Navega a una URL añadiendo el rol y id de la sesión si existe - Útil para rutas que necesitan contexto
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
    if (sesion.rol === 'cliente') {
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
            <div class="modal-dialog modal-dialog-centered modal-sm">
                <div class="modal-content">
                    <div class="modal-header justify-content-center" style="background:var(--azul-oscuro,#0d1b2a);">
                        <h6 class="modal-title text-white fw-bold">
                            <i class="bi bi-shield-exclamation me-2"></i>Acción no disponible
                        </h6>
                    </div>
                    <div class="modal-body text-center py-4">
                        <div style="font-size:3rem; color:var(--celeste,#56aee8);">
                            <i class="bi bi-calendar-x"></i>
                        </div>
                        <p class="mt-3 mb-1 fw-semibold">Esta acción es solo para clientes.</p>
                        <p class="text-muted small mb-0">
                            Tu cuenta de <strong id="rolNoPermitido"></strong> no puede agendar citas ni realizar compras. Por favor ingresa con una cuenta de cliente.
                        </p>
                    </div>
                    <div class="modal-footer border-0 justify-content-center">
                        <button type="button" class="btn btn-primary px-4" data-bs-dismiss="modal">Entendido</button>
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

// Abre un modal de Bootstrap por id
function abrirModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const instancia = bootstrap.Modal.getOrCreateInstance(el);
    instancia.show();
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

// Contraseñas de verificación simples para cuentas empresariales (solo UI, no seguras)
const PASS_EMPRESARIAL = { administrador: '123456789', gerente: '987654321' };

// Prepara y muestra el modal para confirmar creación de cuentas empresariales
function abrirModalEmpresarial(rol) {
    const texto = document.getElementById('rolEmpresarialTexto');
    const input = document.getElementById('passEmpresarial');
    const err = document.getElementById('empresarialError');
    if (texto) texto.textContent = rol === 'administrador' ? 'Administrador' : 'Gerente';
    if (input) {
        input.value = '';
        input.classList.remove('is-invalid');
    }
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
    const passIngresada = input?.value || '';
    const passCorrecta = PASS_EMPRESARIAL[rolPendienteVerificacion];
    if (passIngresada !== passCorrecta) {
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
    const exito = await ejecutarRegistro(rolPendienteVerificacion);
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
    actualizarNavbar();
    document.addEventListener('hidden.bs.modal', limpiarBackdropsSobrantes);
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
    document.getElementById('btnLogin')?.addEventListener('click', manejarLogin);
    document.getElementById('btnRegister')?.addEventListener('click', manejarRegister);
    document.getElementById('btnConfirmarEmpresarial')?.addEventListener('click', confirmarEmpresarial);
});

// Maneja el proceso de inicio de sesión: Validaciones, llamada al endpoint y manejo de UI
async function manejarLogin() {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const divExito = document.getElementById('loginExito');
    const divError = document.getElementById('loginError');
    const btnLogin = document.getElementById('btnLogin');
    divExito?.classList.add('d-none');
    divError?.classList.add('d-none');
    if (!validarEmail(emailInput) || !validarRequerido(passwordInput, 'La contraseña es obligatoria')) return;
    btnLogin.disabled = true;
    btnLogin.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Ingresando...';
    try {
        const formData = new URLSearchParams();
        formData.append('email', emailInput.value.trim());
        formData.append('password', passwordInput.value);
        const resp = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData });
        if (!resp.ok) {
            marcarInvalido(emailInput, 'Correo o contraseña incorrectos');
            marcarInvalido(passwordInput, 'Correo o contraseña incorrectos');
            divError?.classList.remove('d-none');
            return;
        }
        const usuario = await resp.json();
        guardarSesion(usuario);
        divExito?.classList.remove('d-none');
        const destino = { administrador: `/administrador/${usuario.id}`, gerente: `/gerente/${usuario.id}`, cliente: `/cliente/${usuario.id}` }[usuario.rol] || '/inicio';
        setTimeout(() => {
            bootstrap.Modal.getInstance(document.getElementById('modalLogin'))?.hide();
            window.location.href = destino;
        }, 1200);
    } catch (err) {
        console.error('Error de conexión:', err);
        divError.innerHTML = '<i class="bi bi-wifi-off me-2"></i>Error de conexión. Intenta de nuevo.';
        divError?.classList.remove('d-none');
    } finally {
        btnLogin.disabled = false;
        btnLogin.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Ingresar';
    }
}

// Maneja el registro de usuarios: Valida campos y dispara el registro (incluye flujo empresarial)
async function manejarRegister() {
    const campos = { nombres: document.getElementById('regNombres'), apellidos: document.getElementById('regApellidos'), email: document.getElementById('regEmail'), tel: document.getElementById('regTel'), password: document.getElementById('regPassword'), confirm: document.getElementById('regConfirm'), checkbox: document.getElementById('aceptaTerminos') };
    const rolSeleccionado = document.getElementById('regRol')?.value || 'cliente';
    const divExito = document.getElementById('registerExito');
    const divError = document.getElementById('registerError');
    divExito?.classList.add('d-none');
    divError?.classList.add('d-none');
    const valido = validarTexto(campos.nombres, 'El nombre es obligatorio') & validarTexto(campos.apellidos, 'El apellido es obligatorio') & validarEmail(campos.email) & validarTel(campos.tel) & validarPassword(campos.password) & validarConfirm(campos.password, campos.confirm) & validarCheckbox(campos.checkbox);
    if (!valido) return;
    if (rolSeleccionado !== 'cliente') {
        rolPendienteVerificacion = rolSeleccionado;
        abrirModalEmpresarial(rolSeleccionado);
        return;
    }
    const exito = await ejecutarRegistro(rolSeleccionado);
    if (exito) {
        setTimeout(() => {
            bootstrap.Modal.getInstance(document.getElementById('modalRegister'))?.hide();
        }, 2000);
    }
}

// Realiza la llamada al endpoint de registro y actualiza la UI según el resultado
async function ejecutarRegistro(rol) {
    const btnReg = document.getElementById('btnRegister');
    const divExito = document.getElementById('registerExito');
    const divError = document.getElementById('registerError');
    const msgError = document.getElementById('registerErrorMsg');
    if (btnReg) {
        btnReg.disabled = true;
        btnReg.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Registrando...';
    }
    try {
        const resp = await fetch('/api/usuarios/registro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombres: document.getElementById('regNombres')?.value.trim(), apellidos: document.getElementById('regApellidos')?.value.trim(), email: document.getElementById('regEmail')?.value.trim(), telefono: document.getElementById('regTel')?.value.trim(), password: document.getElementById('regPassword')?.value, rol: rol }) });
        if (resp.status === 409) {
            if (msgError) msgError.textContent = 'Este correo ya está registrado. Inicia sesión.';
            divError?.classList.remove('d-none');
            return false;
        }
        if (!resp.ok) throw new Error('Error del servidor');
        divExito?.classList.remove('d-none');
        limpiarCamposRegister();
        return true;
    } catch (err) {
        console.error('Error al registrar:', err);
        if (msgError) msgError.textContent = 'Error de conexión. Intenta de nuevo.';
        divError?.classList.remove('d-none');
        return false;
    } finally {
        if (btnReg) {
            btnReg.disabled = false;
            btnReg.innerHTML = '<i class="bi bi-person-check me-2"></i>Crear mi cuenta';
        }
    }
}

// Validaciones de formulario: Campos obligatorios
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
        marcarInvalido(campo, 'El correo es obligatorio');
        return false;
    }
    if (!/^[^\s@]+@gmail\.com$/.test(v)) {
        marcarInvalido(campo, 'Ingresa un correo válido con @gmail.com');
        return false;
    }
    marcarValido(campo);
    return true;
}

// Validación de teléfono que exige formato nacional (9 dígitos empezando en 9 y diferente de 987654321)
function validarTel(campo) {
    const v = campo.value.trim();
    if (!v) {
        marcarInvalido(campo, 'El teléfono es obligatorio');
        return false;
    }
    if (v === '987654321') {
        marcarInvalido(campo, 'No te creas payaso');
        return false;
    }
    if (!/^9[0-9]{8}$/.test(v)) {
        marcarInvalido(campo, 'El teléfono debe empezar con 9 y tener 9 dígitos');
        return false;
    }
    marcarValido(campo);
    return true;
}

// Validación de contraseña con reglas mínimas de complejidad
function validarPassword(campo) {
    const v = campo.value;
    if (!v) {
        marcarInvalido(campo, 'La contraseña es obligatoria');
        return false;
    }
    if (v.length < 8) {
        marcarInvalido(campo, 'Mínimo 8 caracteres');
        return false;
    }
    if (!/[A-Z]/.test(v)) {
        marcarInvalido(campo, 'Debe tener al menos una mayúscula');
        return false;
    }
    if (!/[0-9]/.test(v)) {
        marcarInvalido(campo, 'Debe tener al menos un número');
        return false;
    }
    marcarValido(campo);
    return true;
}

// Valida que la confirmación de contraseña coincida con la contraseña
function validarConfirm(pass, confirm) {
    if (!confirm.value) {
        marcarInvalido(confirm, 'Confirma tu contraseña');
        return false;
    }
    if (pass.value !== confirm.value) {
        marcarInvalido(confirm, 'Las contraseñas no coinciden');
        return false;
    }
    marcarValido(confirm);
    return true;
}

// Valida que el checkbox de aceptación de términos esté marcado
function validarCheckbox(checkbox) {
    const feedback = checkbox.closest('.form-check')?.querySelector('.invalid-feedback');
    if (!checkbox.checked) {
        checkbox.classList.add('is-invalid');
        if (feedback) feedback.textContent = 'Debes aceptar los términos y condiciones';
        checkbox.addEventListener('change', () => {
            checkbox.classList.remove('is-invalid');
            if (feedback) feedback.textContent = '';
        }, { once: true });
        return false;
    }
    checkbox.classList.remove('is-invalid');
    return true;
}

// Aplica estilos y mensaje de validación para un campo inválido
function marcarInvalido(campo, mensaje) {
    campo.classList.add('is-invalid');
    campo.classList.remove('is-valid');
    const fb = campo.parentNode.querySelector('.invalid-feedback');
    if (fb) fb.textContent = mensaje;
}

// Aplica estilos de campo válido y limpia mensajes de error
function marcarValido(campo) {
    campo.classList.remove('is-invalid');
    campo.classList.add('is-valid');
    const fb = campo.parentNode.querySelector('.invalid-feedback');
    if (fb) fb.textContent = '';
}

// Limpia los campos y estados de un modal específico (inputs, feedback, checkboxes)
function limpiarModal(modalId) {
    document.querySelectorAll(`#${modalId} .form-control`).forEach(campo => {
        campo.classList.remove('is-invalid', 'is-valid');
        campo.value = '';
        const fb = campo.parentNode.querySelector('.invalid-feedback');
        if (fb) fb.textContent = '';
    });
    const checkbox = document.getElementById('aceptaTerminos');
    if (checkbox) {
        checkbox.checked = false;
        checkbox.classList.remove('is-invalid');
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
        }
    });
    const checkbox = document.getElementById('aceptaTerminos');
    if (checkbox) {
        checkbox.checked = false;
        checkbox.classList.remove('is-valid', 'is-invalid');
    }
}
