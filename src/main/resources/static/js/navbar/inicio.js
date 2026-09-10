// Devuelve el nombre completo del usuario en sesión (o null si no hay sesión)
function obtenerUsuarioLogueado() {
    const sesion = obtenerSesion();
    if (!sesion) return null;
    const nombres = sesion.nombres || sesion.nombre || '';
    const apellidos = sesion.apellidos || sesion.apellido || '';
    return (nombres + ' ' + apellidos).trim() || null;
}

// Solicita comentario existente por id de usuario desde la API
async function obtenerComentarioPorUsuario(idUsuario) {
    try {
        const resp = await fetch(`/api/comentarios/usuario/${idUsuario}`);
        if (!resp.ok) return null;
        return await resp.json();
    } catch (err) {
        console.error('Error obteniendo comentario de usuario:', err);
        return null;
    }
}

// Obtiene todos los comentarios disponibles en la BD
async function obtenerComentariosBD() {
    try {
        const resp = await fetch('/api/comentarios');
        if (!resp.ok) return [];
        return await resp.json();
    } catch (err) {
        console.error('Error obteniendo comentarios:', err);
        return [];
    }
}

// Crea el DOM de una tarjeta de testimonio a partir del objeto comentario
function crearTarjetaComentario(comentario) {
    const usuario = comentario.usuario;
    const iniciales = `${usuario.nombres?.charAt(0) || ''}${usuario.apellidos?.charAt(0) || ''}`.toUpperCase();
    const estrellasSVG = Array.from({ length: 5 }, (_, i) => i < comentario.estrellas ? '<i class="bi bi-star-fill"></i>' : '<i class="bi bi-star"></i>').join('');
    const col = document.createElement('div');
    col.className = 'col-md-4';
    col.id = `comentario-usuario-${comentario.usuario.id}`;
    col.innerHTML = `
        <div class="card-testimonio h-100">
            <div class="estrellas mb-3" style="color: var(--celeste, #0d6efd);">${estrellasSVG}</div>
            <p>"${comentario.texto}"</p>
            <div class="testimonio-autor">
                <div class="testimonio-avatar">${iniciales}</div>
                <div>
                    <strong>${usuario.nombres} ${usuario.apellidos}</strong>
                    <span class="d-block text-muted" style="font-size:.78rem;">${comentario.vehiculo}</span>
                </div>
            </div>
        </div>`;
    return col;
}

// Añade al grid las tarjetas devueltas por la API si no existen ya
function renderizarComentariosBD(comentarios) {
    const grid = document.getElementById('gridTestimonios');
    if (!grid || !comentarios?.length) return;
    comentarios.forEach(comentario => {
        if (!document.getElementById(`comentario-usuario-${comentario.usuario.id}`)) {
            grid.appendChild(crearTarjetaComentario(comentario));
        }
    });
}

// Estado y handlers para selección de estrellas en el modal de comentario
let estrellaSeleccionada = 0;
document.querySelectorAll('.star-sel').forEach(star => {
    star.addEventListener('mouseover', function () {
        resaltarEstrellas(+this.dataset.val);
    });
    star.addEventListener('mouseout', function () {
        resaltarEstrellas(estrellaSeleccionada);
    });
    star.addEventListener('click', function () {
        estrellaSeleccionada = +this.dataset.val;
        resaltarEstrellas(estrellaSeleccionada);
        document.getElementById('starError').classList.add('d-none');
    });
});

// Pinta las estrellas según el valor pasado
function resaltarEstrellas(n) {
    document.querySelectorAll('.star-sel').forEach(s => {
        const v = +s.dataset.val;
        s.classList.toggle('bi-star-fill', v <= n);
        s.classList.toggle('bi-star', v > n);
        s.style.color = v <= n ? 'var(--celeste, #0d6efd)' : '#ccc';
    });
}

// Contador del textarea del comentario
document.getElementById('comTexto')?.addEventListener('input', function () {
    document.getElementById('comContador').textContent = this.value.length + ' / 300';
});

// Abre el modal de comentario: valida sesión, carga comentario existente y prepara UI
document.getElementById('btnAbrirComentario')?.addEventListener('click', async function () {
    const sesion = obtenerSesion();
    const usuario = obtenerUsuarioLogueado();
    if (!usuario) {
        abrirModal('modalLogin');
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.classList.remove('d-none', 'alert-danger');
            loginError.innerHTML = '<i class="bi bi-info-circle me-2"></i>Inicia sesión para dejar tu comentario.';
            loginError.classList.add('alert-info');
        }
        return;
    }
    if (sesion.rol !== 'cliente') {
        mostrarModalNoPermitidoComentario();
        return;
    }
    const guardado = await obtenerComentarioPorUsuario(sesion.id);
    if (guardado) {
        estrellaSeleccionada = guardado.estrellas;
        resaltarEstrellas(estrellaSeleccionada);
        document.getElementById('comVehiculo').value = guardado.vehiculo;
        document.getElementById('comTexto').value = guardado.texto;
        document.getElementById('comContador').textContent = guardado.texto.length + ' / 300';
        document.getElementById('tituloModalComentario').innerHTML = '<i class="bi bi-pencil-square me-2"></i>Editar mi comentario';
        document.getElementById('btnEnviarComentario').innerHTML = '<i class="bi bi-check2-circle me-2"></i>Actualizar comentario';
        document.getElementById('btnEliminarComentario')?.classList.remove('d-none');
    } else {
        resetModalComentario();
        document.getElementById('tituloModalComentario').innerHTML = '<i class="bi bi-chat-left-text me-2"></i>Dejar mi comentario';
        document.getElementById('btnEnviarComentario').innerHTML = '<i class="bi bi-send me-2"></i>Publicar comentario';
        document.getElementById('btnEliminarComentario')?.classList.add('d-none');
    }
    abrirModal('modalComentario');
});

// Muestra modal informativo cuando el rol no permite comentar
function mostrarModalNoPermitidoComentario() {
    let modal = document.getElementById('modalNoPermitidoComentario');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
        <div class="modal fade" id="modalNoPermitidoComentario" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-sm">
                <div class="modal-content">
                    <div class="modal-header justify-content-center" style="background:var(--azul-oscuro,#0d1b2a);">
                        <h6 class="modal-title text-white fw-bold"><i class="bi bi-shield-exclamation me-2"></i>Acción no disponible</h6>
                    </div>
                    <div class="modal-body text-center py-4">
                        <div style="font-size:3rem; color:var(--celeste,#56aee8);"><i class="bi bi-chat-square-x"></i></div>
                        <p class="mt-3 mb-1 fw-semibold">No puedes comentar.</p>
                        <p class="text-muted small mb-0">Solo los clientes pueden dejar comentarios sobre nuestros servicios.</p>
                    </div>
                    <div class="modal-footer border-0 justify-content-center">
                        <button type="button" class="btn btn-primary px-4" data-bs-dismiss="modal">Entendido</button>
                    </div>
                </div>
            </div>
        </div>`);
        modal = document.getElementById('modalNoPermitidoComentario');
    }
    abrirModal('modalNoPermitidoComentario');
}

// Restaura el modal de comentario a estado inicial
function resetModalComentario() {
    estrellaSeleccionada = 0;
    resaltarEstrellas(0);
    document.getElementById('comVehiculo').value = '';
    document.getElementById('comTexto').value = '';
    document.getElementById('comContador').textContent = '0 / 300';
    document.getElementById('comVehiculo').classList.remove('is-invalid');
    document.getElementById('comTexto').classList.remove('is-invalid');
    document.getElementById('starError').classList.add('d-none');
    document.getElementById('comTextoError').style.visibility = 'hidden';
}

// Handler para enviar/actualizar comentario: valida campos, llama a la API y actualiza UI
document.getElementById('btnEnviarComentario')?.addEventListener('click', async function () {
    const sesion = obtenerSesion();
    const usuario = obtenerUsuarioLogueado();
    if (!usuario || !sesion) return;
    const vehiculo = document.getElementById('comVehiculo').value.trim();
    const texto = document.getElementById('comTexto').value.trim();
    let valido = true;
    if (estrellaSeleccionada === 0) {
        document.getElementById('starError').classList.remove('d-none');
        valido = false;
    }
    const inpVeh = document.getElementById('comVehiculo');
    if (vehiculo.length < 3) {
        inpVeh.classList.add('is-invalid');
        valido = false;
    } else {
        inpVeh.classList.remove('is-invalid');
    }
    const inpTxt = document.getElementById('comTexto');
    const txtErr = document.getElementById('comTextoError');
    if (texto.length < 20) {
        inpTxt.classList.add('is-invalid');
        txtErr.style.visibility = 'visible';
        valido = false;
    } else {
        inpTxt.classList.remove('is-invalid');
        txtErr.style.visibility = 'hidden';
    }
    if (!valido) return;
    const comentarioData = { texto, vehiculo, estrellas: estrellaSeleccionada };
    const existente = await obtenerComentarioPorUsuario(sesion.id);
    const url = existente ? `/api/comentarios/usuario/${sesion.id}` : '/api/comentarios';
    const method = existente ? 'PUT' : 'POST';
    const resp = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(comentarioData) });
    if (!resp.ok) {
        const error = await resp.json().catch(() => ({}));
        mostrarToastExito(error.error || 'No se pudo guardar el comentario.');
        return;
    }
    const comentarioGuardado = await resp.json();
    actualizarTarjetaComentario(comentarioGuardado, usuario, sesion.id);
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalComentario')).hide();
    document.getElementById('btnEliminarComentario')?.classList.remove('d-none');
    mostrarToastExito(existente ? 'Tu comentario fue actualizado.' : `¡Gracias, ${usuario.split(' ')[0]}! Tu comentario fue publicado.`);
});

// Crea o actualiza la tarjeta visible del comentario publicado por el usuario
function actualizarTarjetaComentario(comentario, usuarioNombre, usuarioId) {
    const iniciales = usuarioNombre.split(' ').slice(0, 2).map(p => p[0].toUpperCase()).join('');
    const estrellasSVG = Array.from({ length: 5 }, (_, i) => i < comentario.estrellas ? '<i class="bi bi-star-fill"></i>' : '<i class="bi bi-star"></i>').join('');
    const idTarjeta = `comentario-usuario-${usuarioId}`;
    let tarjeta = document.getElementById(idTarjeta);
    if (!tarjeta) {
        const col = document.createElement('div');
        col.className = 'col-md-4';
        col.id = idTarjeta;
        document.getElementById('gridTestimonios').appendChild(col);
        tarjeta = col;
    }
    tarjeta.innerHTML = `
        <div class="card-testimonio h-100">
            <div class="estrellas mb-3" style="color: var(--celeste, #0d6efd);">${estrellasSVG}</div>
            <p>"${comentario.texto}"</p>
            <div class="testimonio-autor">
                <div class="testimonio-avatar">${iniciales}</div>
                <div>
                    <strong>${usuarioNombre}</strong>
                    <span class="d-block text-muted" style="font-size:.78rem;">${comentario.vehiculo}</span>
                </div>
            </div>
        </div>`;
}

// Elimina la tarjeta del DOM para un usuario concreto
function eliminarTarjetaComentario(usuarioId) {
    const tarjeta = document.getElementById(`comentario-usuario-${usuarioId}`);
    if (tarjeta) {
        tarjeta.remove();
    }
}

// Elimina comentario vía API y actualiza UI
async function eliminarComentario() {
    const sesion = obtenerSesion();
    if (!sesion) return;
    const resp = await fetch(`/api/comentarios/usuario/${sesion.id}`, { method: 'DELETE' });
    if (!resp.ok) {
        const error = await resp.json().catch(() => ({}));
        mostrarToastExito(error.error || 'No se pudo eliminar el comentario.');
        return;
    }
    eliminarTarjetaComentario(sesion.id);
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalComentario')).hide();
    resetModalComentario();
    document.getElementById('btnEliminarComentario')?.classList.add('d-none');
    mostrarToastExito('Tu comentario fue eliminado.');
}

// Muestra un toast genérico de éxito/feedback
function mostrarToastExito(mensaje) {
    let contenedor = document.getElementById('toastContenedor');
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'toastContenedor';
        contenedor.className = 'position-fixed bottom-0 end-0 p-3';
        contenedor.style.zIndex = '9999';
        document.body.appendChild(contenedor);
    }
    const id = 'toast_' + Date.now();
    contenedor.innerHTML = `
        <div id="${id}" class="toast align-items-center text-bg-primary border-0" role="alert" aria-live="assertive">
            <div class="d-flex">
                <div class="toast-body"><i class="bi bi-check-circle me-2"></i>${mensaje}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>`;
    const toastEl = document.getElementById(id);
    new bootstrap.Toast(toastEl, { delay: 4000 }).show();
}

// Carga inicial: Obtiene comentarios y actualiza tarjeta del usuario si existe
document.addEventListener('DOMContentLoaded', async () => {
    const comentarios = await obtenerComentariosBD();
    renderizarComentariosBD(comentarios);
    const sesion = obtenerSesion();
    if (sesion && sesion.rol === 'cliente') {
        const guardado = await obtenerComentarioPorUsuario(sesion.id);
        if (guardado) {
            const usuario = obtenerUsuarioLogueado();
            actualizarTarjetaComentario(guardado, usuario, sesion.id);
        }
    }
    document.getElementById('btnEliminarComentario')?.addEventListener('click', async function () {
        await eliminarComentario();
    });
});

// Listeners adicionales para navegación con parámetros desde banners y cards
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.btn-link-servicio').forEach(a => {
        a.addEventListener('click', function (e) {
            e.preventDefault();
            navegarConParametro('/servicios');
        });
    });
    document.querySelectorAll('.card-servicio-cta a').forEach(a => {
        a.addEventListener('click', function (e) {
            e.preventDefault();
            navegarConParametro('/contacto');
        });
    });
    document.querySelectorAll('.card-producto .btn').forEach(a => {
        a.addEventListener('click', function (e) {
            e.preventDefault();
            navegarConParametro('/productos');
        });
    });
    const verTodos = document.querySelector('.seccion-productos .text-center a.btn-primary');
    if (verTodos) {
        verTodos.addEventListener('click', function (e) {
            e.preventDefault();
            navegarConParametro('/productos');
        });
    }
    document.querySelectorAll('#carrusel-principal a').forEach(a => {
        try {
            const href = a.getAttribute('href') || '';
            if (href.includes('/productos')) {
                a.addEventListener('click', function (e) {
                    e.preventDefault();
                    navegarConParametro('/productos');
                });
            }
        } catch (err) { /* ignore */ }
    });
    document.querySelectorAll('a').forEach(a => {
        try {
            const href = a.getAttribute('href') || a.getAttribute('th:href') || '';
            if (href.includes('/nosotros')) {
                a.addEventListener('click', function (e) {
                    e.preventDefault();
                    navegarConParametro('/nosotros');
                });
            }
        } catch (err) { /* ignore */ }
    });
});
