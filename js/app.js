const $ = id => document.getElementById(id);

// ---------------------------------------------------------------------
// Campo de contraseña con ícono de mostrar/ocultar, reutilizable en los
// 4 formularios de login/registro (cliente y representante).
// ---------------------------------------------------------------------
const EYE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.6 18.6 0 0 1 5.06-5.94M9.9 4.24A10.4 10.4 0 0 1 12 5c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
function pwFieldHtml(id, autocomplete, placeholder){
  return `<div class="pw-field"><input type="password" id="${id}" autocomplete="${autocomplete}" placeholder="${placeholder}"><button type="button" class="pw-toggle" tabindex="-1" onclick="togglePasswordVisibility('${id}', this)">${EYE_ICON}</button></div>`;
}
function togglePasswordVisibility(inputId, btn){
  const input = $(inputId);
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  btn.innerHTML = showing ? EYE_ICON : EYE_OFF_ICON;
}
let state = { status:'sinRutNoQuiere', hasSupplier:'yes', path:'B', verif:'basic', selectedRepId:null, selectedProduct:null, mode:'AIR', paid:false, maxReached:0, loggedIn:false, accountEmail:null, accountId:null, quoteRequestDbId:null, lastQuote:null, preliminaryQuote:null, groupFreightOverride:null, compareMode:false, trmAtQuote:null, priceLocked:false, contactEmail:null, contactWhatsapp:null, requestId:null, notifications:[], repResponded:false, repRealQuote:null, repNote:null, rejected:false, rejectReason:null, rejectMsg:null, tlCurrentIndex:-1, tlNotes:{}, tlFiles:{}, repLoggedIn:false, repEmail:null, repRecordId:null, receipt:null, faqClientSeen:{}, faqRepSeen:{}, repVerifType:null, repVerifStatus:{}, supplierQuoteAttached:false, repAvailable:true, repMinOrder:0, clientRating:null, pendingStars:0, incotermKnowledge:'unknown', incoterm:'FOB' };

// ---------------------------------------------------------------------
// NOTIFICACIONES (registro tipo correo) + SOPORTE HUMANO
// ---------------------------------------------------------------------
function logNotification(to, subject, body){
  state.notifications.push({ to: to || 'tu correo', subject, body, time: new Date().toLocaleString('es-CO',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) });
  const badge = $('notifBadge');
  if(badge){ badge.style.display = 'flex'; badge.textContent = state.notifications.length; }
}
function toggleNotifPanel(){
  const panel = $('notifPanel');
  const open = panel.style.display === 'block';
  panel.style.display = open ? 'none' : 'block';
  if(!open) renderNotifList();
}
function renderNotifList(){
  const panel = $('notifPanel');
  if(state.notifications.length===0){
    panel.innerHTML = `<div class="hint" style="margin:0; padding:16px;">Aquí verás cada correo que te enviamos (solicitud enviada, cotización confirmada, pago, etc.) — todavía no hay ninguno.</div>`;
    return;
  }
  panel.innerHTML = `<div style="padding:12px 14px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:var(--ink-faint); border-bottom:1px solid var(--line);">Notificaciones enviadas</div>` +
    state.notifications.slice().reverse().map(n=>`
    <div style="padding:12px 14px; border-bottom:1px dashed var(--line);">
      <div style="font-size:12.5px; font-weight:700;">${n.subject}</div>
      <div class="hint" style="margin:3px 0;">${n.body}</div>
      <div style="font-size:10.5px; color:var(--ink-faint);">📧 ${n.to} · ${n.time}</div>
    </div>
  `).join('');
}
function openSupport(){
  let panel = document.getElementById('supportPanel');
  if(panel){ panel.style.display = panel.style.display==='block' ? 'none':'block'; return; }
  panel = document.createElement('div');
  panel.id = 'supportPanel';
  panel.style.cssText = 'position:fixed; bottom:78px; right:16px; width:250px; background:var(--ink); color:#fff; border-radius:16px; padding:16px; z-index:40; box-shadow:0 16px 34px rgba(0,0,0,.35);';
  panel.innerHTML = `
    <div style="font-weight:700; font-family:'Space Grotesk',sans-serif; margin-bottom:4px;">¿Necesitas ayuda?</div>
    <p style="font-size:12px; color:#B9BEC9; margin:0 0 12px; line-height:1.5;">Un asesor humano puede tomar tu caso en cualquier momento del proceso.</p>
    <a href="https://wa.me/573000000000" target="_blank" style="display:flex; align-items:center; gap:8px; color:var(--ink); background:var(--lime); font-size:13px; font-weight:700; padding:9px 12px; border-radius:8px; margin-bottom:8px; text-decoration:none;">💬 Escríbenos por WhatsApp</a>
    <a href="#" onclick="alert('Un asesor te llamará en el horario que elijas (demo).'); return false;" style="display:flex; align-items:center; gap:8px; color:#fff; background:rgba(255,255,255,.08); font-size:13px; font-weight:700; padding:9px 12px; border-radius:8px; text-decoration:none;">📞 Agendar llamada</a>
  `;
  document.body.appendChild(panel);
}

function enterApp(){
  $('landingScreen').style.display = 'none';
  $('appShell').style.display = 'block';
  updateAccountPillIfLogged();
  updateHistoryCardVisibility();
  window.scrollTo(0,0);
}
function backToLanding(){
  $('appShell').style.display = 'none';
  $('landingScreen').style.display = 'block';
  resetLandingView();
  window.scrollTo(0,0);
}
function resetLandingView(){
  $('marketingContent').style.display = 'block';
  $('clientLoginGate').style.display = 'none';
}
function updateAccountPillIfLogged(){
  const pill = $('accountPill');
  if(pill && state.loggedIn){
    pill.classList.add('logged');
    pill.innerHTML = `<span class="dot"></span>${state.accountEmail}`;
  }
}
function openClientPortalGate(mode){
  if(state.loggedIn){ enterApp(); return; }
  mode = mode || 'login';
  const isSignup = mode === 'signup';
  closeLoginDropdown();
  $('marketingContent').style.display = 'none';
  $('clientLoginGate').style.display = 'block';
  $('clientLoginGate').innerHTML = `
    <div class="wrap">
      <div class="auth-card" style="margin-top:6px;">
        <div class="lock-badge">🧑‍💼 Portal Cliente</div>
        <p style="font-size:12.5px; line-height:1.6; margin:0 0 14px;">
          Puedes explorar y cotizar sin cuenta. Inicia sesión si ya tienes una, regístrate, o entra como invitado — solo te pediremos crear cuenta cuando confirmes un pedido.
        </p>
        <form onsubmit="return false;" autocomplete="on">
        ${isSignup ? `
        <div class="form-section">
          <div class="form-section-title">Tus datos</div>
          <div class="grid">
            <div><label class="field-label">Nombre completo</label><input type="text" id="cl_gate_name" autocomplete="name" placeholder="Tu nombre"></div>
          </div>
        </div>` : ''}
        <div class="form-section">
          ${isSignup ? `<div class="form-section-title">Acceso</div>` : ''}
          <div class="grid">
            <div><label class="field-label">Correo electrónico</label><input type="email" id="cl_gate_email" autocomplete="email" placeholder="tucorreo@ejemplo.com"></div>
            <div><label class="field-label">Contraseña</label>${pwFieldHtml('cl_gate_pass', isSignup?'new-password':'current-password', 'Mínimo 8 caracteres')}</div>
          </div>
        </div>
        ${isSignup ? `
        <label style="display:flex; align-items:flex-start; gap:8px; margin-top:14px; font-size:12px; color:#D4D6DC; cursor:pointer;">
          <input type="checkbox" id="cl_gate_privacy" style="width:auto; margin-top:2px;">
          Acepto los <span style="text-decoration:underline; font-weight:600; color:var(--lime);" onclick="event.preventDefault(); openTermsPanel();">términos y condiciones</span> y la <span style="text-decoration:underline; font-weight:600; color:var(--lime);" onclick="event.preventDefault(); openPrivacyPanel();">política de tratamiento de datos personales</span>
        </label>` : ''}
        <div id="cl_gate_error" class="hint" style="color:#F0B4AE; display:none;"></div>
        <button type="submit" class="btn btn-primary btn-block" style="margin-top:14px;" onclick="clientGateSubmit('${mode}', this)">${isSignup ? 'Crear cuenta y entrar' : 'Iniciar sesión'}</button>
        </form>
        <div class="hint" style="text-align:center; margin-top:10px; color:#B9BEC9;">${isSignup ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'} <span style="color:var(--lime); font-weight:600; text-decoration:underline; cursor:pointer;" onclick="openClientPortalGate('${isSignup?'login':'signup'}')">${isSignup ? 'Inicia sesión' : 'Regístrate'}</span></div>
        <div class="hint" style="text-align:center; margin-top:6px;"><span style="text-decoration:underline; cursor:pointer; font-weight:600; color:var(--lime);" onclick="continueAsGuest()">Continuar como invitado →</span></div>
        <button class="btn btn-text btn-sm" style="margin-top:16px; display:block; margin-left:auto; margin-right:auto; color:#fff;" onclick="resetLandingView()">← Volver</button>
      </div>
    </div>
  `;
  window.scrollTo(0,0);
}
async function clientGateSubmit(mode, btn){
  const email = $('cl_gate_email').value.trim();
  const pass = $('cl_gate_pass').value.trim();
  const errBox = $('cl_gate_error');
  if(errBox) errBox.style.display = 'none';
  if(!email || !pass){ alert('Ingresa correo y contraseña.'); return; }
  if(mode === 'signup' && !$('cl_gate_privacy').checked){ alert('Debes aceptar la política de tratamiento de datos personales para crear tu cuenta.'); return; }
  if(!requireSupabase()) return;
  const originalLabel = btn ? btn.textContent : '';
  if(btn){ btn.disabled = true; btn.textContent = 'Un momento…'; }
  try{
    let session;
    if(mode === 'signup'){
      const name = $('cl_gate_name') ? $('cl_gate_name').value.trim() : '';
      session = await upgradeOrSignUp(email, pass, { role:'client', full_name:name, privacy_accepted_at: new Date().toISOString() });
      if(!session){
        $('clientLoginGate').innerHTML = `<div class="wrap"><div class="banner" style="margin-top:6px;">✓ Cuenta creada. Te enviamos un correo de confirmación a <b>${email}</b> — confírmalo y vuelve para iniciar sesión.</div></div>`;
        return;
      }
    } else {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
      if(error) throw error;
      session = data.session;
    }
    const profile = await ensureProfile(session);
    state.loggedIn = true;
    state.accountId = profile.id;
    state.accountEmail = profile.email;
    state.contactEmail = profile.email;
    enterApp();
    logNotification(email, mode==='signup' ? 'Bienvenido a Conecta Importa' : 'Iniciaste sesión', mode==='signup' ? 'Tu cuenta quedó creada.' : 'Volviste a entrar a tu cuenta.');
  } catch(err){
    if(errBox){ errBox.textContent = friendlyAuthError(err); errBox.style.display = 'block'; }
    else alert(friendlyAuthError(err));
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = originalLabel; }
  }
}
function continueAsGuest(){
  enterApp();
}
function goToRepPortal(){
  closeLoginDropdown();
  $('appShell').style.display = 'none';
  $('landingScreen').style.display = 'none';
  $('repShell').style.display = 'block';
  window.scrollTo(0,0);
  if(state.repLoggedIn){
    showRepPortalContent();
  } else {
    renderRepLoginGate();
  }
}

// ---------------------------------------------------------------------
// HEADER DE LANDING: dropdown de login + navegación en la misma página
// ---------------------------------------------------------------------
function toggleLoginDropdown(evt){
  if(evt) evt.stopPropagation();
  const menu = $('loginDropdownMenu');
  if(!menu) return;
  const open = menu.style.display === 'block';
  menu.style.display = open ? 'none' : 'block';
}
function closeLoginDropdown(){
  const menu = $('loginDropdownMenu');
  if(menu) menu.style.display = 'none';
}
document.addEventListener('click', (e)=>{
  const menu = $('loginDropdownMenu');
  if(!menu || menu.style.display !== 'block') return;
  if(!menu.parentElement.contains(e.target)) closeLoginDropdown();
});
function scrollToLandingSection(id){
  const el = $(id);
  if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
}
function openInfoModal(html, wide){
  let backdrop = document.getElementById('infoModalBackdrop');
  if(backdrop) backdrop.remove();
  backdrop = document.createElement('div');
  backdrop.id = 'infoModalBackdrop';
  backdrop.className = 'info-modal-backdrop';
  backdrop.onclick = (e)=>{ if(e.target === backdrop) backdrop.remove(); };
  backdrop.innerHTML = `<div class="info-modal${wide?' wide':''}">${html}</div>`;
  document.body.appendChild(backdrop);
}
function closeInfoModal(){
  const backdrop = document.getElementById('infoModalBackdrop');
  if(backdrop) backdrop.remove();
}
function openAboutPanel(){
  openInfoModal(`
    <h3>Quiénes somos</h3>
    <p>Conecta Importa nace para ayudarte a importar sin perderte en el camino, conectándote con representantes verificados en Colombia — agencias de aduanas, agentes de sourcing, agentes de carga y trading companies.</p>
    <p>Estamos en una etapa temprana: estamos construyendo la plataforma junto a nuestros primeros representantes y clientes, y siendo honestos sobre lo que todavía es nuevo (como las cifras de esta página, que hoy son metas, no datos verificados).</p>
    <button class="btn btn-outline btn-block" onclick="closeInfoModal()">Cerrar</button>
  `);
}
function openPricingPanel(){
  const tiersHtml = PLATFORM_FEE_TIERS.map((t,i)=>{
    const prev = i===0 ? 0 : PLATFORM_FEE_TIERS[i-1].maxFob;
    const range = t.maxFob === Infinity ? `Más de ${fmtUsd(prev)}` : `${fmtUsd(prev)} – ${fmtUsd(t.maxFob)}`;
    return `<div class="line-item"><span class="lbl">FOB ${range}</span><span class="val">${fmtUsd(t.fee)}</span></div>`;
  }).join('');
  openInfoModal(`
    <h3>Precios</h3>
    <p>Cotizar y responder solicitudes nunca tiene costo — ni para clientes ni para representantes.</p>
    <p>Cuando aceptas una cotización confirmada, Conecta Importa cobra un fee de activación por tramos de valor FOB, aparte de la comisión de tu representante (que siempre ves con transparencia antes de aceptar):</p>
    ${tiersHtml}
    <p style="margin-top:10px;">Estos montos son de ejemplo — se van a ajustar cuando haya datos reales de representantes y de las primeras transacciones.</p>
    <button class="btn btn-outline btn-block" onclick="closeInfoModal()">Cerrar</button>
  `);
}
function openPrivacyPanel(){
  openInfoModal(`
    <h3>Política de tratamiento de datos personales</h3>
    <p>Conecta Importa recolecta y trata datos personales conforme a la <b>Ley 1581 de 2012</b> y sus decretos reglamentarios (régimen general de protección de datos personales en Colombia). Esta es una versión inicial simple del aviso — antes de operar con usuarios reales a mayor escala, este texto debe pasar por revisión legal formal.</p>
    <h4>¿Qué datos recolectamos?</h4>
    <ul>
      <li>Datos de contacto: nombre, correo electrónico, WhatsApp.</li>
      <li>Datos de identificación y tributarios de representantes: NIT o cédula, licencia DIAN, figura tributaria.</li>
      <li>Datos de tus pedidos de importación: producto, cantidades, valores declarados, documentos que adjuntes.</li>
    </ul>
    <h4>¿Para qué los usamos?</h4>
    <ul>
      <li>Conectarte con representantes verificados y darle seguimiento a tu pedido.</li>
      <li>Enviarte notificaciones sobre el estado de tus solicitudes (correo electrónico).</li>
      <li>Verificar la identidad de representantes antes de habilitarlos en el marketplace.</li>
    </ul>
    <h4>¿Con quién se comparten?</h4>
    <p>Con proveedores tecnológicos que procesan datos en nuestro nombre bajo contrato: Supabase (base de datos y autenticación) y Resend (envío de correos). No vendemos ni compartimos tus datos con terceros para fines comerciales ajenos a la plataforma.</p>
    <h4>Tus derechos como titular</h4>
    <p>Puedes conocer, actualizar, rectificar y solicitar la supresión de tus datos, así como revocar la autorización dada, escribiendo a través del <span style="text-decoration:underline; font-weight:600; color:var(--trust); cursor:pointer;" onclick="event.stopPropagation(); closeInfoModal(); openSupport();">canal de soporte</span> de la plataforma.</p>
    <button class="btn btn-outline btn-block" style="margin-top:6px;" onclick="closeInfoModal()">Cerrar</button>
  `, true);
}
function openTermsPanel(){
  openInfoModal(`
    <h3>Términos y condiciones</h3>
    <p>Esta es una versión inicial simple, redactada para el prototipo — antes de operar con usuarios reales a mayor escala, este texto debe pasar por revisión legal formal.</p>
    <h4>Qué es Conecta Importa</h4>
    <p>Conecta Importa es una plataforma que conecta a personas y empresas que quieren importar con representantes verificados (agencias de aduanas, agentes de sourcing, agentes de carga y trading companies). No somos agencia de aduanas, ni transportista, ni representante comercial de nadie — facilitamos el contacto, el seguimiento del pedido y la trazabilidad, pero el servicio de importación en sí lo presta el representante que elijas.</p>
    <h4>La "verificación" es un check de plataforma, no una certificación legal</h4>
    <p>Antes de habilitar a un representante revisamos su identidad, licencias declaradas y antecedentes en listas restrictivas. Esto reduce el riesgo, pero no es una certificación con peso legal ni un aval de que el representante cumplirá cada compromiso — la relación comercial y sus términos específicos (precios, tiempos, garantías) los pactas directamente con tu representante en cada cotización confirmada.</p>
    <h4>Pagos</h4>
    <p>El pago de tu pedido se transfiere directamente a la cuenta bancaria verificada de tu representante — Conecta Importa nunca recibe ni retiene ese dinero. Aparte, la plataforma cobra un fee de activación por conectar tu pedido, siempre mostrado por separado antes de que aceptes.</p>
    <h4>Tu cuenta</h4>
    <ul>
      <li>La información que registras (identidad, NIT/cédula, licencias) debe ser veraz.</li>
      <li>Eres responsable de mantener segura tu contraseña.</li>
      <li>Podemos suspender cuentas que usen la plataforma para actividades ilegales, contrabando, o productos restringidos por norma colombiana.</li>
    </ul>
    <h4>Cambios al servicio</h4>
    <p>Los montos de ejemplo (fee de activación, umbrales de norma citados en el wizard) pueden ajustarse con el tiempo — siempre los vas a ver con transparencia antes de aceptar una cotización.</p>
    <h4>Ley aplicable</h4>
    <p>Estos términos se rigen por las leyes de Colombia. Para preguntas, escribe a través del <span style="text-decoration:underline; font-weight:600; color:var(--trust); cursor:pointer;" onclick="event.stopPropagation(); closeInfoModal(); openSupport();">canal de soporte</span> de la plataforma.</p>
    <button class="btn btn-outline btn-block" style="margin-top:6px;" onclick="closeInfoModal()">Cerrar</button>
  `, true);
}
function renderRepLoginGate(mode){
  mode = mode || 'login';
  const isSignup = mode === 'signup';
  $('repPortalContent').style.display = 'none';
  $('repLoginBox').innerHTML = `
    ${isSignup ? `<div class="banner" style="margin-top:22px;">🚀 <b>Primeros representantes:</b> cotizar y responder solicitudes nunca tiene costo. La plataforma no te cobra comisión sobre la tuya — solo cuando un pedido se concreta, el cliente ve tu comisión con total transparencia, igual que si te contratara directo.</div>` : ''}
    <div class="auth-card" id="repAuthCard" ${isSignup?'':'style="margin-top:22px;"'}>
      <div class="lock-badge">🔒 Acceso solo para representantes y agencias verificadas</div>
      <p style="font-size:12.5px; line-height:1.6; margin:0 0 14px;">
        ${isSignup ? 'Regístrate con los datos legales de tu agencia o negocio — nada de esto te activa de inmediato, primero pasa por nuestro proceso de verificación.' : 'Ingresa con tu cuenta de representante para ver y responder solicitudes de clientes.'}
      </p>
      <form onsubmit="return false;" autocomplete="on">
      ${isSignup ? `
      <div class="form-section">
        <div class="form-section-title">Datos de tu agencia o negocio</div>
        <div class="grid">
          <div><label class="field-label">Nombre de la agencia / representante</label><input type="text" id="rep_auth_name" autocomplete="organization" placeholder="Ej. Aduanas Cordillera S.A.S."></div>
          <div><label class="field-label">Tipo</label>
            <select id="rep_auth_type">
              <option value="agencia_aduanas">Agencia de aduanas (declara ante la DIAN)</option>
              <option value="agente_sourcing">Agente de sourcing (negocia con el proveedor, no declara)</option>
              <option value="agente_carga">Agente de carga / freight forwarder</option>
              <option value="trading_company">Trading company / comercializadora (importa y revende nacionalizado)</option>
            </select>
          </div>
        </div>
      </div>
      <div class="form-section">
        <div class="form-section-title">Identificación legal</div>
        <div class="grid">
          <div><label class="field-label">NIT o cédula</label><input type="text" id="rep_auth_nit" placeholder="900.123.456-7"></div>
          <div><label class="field-label">N° de licencia DIAN (si aplica)</label><input type="text" id="rep_auth_license" placeholder="Ej. RES-2024-00218"></div>
          <div><label class="field-label">Figura tributaria</label>
            <select id="rep_auth_legal_person">
              <option value="juridica">Persona jurídica (empresa)</option>
              <option value="natural">Persona natural</option>
            </select>
          </div>
        </div>
      </div>
      <div class="form-section">
        <div class="form-section-title">Acceso</div>
        <div class="grid">
          <div><label class="field-label">Correo electrónico</label><input type="email" id="rep_auth_email" autocomplete="email" placeholder="tucorreo@agencia.com"></div>
          <div><label class="field-label">Contraseña</label>${pwFieldHtml('rep_auth_pass', 'new-password', 'Mínimo 8 caracteres')}</div>
        </div>
      </div>
      ` : `
      <div class="grid">
        <div><label class="field-label">Correo electrónico</label><input type="email" id="rep_auth_email" autocomplete="email" placeholder="tucorreo@agencia.com"></div>
        <div><label class="field-label">Contraseña</label>${pwFieldHtml('rep_auth_pass', 'current-password', 'Mínimo 8 caracteres')}</div>
      </div>
      `}
      ${isSignup ? `
      <label style="display:flex; align-items:flex-start; gap:8px; margin-top:14px; font-size:12px; color:#D4D6DC; cursor:pointer;">
        <input type="checkbox" id="rep_auth_privacy" style="width:auto; margin-top:2px;">
        Acepto los <span style="text-decoration:underline; font-weight:600; color:var(--lime);" onclick="event.preventDefault(); openTermsPanel();">términos y condiciones</span> y la <span style="text-decoration:underline; font-weight:600; color:var(--lime);" onclick="event.preventDefault(); openPrivacyPanel();">política de tratamiento de datos personales</span>
      </label>` : ''}
      <div id="rep_auth_error" class="hint" style="color:#F0B4AE; display:none;"></div>
      <button type="submit" class="btn btn-primary" style="margin-top:14px;" onclick="repLogin('${mode}', this)">${isSignup ? 'Enviar a verificación' : 'Iniciar sesión'}</button>
      </form>
      <div class="hint" style="color:#B9BEC9;">${isSignup ? '¿Ya tienes cuenta?' : '¿Eres nuevo en la plataforma?'} <span style="color:var(--lime); font-weight:600; text-decoration:underline; cursor:pointer;" onclick="renderRepLoginGate('${isSignup?'login':'signup'}')">${isSignup ? 'Inicia sesión' : 'Regístrate'}</span></div>
    </div>
  `;
}
// Los 4 roles legales que puede tener un representante en la plataforma.
// Ojo: "agencia de aduanas" es la única figura que la ley obliga a ser
// persona jurídica y a estar habilitada ante la DIAN para declarar
// importaciones — por norma NO puede además hacer de representante
// comercial del proveedor. Por eso son roles separados, no uno genérico.
const VERIF_STEPS_BY_TYPE = {
  agencia_aduanas: [
    { k:'identidad', label:'Identidad legal (NIT + Cámara de Comercio / RUES)', auto:true },
    { k:'licencia', label:'Licencia de agencia de aduanas activa ante la DIAN', auto:false },
    { k:'poliza', label:'Vigencia de la póliza de cumplimiento', auto:false },
    { k:'cuenta', label:'Titularidad de la cuenta bancaria', auto:false },
    { k:'antecedentes', label:'Consulta en listas restrictivas (SARLAFT / UIAF)', auto:false },
    { k:'humana', label:'Verificación humana (llamada o videollamada)', auto:false }
  ],
  agente_sourcing: [
    { k:'identidad', label:'Identidad legal (cédula o NIT)', auto:true },
    { k:'cuenta', label:'Titularidad de la cuenta bancaria', auto:false },
    { k:'antecedentes', label:'Consulta en listas restrictivas (SARLAFT / UIAF)', auto:false },
    { k:'humana', label:'Verificación humana (llamada o videollamada)', auto:false }
  ],
  agente_carga: [
    { k:'identidad', label:'Identidad legal (cédula o NIT)', auto:true },
    { k:'cuenta', label:'Titularidad de la cuenta bancaria', auto:false },
    { k:'antecedentes', label:'Consulta en listas restrictivas (SARLAFT / UIAF)', auto:false },
    { k:'humana', label:'Verificación humana (llamada o videollamada)', auto:false }
  ],
  trading_company: [
    { k:'identidad', label:'Identidad legal (NIT + Cámara de Comercio / RUES)', auto:true },
    { k:'licencia', label:'RUT con registro de importador activo', auto:false },
    { k:'cuenta', label:'Titularidad de la cuenta bancaria', auto:false },
    { k:'antecedentes', label:'Consulta en listas restrictivas (SARLAFT / UIAF)', auto:false },
    { k:'humana', label:'Verificación humana (llamada o videollamada)', auto:false }
  ]
};
async function repLogin(mode, btn){
  const email = $('rep_auth_email').value.trim();
  const pass = $('rep_auth_pass').value.trim();
  const errBox = $('rep_auth_error');
  if(errBox) errBox.style.display = 'none';
  if(!email || !pass){ alert('Ingresa correo y contraseña.'); return; }
  if(mode === 'signup' && !$('rep_auth_name').value.trim()){ alert('Ingresa el nombre de tu agencia o negocio.'); return; }
  if(mode === 'signup' && !$('rep_auth_privacy').checked){ alert('Debes aceptar la política de tratamiento de datos personales para registrarte.'); return; }
  if(!requireSupabase()) return;
  const originalLabel = btn ? btn.textContent : '';
  if(btn){ btn.disabled = true; btn.textContent = 'Un momento…'; }
  try{
    let session;
    if(mode === 'signup'){
      const businessName = $('rep_auth_name').value.trim();
      const repType = $('rep_auth_type').value;
      const nit = $('rep_auth_nit').value.trim();
      const license = $('rep_auth_license').value.trim();
      const legalPersonType = $('rep_auth_legal_person').value;
      session = await upgradeOrSignUp(email, pass, { role:'representative', business_name:businessName, rep_type:repType, nit_or_cedula:nit, dian_license:license, legal_person_type:legalPersonType, privacy_accepted_at: new Date().toISOString() });
      if(!session){
        $('repLoginBox').innerHTML = `<div class="banner" style="margin-top:22px;">✓ Cuenta creada. Te enviamos un correo de confirmación a <b>${email}</b> — ábrelo y confirma tu cuenta, luego vuelve aquí e inicia sesión.</div>`;
        return;
      }
    } else {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
      if(error) throw error;
      session = data.session;
    }
    const profile = await ensureProfile(session);
    if(profile.role !== 'representative'){
      alert('Esta cuenta está registrada como cliente, no como representante — inicia sesión desde el Portal Cliente.');
      await supabaseClient.auth.signOut();
      return;
    }
    const rep = await ensureRepresentative(session, profile);
    state.repLoggedIn = true;
    state.repEmail = profile.email;
    state.repVerifType = rep.rep_type;
    state.repVerifStatus = rep.verification_status || {};
    state.repRecordId = rep.id;
    state.repAvailable = rep.available;
    state.repMinOrder = rep.min_order_usd || 0;
    if(mode === 'signup'){
      logNotification(email, 'Recibimos tu solicitud de verificación', 'Revisamos tu identidad de inmediato; la licencia, cuenta bancaria y antecedentes suelen tardar 24–72h.');
    } else {
      logNotification(email, 'Iniciaste sesión como representante', 'Ya puedes ver y responder solicitudes de clientes.');
    }
    showRepPortalContent();
    renderRepVerificationChecklist();
  } catch(err){
    if(errBox){ errBox.textContent = friendlyAuthError(err); errBox.style.display = 'block'; }
    else alert(friendlyAuthError(err));
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = originalLabel; }
  }
}
function renderRepVerificationChecklist(){
  const box = $('repVerifBox');
  if(!box || !state.repVerifType) return;
  const steps = VERIF_STEPS_BY_TYPE[state.repVerifType];
  const done = steps.filter(s=>state.repVerifStatus[s.k]).length;
  const allDone = done === steps.length;
  box.innerHTML = `
    <div class="card" style="${allDone?'border-color:var(--lime-deep);':''}">
      <div class="section-title">Estado de tu verificación</div>
      <div class="hint" style="margin-top:0;">${allDone ? '✓ Verificación completa — ya apareces como "Verificado" ante los clientes.' : `${done}/${steps.length} pasos completados. Mientras tanto, apareces como "En validación" con un tope de USD 3.000 por operación.`}</div>
      ${steps.map(s=>`
        <div class="line-item"><span class="lbl">${state.repVerifStatus[s.k]?'✓':'⏳'} ${s.label}</span><span class="val" style="font-size:11px; color:${state.repVerifStatus[s.k]?'var(--lime-deep)':'var(--ink-faint)'};">${state.repVerifStatus[s.k]?'Listo':'En revisión'}</span></div>
      `).join('')}
      ${!allDone ? `<button class="btn btn-outline btn-sm" style="margin-top:10px;" onclick="simulateVerifStep()">🧪 (Demo) Avanzar siguiente paso</button>` : ''}
    </div>
  `;
}
async function simulateVerifStep(){
  const steps = VERIF_STEPS_BY_TYPE[state.repVerifType];
  const next = steps.find(s=>!state.repVerifStatus[s.k]);
  if(!next) return;
  state.repVerifStatus[next.k] = true;
  renderRepVerificationChecklist();
  if(supabaseClient && state.repRecordId){
    await supabaseClient.from('representatives')
      .update({ verification_status: state.repVerifStatus })
      .eq('id', state.repRecordId);
  }
}
// ---------------------------------------------------------------------
// CENTRO DE DUDAS (gamificado) — cliente y representante
// ---------------------------------------------------------------------
const CLIENT_FAQS = [
  { q:'¿Qué pasa si mi representante no responde o desaparece?', a:'Escálalo con el botón 💬 de soporte. Si no responde en el tiempo esperado, te ayudamos a mover tu solicitud a otro representante verificado sin perder lo ya cotizado.' },
  { q:'¿Puedo ver reseñas de otros clientes de ese representante?', a:'Hoy ves su calificación y número de operaciones. Estamos sumando reseñas con comentarios reales de clientes anteriores para que decidas con más contexto.' },
  { q:'¿Quién responde si el proveedor no despacha a tiempo o el producto llega dañado?', a:'Depende de lo pactado en tu cotización confirmada y del nivel de verificación que elegiste. Por eso conviene no omitirla si el proveedor es nuevo para ti.' },
  { q:'¿Puedo cambiar de representante a mitad de proceso?', a:'Sí, antes de pagar. Una vez transferiste directamente a su cuenta, el cambio ya no depende de la plataforma sino de lo que acuerdes con él.' },
  { q:'¿Qué pasa con mis datos si decido no continuar?', a:'Si no llegaste a compartir información del proveedor, no se comparte nada con el representante. Puedes salir del proceso en cualquier momento antes de aceptar la cotización confirmada.' },
  { q:'¿La plataforma revisa que la agencia sea legal ante la DIAN?', a:'Verificamos identidad y, según el tipo de representante, licencia o registro de importador — pero sigue siendo tu responsabilidad revisar cualquier duda puntual antes de pagar.' }
];
const REP_FAQS = [
  { q:'¿Cómo sé que el cliente realmente va a pagar antes de cotizar en serio?', a:'Revisa el contexto del cliente en su solicitud (perfil, frecuencia, si ya tiene proveedor) antes de invertir tiempo armando valores reales.' },
  { q:'¿Qué pasa si el cliente se arrepiente después de que ya negocié con el proveedor?', a:'Por eso la cotización confirmada solo se envía cuando ya validaste que puedes cumplirla — negociar antes de esa confirmación es bajo tu propio riesgo.' },
  { q:'¿Soy responsable si el cliente omitió la verificación del proveedor y hay un fraude?', a:'No — el cliente elige explícitamente ese nivel de riesgo al cotizar. Tu responsabilidad es la que pactes en tu cotización confirmada, no la decisión de verificación del cliente.' },
  { q:'¿Cómo protejo mi comisión de que el cliente me salte la próxima vez?', a:'La relación queda registrada en la plataforma (historial, notificaciones) — eso es evidencia de que el vínculo se originó aquí si necesitas hacerlo valer.' },
  { q:'¿Qué pasa si el cliente no paga después de la cotización confirmada?', a:'No estás obligado a iniciar gestiones con el proveedor hasta ver el comprobante de transferencia en la plataforma.' },
  { q:'¿Cómo demuestro que cumplí si algo falla fuera de mi control (ej. demora del proveedor)?', a:'Usa las notas y archivos de cada etapa del envío — quedan con fecha y son visibles para el cliente como evidencia de que la actualización fue oportuna.' },
  { q:'¿Qué pasa si el cliente me contacta directo la próxima vez y se salta la plataforma?', a:'No podemos impedirlo, pero cotizar y responder aquí no tiene costo, y tu historial (operaciones, calificación) solo crece si el cliente sigue viniendo a través de la plataforma — eso te da más visibilidad frente a nuevos clientes.' },
  { q:'¿Cuánto me cobra la plataforma por participar?', a:'Nada por registrarte, cotizar o responder. Tú defines tu comisión libremente, y el cliente la ve con transparencia — la plataforma no le agrega ningún cargo adicional a la tuya.' }
];
function initFaqDeck(containerId, faqs, seenKey, badgeText){
  if(!state[seenKey]) state[seenKey] = {};
  const box = $(containerId);
  if(!box) return;
  box.innerHTML = `
    <div class="card">
      <div class="section-title">🧠 Centro de dudas</div>
      <div class="hint" id="${containerId}_progress" style="margin-top:0;"></div>
      <div style="height:6px; background:var(--line); border-radius:6px; overflow:hidden; margin:8px 0 14px;">
        <div id="${containerId}_bar" style="height:100%; width:0%; background:var(--lime); transition:width .3s ease;"></div>
      </div>
      <div id="${containerId}_badge" style="margin-bottom:10px;"></div>
      ${faqs.map((f,i)=>`
        <details class="faq-item" onclick="onFaqOpen('${containerId}','${seenKey}',${i},${faqs.length},'${badgeText}')" style="border:1px solid var(--line); border-radius:10px; padding:10px 12px; margin-bottom:8px;">
          <summary style="font-weight:600; font-size:13px; cursor:pointer;">${f.q}</summary>
          <p class="hint" style="margin-top:8px;">${f.a}</p>
        </details>
      `).join('')}
    </div>
  `;
  updateFaqProgress(containerId, seenKey, faqs.length, badgeText);
}
function onFaqOpen(containerId, seenKey, i, total, badgeText){
  state[seenKey][i] = true;
  updateFaqProgress(containerId, seenKey, total, badgeText);
}
function updateFaqProgress(containerId, seenKey, total, badgeText){
  const seen = Object.keys(state[seenKey]||{}).length;
  const pct = Math.round((seen/total)*100);
  const progressEl = $(containerId+'_progress');
  const barEl = $(containerId+'_bar');
  const badgeEl = $(containerId+'_badge');
  if(progressEl) progressEl.textContent = `${seen}/${total} dudas resueltas`;
  if(barEl) barEl.style.width = pct+'%';
  if(badgeEl) badgeEl.innerHTML = seen===total ? `<span class="pill pill-recommend">🏅 ${badgeText}</span>` : '';
}

function showRepPortalContent(){
  $('repLoginBox').innerHTML = `<div class="hint" style="margin-top:22px;">Conectado como <b>${state.repEmail}</b> · <span style="text-decoration:underline; cursor:pointer;" onclick="repLogout()">cerrar sesión</span></div>`;
  $('repPortalContent').style.display = 'block';
  renderRepVerificationChecklist();
  renderAvailabilityPanel();
  renderRepCatalogPanel();
  renderRepQueue();
  renderRepShipmentPanel();
  initFaqDeck('repFaqDeck', REP_FAQS, 'faqRepSeen', 'Representante preparado');
}
function renderAvailabilityPanel(){
  const box = $('repAvailabilityBox');
  if(!box) return;
  box.innerHTML = `
    <div class="card">
      <div class="section-title">Tu disponibilidad</div>
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div>
          <div style="font-weight:700; font-size:13px;">${state.repAvailable ? '🟢 Recibiendo nuevas solicitudes' : '⚪ Pausado — no te muestran en el marketplace'}</div>
          <div class="hint" style="margin:2px 0 0;">Actívalo o pausálo cuando quieras, sin costo ni penalización.</div>
        </div>
        <button class="btn ${state.repAvailable?'btn-outline':'btn-primary'} btn-sm" onclick="toggleAvailability()">${state.repAvailable?'Pausar':'Activar'}</button>
      </div>
      <div class="grid" style="margin-top:14px;">
        <div><label class="field-label">Monto mínimo de pedido (USD)</label><input type="number" id="rep_min_order" value="${state.repMinOrder}" oninput="state.repMinOrder=parseFloat(this.value)||0"></div>
        <div><label class="field-label">Categorías que atiendes</label><input type="text" value="Autopartes, Electrónica, Hogar" disabled></div>
      </div>
      <div class="hint" style="margin-top:8px;">Solo verás solicitudes que calcen con estos filtros — esto reduce el ruido de leads que no te sirven.</div>
    </div>
  `;
}
function toggleAvailability(){
  state.repAvailable = !state.repAvailable;
  renderAvailabilityPanel();
  renderRepQueue();
}
// Solo las trading companies venden por catálogo (Camino B) — el resto de
// roles responde solicitudes con valores reales, no publica productos.
let ownProducts = [];
async function renderRepCatalogPanel(){
  const box = $('repCatalogBox');
  if(!box) return;
  if(state.repVerifType !== 'trading_company'){ box.style.display = 'none'; box.innerHTML = ''; return; }
  box.style.display = 'block';
  box.innerHTML = `<div class="card"><div class="section-title">Mi catálogo</div><div class="hint">Cargando…</div></div>`;
  const { data, error } = await supabaseClient
    .from('products').select('*').eq('representative_id', state.repRecordId).order('created_at', {ascending:false});
  if(error){ box.innerHTML = `<div class="card"><div class="section-title">Mi catálogo</div><div class="hint">No se pudo cargar tu catálogo: ${error.message}</div></div>`; return; }
  ownProducts = data || [];
  renderOwnProductsList();
}
function renderOwnProductsList(){
  const box = $('repCatalogBox');
  box.innerHTML = `
    <div class="card">
      <div class="section-title">Mi catálogo</div>
      <p class="hint" style="margin-top:0;">Los clientes de Camino B ven aquí tus productos ya nacionalizados, con precio fijo. Publica los que tengas disponibles.</p>
      ${ownProducts.length===0 ? `<div class="hint">Todavía no has publicado productos.</div>` : ownProducts.map(p=>`
        <div class="card tight" style="margin-top:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
            <div>
              <div style="font-weight:700; font-size:13px;">${p.name} ${p.active?'':'<span class="pill pill-warn">Pausado</span>'}</div>
              <div class="hint" style="margin:2px 0 0;">${fmtUsd(Number(p.price_usd)||0)} / ${p.unit}${p.stock!=null ? ' · '+p.stock+' disponibles':''}</div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="toggleProductActive('${p.id}', ${!p.active})">${p.active?'Pausar':'Reactivar'}</button>
          </div>
        </div>
      `).join('')}
      <div style="margin-top:14px; padding-top:14px; border-top:1px dashed var(--line);">
        <div class="section-title" style="margin-top:0;">Publicar nuevo producto</div>
        <div class="grid">
          <div><label class="field-label">Nombre</label><input type="text" id="np_name" placeholder="Ej. Filtros de aceite automotriz"></div>
          <div><label class="field-label">Precio (USD)</label><input type="number" id="np_price" placeholder="Ej. 4.50"></div>
          <div><label class="field-label">Unidad</label><input type="text" id="np_unit" value="unidad"></div>
          <div><label class="field-label">Stock disponible (opcional)</label><input type="number" id="np_stock" placeholder="Ej. 200"></div>
        </div>
        <label class="field-label" style="margin-top:10px;">Descripción (opcional)</label>
        <textarea id="np_desc" rows="2"></textarea>
        <button class="btn btn-primary" style="margin-top:10px;" onclick="addProduct()">+ Publicar producto</button>
        <div id="np_error" class="hint" style="color:var(--danger); display:none;"></div>
      </div>
    </div>
  `;
}
async function addProduct(){
  const name = $('np_name').value.trim();
  const price = parseFloat($('np_price').value);
  const unit = $('np_unit').value.trim() || 'unidad';
  const stockVal = $('np_stock').value.trim();
  const desc = $('np_desc').value.trim();
  const errBox = $('np_error');
  errBox.style.display = 'none';
  if(!name || !(price>0)){ errBox.textContent = 'Ingresa un nombre y un precio válido.'; errBox.style.display = 'block'; return; }
  const { error } = await supabaseClient.from('products').insert({
    representative_id: state.repRecordId,
    name, price_usd: price, unit,
    stock: stockVal ? parseInt(stockVal) : null,
    description: desc || null
  });
  if(error){ errBox.textContent = 'No se pudo publicar: ' + error.message; errBox.style.display = 'block'; return; }
  await renderRepCatalogPanel();
}
async function toggleProductActive(id, makeActive){
  const { error } = await supabaseClient.from('products').update({ active: makeActive }).eq('id', id);
  if(error){ alert('No se pudo actualizar el producto: ' + error.message); return; }
  await renderRepCatalogPanel();
}
async function repLogout(){
  if(supabaseClient) await supabaseClient.auth.signOut();
  state.repLoggedIn = false;
  state.repEmail = null;
  state.repRecordId = null;
  renderRepLoginGate('login');
}
function backToClientFromRep(){
  $('repShell').style.display = 'none';
  $('appShell').style.display = 'block';
  window.scrollTo(0,0);
}
let repQueueRows = [];
let repOpenRequest = null;
async function renderRepQueue(){
  if(!state.repAvailable){
    $('repQueue').innerHTML = `<div class="banner">⚪ Estás pausado — no te están llegando nuevas solicitudes. Actívate arriba cuando quieras volver a recibir clientes.</div>`;
    return;
  }
  if(!supabaseClient || !state.repRecordId){
    $('repQueue').innerHTML = `<div class="hint">Inicia sesión como representante para ver tus solicitudes.</div>`;
    return;
  }
  $('repQueue').innerHTML = `<div class="waiting-box"><div class="dot-spinner"><span></span><span></span><span></span></div>Cargando solicitudes…</div>`;
  const { data, error } = await supabaseClient
    .from('quote_requests')
    .select('*')
    .eq('representative_id', state.repRecordId)
    .eq('status', 'pending')
    .order('created_at', { ascending:false });
  if(error){
    $('repQueue').innerHTML = `<div class="hint">No se pudieron cargar las solicitudes: ${error.message}</div>`;
    return;
  }
  repQueueRows = data || [];
  if(repQueueRows.length === 0){
    $('repQueue').innerHTML = `<div class="hint">Todavía no tienes solicitudes pendientes — aparecerán aquí apenas un cliente te elija y pida cotización.</div>`;
    return;
  }
  $('repQueue').innerHTML = repQueueRows.map(r=>`
    <div class="card tight" style="margin-bottom:8px;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
        <div>
          <div style="font-weight:700; font-size:13px;">${r.contact_email}</div>
          <div class="hint" style="margin:2px 0 0;">${r.product_name || 'Pedido'} · Folio ${r.folio}</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openRepForm('${r.id}')">Responder ahora</button>
      </div>
    </div>
  `).join('');
}

function getClientContextHtml(row){
  return `
    <div class="card" style="background:var(--paper); border-style:dashed;">
      <div class="section-title">Contexto del cliente</div>
      <div class="line-item"><span class="lbl">Contacto</span><span class="val" style="font-family:'Inter',sans-serif;">${row.contact_email}${row.contact_whatsapp ? ' · '+row.contact_whatsapp : ''}</span></div>
      <div class="line-item"><span class="lbl">Incoterm / ruta elegida</span><span class="val" style="font-family:'Inter',sans-serif;">${row.incoterm || 'FOB'} · ${row.shipping_mode || '—'}</span></div>
      <div class="line-item"><span class="lbl">Verificación que pidió</span><span class="val" style="font-family:'Inter',sans-serif;">${verifLabels[row.verification_level] || row.verification_level || '—'}</span></div>
      <div class="hint" style="margin-top:10px; padding-top:10px; border-top:1px dashed var(--line);">Solicitud creada el ${new Date(row.created_at).toLocaleString('es-CO',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}.</div>
    </div>
  `;
}

function openRepForm(id){
  const row = repQueueRows.find(r=>r.id===id);
  if(!row){ alert('No se encontró esa solicitud — puede que ya haya sido respondida desde otra sesión.'); return; }
  repOpenRequest = row;
  $('repForm').style.display = 'block';
  if(row.product_id){
    renderCatalogRepForm(row);
    return;
  }
  const q = row.preliminary_quote || {};
  $('repForm').innerHTML = `
    ${getClientContextHtml(row)}
    <div class="card">
      <div class="section-title">Pedido declarado por el cliente</div>
      <div class="grid">
        <div><label class="field-label">Producto</label><input type="text" value="${row.product_name || ''}" disabled></div>
        <div><label class="field-label">Unidades</label><input type="text" value="${row.quantity || 0}" disabled></div>
        <div><label class="field-label">Peso / volumen</label><input type="text" value="${row.weight_kg || 0} kg · ${row.volume_cbm || 0} m³" disabled></div>
        <div><label class="field-label">FOB declarado (USD)</label><input type="text" value="${fmtUsd(row.fob_usd || 0)}" disabled></div>
      </div>
    </div>
    <div class="card">
      <div class="section-title">Tus valores reales</div>
      <p class="hint" style="margin-top:0;">Estos campos vienen prellenados con <b>nuestro estimado automático</b> — ajústalos a las tarifas reales que puedes ofrecer. Es lo que verá el cliente en su cotización confirmada.</p>
      <div class="grid">
        <div><label class="field-label">Flete real (USD)</label><input type="number" id="rr_freight" value="${(q.freight||0).toFixed ? q.freight.toFixed(2) : (q.freight||0)}" oninput="updateRRTotal()"></div>
        <div><label class="field-label">Seguro real (USD)</label><input type="number" id="rr_insurance" value="${(q.insurance||0).toFixed ? q.insurance.toFixed(2) : (q.insurance||0)}" oninput="updateRRTotal()"></div>
        <div><label class="field-label">Arancel real (%)</label><input type="number" id="rr_tariff" value="${q.tariffRate ?? 15}" step="0.5" oninput="updateRRTotal()"></div>
        <div><label class="field-label">IVA (%)</label><input type="number" id="rr_iva" value="${q.ivaRate ?? 19}" step="0.5" oninput="updateRRTotal()"></div>
        <div><label class="field-label">Costo verificación (USD)</label><input type="number" id="rr_verif" value="${q.verifCost || 0}" oninput="updateRRTotal()"></div>
        <div><label class="field-label">Tu comisión / honorarios (USD)</label><input type="number" id="rr_commission" value="${(q.repCommission||0).toFixed ? q.repCommission.toFixed(2) : (q.repCommission||0)}" oninput="updateRRTotal()"></div>
        <div><label class="field-label">Agente aduanas + portuarios (USD)</label><input type="number" id="rr_agent" value="${q.agentFee || 220}" oninput="updateRRTotal()"></div>
      </div>
      <div id="rrTotalPreview" class="hint" style="margin-top:12px; font-weight:700; color:var(--ink); font-size:13.5px;"></div>
      <label class="field-label" style="margin-top:14px;">Nota para el cliente</label>
      <textarea id="rep_note" rows="3">Confirmé espacio en el próximo zarpe con la tarifa vigente de temporada.</textarea>
      <div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="submitRepResponse()">✓ Aprobar y enviar cotización confirmada</button>
        <button class="btn btn-outline" style="border-color:var(--danger); color:var(--danger);" onclick="toggleRejectBox()">✗ Rechazar solicitud</button>
      </div>
      <div id="rrRejectBox" style="display:none; margin-top:16px; padding-top:16px; border-top:1px dashed var(--line);">
        <label class="field-label">Motivo del rechazo</label>
        <select id="rr_reject_reason">
          <option>Producto no permitido en esta ruta o país</option>
          <option>Documentación del proveedor insuficiente</option>
          <option>Fuera de nuestra capacidad de despacho actual</option>
          <option>El presupuesto del cliente no es viable con tarifas reales</option>
          <option>Otro motivo</option>
        </select>
        <label class="field-label" style="margin-top:10px;">Mensaje para el cliente</label>
        <textarea id="rr_reject_msg" rows="2" placeholder="Explica brevemente por qué, o qué necesitarías para reconsiderar."></textarea>
        <button class="btn btn-secondary" style="margin-top:10px;" onclick="submitRejection()">Confirmar rechazo</button>
      </div>
    </div>
  `;
  updateRRTotal();
  $('repForm').scrollIntoView({behavior:'smooth', block:'nearest'});
}
function renderCatalogRepForm(row){
  const q = row.preliminary_quote || {};
  $('repForm').innerHTML = `
    <div class="card" style="background:var(--paper); border-style:dashed;">
      <div class="section-title">Datos del cliente</div>
      <div class="line-item"><span class="lbl">Contacto</span><span class="val" style="font-family:'Inter',sans-serif;">${row.contact_email}${row.contact_whatsapp ? ' · '+row.contact_whatsapp : ''}</span></div>
      <div class="hint" style="margin-top:10px; padding-top:10px; border-top:1px dashed var(--line);">Pedido creado el ${new Date(row.created_at).toLocaleString('es-CO',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}.</div>
    </div>
    <div class="card">
      <div class="section-title">Pedido de catálogo</div>
      <div class="line-item"><span class="lbl">Producto</span><span class="val">${row.product_name || ''}</span></div>
      <div class="line-item"><span class="lbl">Cantidad</span><span class="val">${row.quantity || 0}</span></div>
      <div class="line-item"><span class="lbl">Precio unitario</span><span class="val">${fmtUsd(q.unitPrice||0)}</span></div>
      <div class="line-item total"><span class="lbl">Total</span><span class="val">${fmtUsd(q.total || row.fob_usd || 0)}</span></div>
      <p class="hint">Este precio ya lo fijaste tú en tu catálogo — solo confirma que tienes stock disponible para despachar este pedido.</p>
      <label class="field-label">Nota para el cliente (opcional)</label>
      <textarea id="rep_note" rows="2" placeholder="Ej. Disponible, despacho en 2 días hábiles."></textarea>
      <div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="submitCatalogConfirm()">✓ Confirmar disponibilidad</button>
        <button class="btn btn-outline" style="border-color:var(--danger); color:var(--danger);" onclick="toggleRejectBox()">✗ Sin stock / rechazar</button>
      </div>
      <div id="rrRejectBox" style="display:none; margin-top:16px; padding-top:16px; border-top:1px dashed var(--line);">
        <label class="field-label">Motivo</label>
        <select id="rr_reject_reason">
          <option>Sin stock suficiente</option>
          <option>Producto descontinuado</option>
          <option>Zona de entrega no cubierta</option>
          <option>Otro motivo</option>
        </select>
        <label class="field-label" style="margin-top:10px;">Mensaje para el cliente</label>
        <textarea id="rr_reject_msg" rows="2" placeholder="Explica brevemente por qué, o qué necesitarías para reconsiderar."></textarea>
        <button class="btn btn-secondary" style="margin-top:10px;" onclick="submitRejection()">Confirmar rechazo</button>
      </div>
    </div>
  `;
  $('repForm').scrollIntoView({behavior:'smooth', block:'nearest'});
}
async function submitCatalogConfirm(){
  if(!repOpenRequest) return;
  const repNote = $('rep_note').value;
  const confirmedQuote = repOpenRequest.preliminary_quote;
  const { error } = await supabaseClient.from('quote_requests').update({
    status: 'responded', confirmed_quote: confirmedQuote, rep_note: repNote, updated_at: new Date().toISOString()
  }).eq('id', repOpenRequest.id);
  if(error){ alert('No se pudo confirmar el pedido: ' + error.message); return; }
  logNotification(repOpenRequest.contact_email, `Confirmaste el pedido de ${repOpenRequest.folio}`, 'Tu cliente ya puede ver la confirmación y proceder con el pago.');
  $('repForm').innerHTML = `<div class="banner">✓ Confirmaste disponibilidad. El cliente ya puede verlo y proceder con el pago.</div>`;
  repOpenRequest = null;
  renderRepQueue();
}
function toggleRejectBox(){
  const box = $('rrRejectBox');
  box.style.display = box.style.display==='block' ? 'none' : 'block';
  if(box.style.display==='block') box.scrollIntoView({behavior:'smooth', block:'nearest'});
}
function updateRRTotal(){
  if(!repOpenRequest) return;
  const fob = repOpenRequest.fob_usd || 0;
  const freight = parseFloat($('rr_freight').value)||0;
  const insurance = parseFloat($('rr_insurance').value)||0;
  const tariffRate = parseFloat($('rr_tariff').value)||0;
  const ivaRate = parseFloat($('rr_iva').value)||0;
  const verifCost = parseFloat($('rr_verif').value)||0;
  const commission = parseFloat($('rr_commission').value)||0;
  const agentFee = parseFloat($('rr_agent').value)||0;
  const cif = fob+freight+insurance;
  const tariff = cif*(tariffRate/100);
  const iva = (cif+tariff)*(ivaRate/100);
  const total = cif+tariff+iva+verifCost+commission+agentFee;
  const prelimTotal = repOpenRequest.preliminary_quote ? repOpenRequest.preliminary_quote.total : total;
  const diffPct = prelimTotal>0 ? ((total-prelimTotal)/prelimTotal*100) : 0;
  const sign = diffPct>=0?'+':'';
  $('rrTotalPreview').textContent = `Total real para el cliente: ${fmtUsd(total)}  (estimado automático era ${fmtUsd(prelimTotal)}, ${sign}${diffPct.toFixed(1)}%)`;
}
async function submitRepResponse(){
  if(!repOpenRequest) return;
  const fob = repOpenRequest.fob_usd || 0;
  const freight = parseFloat($('rr_freight').value)||0;
  const insurance = parseFloat($('rr_insurance').value)||0;
  const tariffRate = parseFloat($('rr_tariff').value)||0;
  const ivaRate = parseFloat($('rr_iva').value)||0;
  const verifCost = parseFloat($('rr_verif').value)||0;
  const repCommission = parseFloat($('rr_commission').value)||0;
  const agentFee = parseFloat($('rr_agent').value)||0;
  const cif = fob+freight+insurance;
  const tariff = cif*(tariffRate/100);
  const iva = (cif+tariff)*(ivaRate/100);
  const lockFee = repOpenRequest.price_locked ? 12 : 0;
  const total = cif+tariff+iva+verifCost+repCommission+agentFee+lockFee;
  const confirmedQuote = { fob, freight, insurance, cif, tariffRate, tariff, ivaRate, iva, verifCost, repCommission, agentFee, lockFee, total };
  const repNote = $('rep_note').value;
  const { error } = await supabaseClient.from('quote_requests').update({
    status: 'responded', confirmed_quote: confirmedQuote, rep_note: repNote, updated_at: new Date().toISOString()
  }).eq('id', repOpenRequest.id);
  if(error){ alert('No se pudo enviar la respuesta: ' + error.message); return; }
  logNotification(repOpenRequest.contact_email, `Confirmaste la cotización de ${repOpenRequest.folio}`, 'La cotización confirmada con valores reales ya está disponible para el cliente.');
  $('repForm').innerHTML = `<div class="banner">✓ Enviaste la cotización confirmada con tus valores reales. El cliente ya puede verla en su vista, incluyendo tu nota.</div>`;
  repOpenRequest = null;
  renderRepQueue();
}
async function submitRejection(){
  if(!repOpenRequest) return;
  const reason = $('rr_reject_reason').value;
  const msg = $('rr_reject_msg').value.trim();
  const { error } = await supabaseClient.from('quote_requests').update({
    status: 'rejected', reject_reason: reason, reject_msg: msg, updated_at: new Date().toISOString()
  }).eq('id', repOpenRequest.id);
  if(error){ alert('No se pudo rechazar la solicitud: ' + error.message); return; }
  logNotification(repOpenRequest.contact_email, 'Tu solicitud fue rechazada', `Motivo: ${reason}.${msg? ' Nota del representante: '+msg:''} Puedes elegir otro representante desde la plataforma.`);
  $('repForm').innerHTML = `<div class="banner" style="background:var(--danger-soft); border-color:var(--danger); color:#7A241F;">✗ Rechazaste la solicitud (${reason}). El cliente fue notificado y puede elegir otro representante.</div>`;
  repOpenRequest = null;
  renderRepQueue();
}

// ---------------------------------------------------------------------
// PORTAL DEL REPRESENTANTE: control de estados del envío ya pagado
// ---------------------------------------------------------------------
function renderRepShipmentPanel(){
  const box = $('repShipmentPanel');
  if(!box) return;
  if(!state.paid){
    box.innerHTML = `<div class="eyebrow" style="margin-top:28px;">Pedido en curso</div><div class="hint">Aún no hay pedidos pagados para actualizar — aparecerán aquí apenas el cliente confirme el pago.</div>`;
    return;
  }
  const idx = Math.max(state.tlCurrentIndex, 0);
  const isLast = idx >= TL_STEPS.length-1;
  box.innerHTML = `
    <div class="eyebrow" style="margin-top:28px;">Pedido pagado</div>
    <div class="page-title" style="font-size:18px; margin-bottom:14px;">Actualizar estado del envío ${state.requestId||''}</div>
    <div class="card">
      <div class="hint" style="margin-top:0;">Etapa actual: <b>${TL_STEPS[idx].title}</b></div>
      ${isLast ? `<div class="banner">✓ Este pedido ya llegó a su etapa final.</div>` : `
      <label class="field-label" style="margin-top:10px;">Nota para el cliente sobre la siguiente etapa (${TL_STEPS[idx+1].title})</label>
      <textarea id="rep_stage_note" rows="2" placeholder="${TL_STEPS[idx+1].desc}"></textarea>
      <label class="field-label" style="margin-top:10px;">Adjuntar fotos o archivos para el cliente (opcional)</label>
      <input type="file" id="rep_stage_files" accept="image/*,.pdf,.doc,.docx" multiple>
      <div id="rep_stage_files_preview" class="hint" style="margin-top:6px;"></div>
      <button class="btn btn-primary" style="margin-top:10px;" onclick="repAdvanceStage()" id="repAdvanceBtn">Marcar "${TL_STEPS[idx+1].title}" y notificar al cliente</button>
      `}
    </div>
  `;
  const fileInput = $('rep_stage_files');
  if(fileInput){
    fileInput.addEventListener('change', ()=>{
      $('rep_stage_files_preview').textContent = fileInput.files.length
        ? `${fileInput.files.length} archivo(s) listos para adjuntar: ${Array.from(fileInput.files).map(f=>f.name).join(', ')}`
        : '';
    });
  }
}
function readFilesAsData(fileList){
  const files = Array.from(fileList || []);
  return Promise.all(files.map(file => new Promise(resolve=>{
    const reader = new FileReader();
    reader.onload = () => resolve({ name:file.name, dataUrl:reader.result, isImage: file.type.startsWith('image/') });
    reader.readAsDataURL(file);
  })));
}
function repAdvanceStage(){
  const noteInput = $('rep_stage_note');
  const note = noteInput ? noteInput.value.trim() : '';
  const fileInput = $('rep_stage_files');
  const btn = $('repAdvanceBtn');
  if(btn){ btn.disabled = true; btn.textContent = 'Enviando…'; }
  readFilesAsData(fileInput ? fileInput.files : []).then(files=>{
    const nextIdx = Math.min((state.tlCurrentIndex<0?0:state.tlCurrentIndex)+1, TL_STEPS.length-1);
    if(note) state.tlNotes[nextIdx] = note;
    if(files.length) state.tlFiles[nextIdx] = files;
    state.tlCurrentIndex = nextIdx;
    logNotification(state.contactEmail || state.accountEmail, `Actualización de tu envío: ${TL_STEPS[nextIdx].title}`, note || TL_STEPS[nextIdx].desc);
    renderRepShipmentPanel();
  });
}

// ---------------------------------------------------------------------
// STEPPER
// ---------------------------------------------------------------------
const STEPS = ['Perfil','Socios','Cotización','Pago y envío'];
function renderStepper(){
  $('stepper').innerHTML = STEPS.map((label,i)=>{
    let cls = i===0 ? 'current' : '';
    if(i < currentScreen()) cls = 'done';
    if(i === currentScreen()) cls = 'current';
    if(i > state.maxReached) cls += ' disabled';
    const needsLock = i===3 && !state.loggedIn && state.maxReached < 3;
    if(needsLock) cls += ' locked';
    const circleContent = i < currentScreen() ? '✓' : needsLock ? '🔒' : i+1;
    return `
    <div class="step-node ${cls}" onclick="tryGoTo(${i})">
      <div class="step-line"></div>
      <div class="step-circle">${circleContent}</div>
      <div class="step-label">${label}</div>
    </div>`;
  }).join('');
}
function currentScreen(){
  const el = document.querySelector('.screen.active');
  return el ? parseInt(el.dataset.screen) : 0;
}
function tryGoTo(i){
  if(i <= state.maxReached) goTo(i);
}
function goTo(i){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelector(`.screen[data-screen="${i}"]`).classList.add('active');
  state.maxReached = Math.max(state.maxReached, i);
  renderStepper();
  if(i===3){
    renderTrmAlert();
    renderBankAccountCard();
    if(state.paid) renderTimeline(state.tlCurrentIndex);
  }
  window.scrollTo({top:0, behavior:'smooth'});
}
function renderTrmAlert(){
  const box = $('trmAlert');
  if(!box) return;
  if(!state.trmAtQuote){ box.innerHTML = ''; return; }
  if(state.priceLocked){
    box.innerHTML = `<div class="banner" style="margin-bottom:14px;">🧊 Congelaste tu cotización — el total no cambia aunque la TRM o el flete hayan variado desde que cotizaste.</div>`;
    return;
  }
  const trmNow = state.trmAtQuote * 1.023;
  const totalUsd = state.lastQuote ? state.lastQuote.total : 0;
  const copAtQuote = totalUsd * state.trmAtQuote;
  const copNow = totalUsd * trmNow;
  box.innerHTML = `
    <div class="info-note" style="margin-top:0; margin-bottom:14px;">
      <b>La TRM subió desde que cotizaste:</b> $${state.trmAtQuote.toLocaleString('es-CO')} → $${trmNow.toLocaleString('es-CO',{maximumFractionDigits:0})} (+2.3%). Tu pedido sigue costando ${fmtUsd(totalUsd)}, pero en pesos pasó de ~$${Math.round(copAtQuote).toLocaleString('es-CO')} a ~$${Math.round(copNow).toLocaleString('es-CO')}. Si vas a pagar en pesos, hazlo cuanto antes o pregúntale a tu representante si puedes fijar la tasa del día de la cotización.
    </div>
  `;
}
renderStepper();

// ---------------------------------------------------------------------
// STEP 1: PERFIL
// ---------------------------------------------------------------------
const STATUS_OPTS = [
  { v:'sinRutNoQuiere', t:'No tengo RUT de importador y prefiero no tramitarlo', d:'No has hecho el trámite ante la DIAN para esto, y no te interesa ocuparte de eso por ahora.' },
  { v:'sinRutDispuesto', t:'No tengo RUT de importador, pero estoy dispuesto a sacarlo', d:'Se puede tramitar como persona natural — no hace falta crear una empresa para esto.' },
  { v:'conRutImportador', t:'Ya tengo RUT con actividad de importador', d:'Ya hiciste el trámite que te habilita a declarar tú mismo ante la DIAN (como persona natural o con tu empresa).' },
  { v:'empresaImporta', t:'Tengo una empresa que ya importa', d:'Tu empresa ya tiene el trámite resuelto y ha importado antes.' }
];
function renderStatusChoices(){
  $('statusChoices').innerHTML = STATUS_OPTS.map(o=>`
    <div class="choice ${o.v===state.status?'active':''}" data-v="${o.v}" onclick="setStatus('${o.v}')">
      <div class="radio"></div>
      <div class="choice-body"><h4>${o.t}</h4><p>${o.d}</p></div>
    </div>`).join('');
}
function setStatus(v){ state.status = v; renderStatusChoices(); }
renderStatusChoices();

const PERMITS = {
  'Repuestos / autopartes': { entity:null, note:'No suele requerir permiso previo, salvo homologación puntual para ciertos vehículos. Aun así, tu agencia de aduanas debe confirmar la subpartida exacta.' },
  'Farma / dispositivos médicos': { entity:'INVIMA', note:'Necesitas registro sanitario INVIMA antes de que la mercancía salga del país de origen. Sin este trámite, la carga puede quedar retenida en aduana.' },
  'Textil / confección': { entity:'Reglamento técnico de etiquetado', note:'Colombia exige etiquetado de composición e instrucciones de cuidado en español — revisa esto con tu representante antes de producir el empaque.' },
  'Calzado / marroquinería': { entity:'Reglamento técnico de etiquetado', note:'Igual que en textiles, se exige etiquetado en español con composición y país de origen — verifica el arancel, que puede ser más alto que en otras categorías.' },
  'Electrónica / tecnología': { entity:'RETIE / homologación CRC', note:'Productos eléctricos requieren certificado RETIE, y equipos con radiofrecuencia (Bluetooth, WiFi) necesitan homologación ante la CRC.' },
  'Juguetes': { entity:'Reglamento técnico de seguridad de juguetes', note:'Se exige certificado de conformidad con la norma de seguridad de juguetes antes de nacionalizar — pídeselo a tu proveedor o gestiónalo con tu representante.' },
  'Cosméticos / cuidado personal': { entity:'INVIMA (Notificación Sanitaria)', note:'Necesitas Notificación Sanitaria Obligatoria de Cosméticos (NSOC) ante el INVIMA antes de comercializarlos en Colombia.' },
  'Alimentos / suplementos': { entity:'INVIMA', note:'Necesitas registro o permiso sanitario de alimentos del INVIMA antes de que la mercancía salga del país de origen — es de los trámites más estrictos, sin este documento la carga queda retenida.' },
  'Hogar / ferretería': { entity:'ICA (si aplica)', note:'La mayoría no requiere permiso previo, pero si el producto tiene componente agrícola u orgánico, el ICA puede exigir uno.' },
  'Muebles / decoración': { entity:'ICA (si es de madera)', note:'Los muebles de madera suelen requerir certificado fitosanitario del ICA y tratamiento de embalaje (NIMF-15) — confírmalo con tu representante antes de producir.' },
  'Maquinaria / equipos industriales': { entity:'RETIE (si es eléctrica)', note:'Si el equipo funciona con electricidad necesita certificado RETIE. La maquinaria usada puede además requerir una licencia de importación previa — verifica con tu agencia de aduanas.' },
  'Joyería / bisutería': { entity:null, note:'No suele requerir permiso previo, pero declara el material real (oro, plata, bisutería) porque el arancel varía mucho según de qué esté hecha la pieza.' },
  'Otro': { entity:null, note:'Pídele a tu representante que verifique en la VUCE (Ventanilla Única de Comercio Exterior) si tu producto necesita un permiso previo antes de comprar.' }
};
function renderPermitsCard(){
  const cat = $('p_cat').value;
  const p = PERMITS[cat];
  const box = $('permitsCard');
  if(p.entity){
    box.innerHTML = `<div class="info-note" style="margin-top:0;"><b>Permiso previo probable: ${p.entity}.</b> ${p.note} Este trámite se gestiona en la <b>VUCE</b> antes de que el proveedor despache la mercancía.</div>`;
  } else {
    box.innerHTML = `<div class="hint" style="margin-top:0;">${p.note}</div>`;
  }
}
renderPermitsCard();

const SUPPLIER_OPTS = [
  { v:'yes', t:'Sí, ya sé quién me lo vende', d:'Ya tienes un contacto, fábrica o tienda que te puede vender el producto.' },
  { v:'no', t:'Todavía no — solo sé qué quiero traer', d:'Tienes la idea del producto, pero no un proveedor confirmado. Te ayudamos con esto.' }
];
function renderSupplierChoices(){
  $('supplierChoices').innerHTML = SUPPLIER_OPTS.map(o=>`
    <div class="choice ${o.v===state.hasSupplier?'active':''}" data-v="${o.v}" onclick="setSupplier('${o.v}')">
      <div class="radio"></div>
      <div class="choice-body"><h4>${o.t}</h4><p>${o.d}</p></div>
    </div>`).join('');
  renderSupplierGuide();
}
function renderSupplierGuide(){
  const box = $('supplierGuide');
  if(!box) return;
  if(state.hasSupplier === 'no'){
    box.innerHTML = `
      <div class="info-note" style="margin-top:12px;">
        <b>No hay problema — así empieza casi todo el mundo.</b> Muchas personas buscan proveedores en plataformas como <b>Alibaba</b>, <b>1688.com</b>, <b>Made-in-China</b> o <b>Global Sources</b>, escribiendo el nombre del producto en inglés. Si prefieres no hacerlo tú mismo, más adelante puedes pedirle a tu representante que te ayude a buscar y validar un proveedor como parte de tu cotización.
      </div>
    `;
  } else {
    box.innerHTML = '';
  }
}
function setSupplier(v){ state.hasSupplier = v; renderSupplierChoices(); }
renderSupplierChoices();

// Camino A: el cliente importa a su propio nombre (con RUT de importador,
// que puede ser como persona natural, sin crear empresa). Camino B: un
// trading company ya importó y nacionalizó, y le vende al cliente como
// una compra local normal — el cliente no necesita ningún trámite.
const CAMINO_INFO = {
  A: {
    title: 'Camino A — Importar a tu nombre',
    desc: 'Tú eres el importador, con tu propio RUT (puede ser como persona natural, sin crear una empresa). Te da más control y mejor margen, pero implica el trámite: RUT, declaración ante la DIAN, y —si tu FOB supera USD 1.000— una agencia de aduanas obligatoria por ley.',
    step2: { title:'Elige tu agencia de aduanas y/o agente de sourcing', sub:'Vas a importar a tu nombre. Necesitas una agencia de aduanas para la declaración ante la DIAN, y si quieres ayuda negociando con el proveedor, un agente de sourcing aparte — son roles distintos por norma.' }
  },
  B: {
    title: 'Camino B — Comprar ya nacionalizada',
    desc: 'Un trading company importa y nacionaliza la mercancía a su nombre, y te la vende dentro de Colombia con factura de compra normal. No necesitas RUT de importador ni ningún trámite — legalmente es una compra nacional. A cambio, pagas un poco más (el margen del trading company).',
    step2: { title:'Elige tu trading company', sub:'Estas empresas ya importan y nacionalizan por su cuenta — te venden el producto nacionalizado, sin que tengas que tramitar nada.' }
  }
};
// Los umbrales de FOB (agencia de aduanas obligatoria, límites de courier)
// están confirmados con norma vigente, pero la DIAN o el Gobierno pueden
// cambiarlos — este texto se repite donde se mencionan para no prometer
// un número que después deje de ser cierto.
const REGULATORY_THRESHOLD_NOTE = 'Estos umbrales están vigentes hoy, pero pueden cambiar por decisión de la DIAN o el Gobierno.';
function decideCamino(){
  const status = state.status;
  if(status === 'sinRutNoQuiere') return 'B';
  if(status === 'sinRutDispuesto') return 'ambos';
  return 'A'; // conRutImportador o empresaImporta
}
function renderProfileResult(){
  const status = state.status, value = $('p_value').value, cat = $('p_cat').value;
  const recommendation = decideCamino();
  const box = $('profileResult');
  box.style.display = 'block';

  if(recommendation === 'ambos'){
    box.innerHTML = `
      <div class="card" style="border-color:var(--ink);">
        <span class="pill pill-warn">Tu caso admite dos caminos</span>
        <div class="section-title" style="margin-top:8px;">Puedes elegir cómo traer ${cat.toLowerCase()}</div>
        <p class="hint" style="margin-top:0;">No hay una única respuesta correcta — depende de si prefieres más control (y mejor margen) a cambio de un trámite propio, o cero papeleo a cambio de pagar un poco más.</p>
      </div>
      <div class="grid" style="margin-bottom:16px;">
        <div class="card">
          <div class="section-title">${CAMINO_INFO.A.title}</div>
          <p style="font-size:13px; color:var(--ink-soft); line-height:1.6;">${CAMINO_INFO.A.desc}</p>
          <p class="hint" style="margin-top:0; font-size:11px;">${REGULATORY_THRESHOLD_NOTE}</p>
          <button class="btn btn-outline btn-block" onclick="continueFromProfile('A')">Elegir Camino A →</button>
        </div>
        <div class="card">
          <div class="section-title">${CAMINO_INFO.B.title}</div>
          <p style="font-size:13px; color:var(--ink-soft); line-height:1.6;">${CAMINO_INFO.B.desc}</p>
          <button class="btn btn-outline btn-block" onclick="continueFromProfile('B')">Elegir Camino B →</button>
        </div>
      </div>
    `;
  } else {
    const info = CAMINO_INFO[recommendation];
    let extraNote = '';
    if(recommendation === 'A' && value === 'v1'){
      extraNote = '<div class="hint" style="margin-top:10px;">Con un valor FOB bajo (menos de USD 1.000), la ley no te exige usar una agencia de aduanas — podrías declarar tú mismo. Aun así, muchos prefieren apoyarse en un agente de sourcing para la parte de negociar con el proveedor.</div>';
    } else if(recommendation === 'A' && status === 'empresaImporta' && (value==='v2' || value==='v3')){
      extraNote = '<div class="hint" style="margin-top:10px;">Como tu volumen todavía no llega a un contenedor completo, te conviene comparar agencias por su capacidad de consolidar carga (LCL) con otros importadores de tu misma ruta, no solo por precio.</div>';
    }
    box.innerHTML = `
      <div class="card" style="border-color:var(--ink); background:var(--lime-tint);">
        <span class="pill pill-recommend">Recomendado</span>
        <div class="section-title" style="margin-top:8px;">${info.title}</div>
        <p style="font-size:13px; color:var(--ink-soft); line-height:1.6; margin:0 0 6px;">Para importar <b>${cat.toLowerCase()}</b>. ${info.desc}</p>
        ${recommendation==='A' ? `<p class="hint" style="margin-top:0; font-size:11px;">${REGULATORY_THRESHOLD_NOTE}</p>` : ''}
        ${extraNote}
        <button class="btn btn-primary btn-block" style="margin-top:14px;" onclick="continueFromProfile('${recommendation}')">Continuar →</button>
      </div>
    `;
  }
  box.scrollIntoView({behavior:'smooth', block:'nearest'});
}
async function continueFromProfile(camino){
  state.path = camino;
  const info = CAMINO_INFO[camino];
  $('step2Title').textContent = info.step2.title;
  $('step2Sub').textContent = info.step2.sub;
  renderCompanyBanner();
  goTo(1);
  $('repFilters').innerHTML = '';
  if(camino === 'B'){
    $('repList').innerHTML = `<div class="waiting-box"><div class="dot-spinner"><span></span><span></span><span></span></div>Cargando catálogo…</div>`;
    await Promise.all([loadRepresentatives(), loadProducts()]);
    renderCatalog();
    return;
  }
  $('repList').innerHTML = `<div class="waiting-box"><div class="dot-spinner"><span></span><span></span><span></span></div>Cargando representantes…</div>`;
  await loadRepresentatives();
  renderFilters();
  renderReps();
}
function renderCompanyBanner(){
  $('companyBanner').style.display = (state.status==='empresaImporta') ? 'block' : 'none';
}

// ---------------------------------------------------------------------
// STEP 2: SOCIOS (marketplace — labels change by path)
// ---------------------------------------------------------------------
// Antes había aquí dos listas de representantes inventados (REPS_A / REPS_B).
// Ahora se cargan de verdad desde Supabase — ver loadRepresentatives() más abajo.
let allReps = [];
let compareSelection = [];
let activeFilter = 'Todos';

function mapRepFromDb(r){
  const typeLabels = { agencia_aduanas:'Agencia de aduanas', agente_sourcing:'Agente de sourcing', agente_carga:'Agente de carga / freight forwarder', trading_company:'Trading company / comercializadora' };
  const commission = r.commission_type === 'flat'
    ? `USD ${r.commission_value ?? 0} flat`
    : `${r.commission_value ?? 1}% del FOB`;
  return {
    id: r.id,
    name: r.business_name || 'Representante',
    type: typeLabels[r.rep_type] || r.rep_type,
    repType: r.rep_type,
    init: (r.business_name || '??').replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ ]/g,'').trim().split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase() || '??',
    tags: (r.categories && r.categories.length) ? r.categories : ['General'],
    ops: `${r.operations_count || 0} operaciones`,
    rating: r.rating ? Number(r.rating).toFixed(1) : 'Nuevo',
    response: '< 24h',
    commission,
    feeType: r.commission_type || 'pct',
    feeValue: r.commission_value ?? 1,
    bank: r.bank_entity ? { entity:r.bank_entity, accType:r.bank_account_type, last4:r.bank_last4, verifiedDate:r.bank_verified_date } : null,
    verificationStatus: r.verification_status || {}
  };
}
async function loadRepresentatives(){
  if(!supabaseClient){ allReps = []; return; }
  const { data, error } = await supabaseClient
    .from('representatives')
    .select('*')
    .eq('available', true);
  if(error){ console.error('No se pudieron cargar los representantes:', error); allReps = []; return; }
  allReps = (data || []).map(mapRepFromDb);
}

// ---------------------------------------------------------------------
// CAMINO B: catálogo de productos ya nacionalizados (trading companies)
// ---------------------------------------------------------------------
let allProducts = [];
async function loadProducts(){
  if(!supabaseClient){ allProducts = []; return; }
  const { data, error } = await supabaseClient
    .from('products')
    .select('*, representatives(id, business_name, rating, available)')
    .eq('active', true);
  if(error){ console.error('No se pudieron cargar los productos del catálogo:', error); allProducts = []; return; }
  allProducts = (data || [])
    .filter(p => p.representatives && p.representatives.available)
    .map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      priceUsd: Number(p.price_usd) || 0,
      unit: p.unit || 'unidad',
      stock: p.stock,
      representativeId: p.representative_id,
      businessName: p.representatives.business_name || 'Trading company',
      rating: p.representatives.rating ? Number(p.representatives.rating).toFixed(1) : 'Nuevo'
    }));
}
function renderCatalog(){
  if(allProducts.length === 0){
    $('repList').innerHTML = `<div class="banner">Todavía no hay productos reales publicados en el catálogo de trading companies. Cuando se registren y publiquen productos, van a aparecer aquí automáticamente.</div>`;
    return;
  }
  $('repList').innerHTML = allProducts.map(p=>{
    const init = (p.businessName || '??').replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ ]/g,'').trim().split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase() || '??';
    return `
    <div class="rep-card">
      <div class="rep-top">
        <div class="rep-avatar">${init}</div>
        <div style="flex:1;">
          <div class="rep-name">${p.name}</div>
          <div class="rep-type">Vendido por ${p.businessName}</div>
          <span class="pill pill-ok">✓ Ya nacionalizado</span>
        </div>
      </div>
      ${p.description ? `<p class="hint" style="margin:8px 0 0;">${p.description}</p>` : ''}
      <div class="rep-meta-row">
        <span>⭐ ${p.rating}</span><span>${fmtUsd(p.priceUsd)} / ${p.unit}</span>${p.stock!=null ? `<span>${p.stock} disponibles</span>` : ''}
      </div>
      <div class="rep-actions">
        <button class="btn btn-primary btn-sm" onclick="chooseProduct('${p.id}')">Pedir este producto</button>
      </div>
    </div>
  `;
  }).join('');
}
function chooseProduct(id){
  const p = allProducts.find(x=>x.id===id);
  if(!p) return;
  state.selectedProduct = p;
  state.selectedRepId = p.representativeId;
  state.compareMode = false;
  $('quoteRepName').textContent = p.businessName;
  goTo(2);
  renderCatalogOrderForm();
}
function renderCatalogOrderForm(){
  const p = state.selectedProduct;
  $('sourcingBlock').style.display = 'none';
  $('quoteFormBlock').style.display = 'none';
  $('quoteResult').style.display = 'none';
  const box = $('catalogOrderBlock');
  box.style.display = 'block';
  box.innerHTML = `
    <div class="card">
      <div class="section-title">${p.name}</div>
      <p class="hint" style="margin-top:0;">Vendido y despachado por <b>${p.businessName}</b> — ya nacionalizado, listo para entregar dentro de Colombia. No necesitas RUT ni ningún trámite de importación para este pedido.</p>
      ${p.description ? `<p style="font-size:13px; color:var(--ink-soft); line-height:1.6;">${p.description}</p>` : ''}
      <div class="line-item"><span class="lbl">Precio por ${p.unit}</span><span class="val">${fmtUsd(p.priceUsd)}</span></div>
      ${p.stock!=null ? `<div class="line-item"><span class="lbl">Disponibles</span><span class="val">${p.stock}</span></div>` : ''}
      <label class="field-label" style="margin-top:12px;">¿Cuántas unidades quieres pedir?</label>
      <input type="number" id="cat_qty" min="1" value="1" oninput="updateCatalogTotal()">
      <div id="catalogTotalPreview" class="hint" style="margin-top:10px; font-weight:700; color:var(--ink);"></div>
      <button class="btn btn-primary btn-block" style="margin-top:14px;" onclick="generateCatalogOrder()">Generar pedido</button>
    </div>
  `;
  updateCatalogTotal();
}
function updateCatalogTotal(){
  const p = state.selectedProduct;
  if(!p) return;
  const qty = parseInt($('cat_qty').value) || 0;
  const total = p.priceUsd * qty;
  $('catalogTotalPreview').textContent = qty>0 ? `Total: ${fmtUsd(total)}  (${fmtUsd(p.priceUsd)} × ${qty})` : 'Ingresa una cantidad válida.';
}
function generateCatalogOrder(){
  const p = state.selectedProduct;
  const qty = parseInt($('cat_qty').value) || 0;
  if(!p || qty<=0){ alert('Ingresa una cantidad válida.'); return; }
  const total = p.priceUsd * qty;
  const q = { total, fob: total, unitPrice: p.priceUsd, qty, kind:'catalog' };
  state.lastQuote = q;
  state.preliminaryQuote = q;
  $('quoteResult').style.display = 'block';
  $('quoteResult').innerHTML = `
    <div class="card">
      <div class="quote-stage-label">
        <span class="pill pill-warn">Precio de catálogo</span>
        <span class="hint" style="margin:0;">Fijado por ${p.businessName}</span>
      </div>
      <div class="section-title">${p.name}</div>
      <div class="line-item"><span class="lbl">Precio por ${p.unit}</span><span class="val">${fmtUsd(p.priceUsd)}</span></div>
      <div class="line-item"><span class="lbl">Cantidad</span><span class="val">${qty}</span></div>
      <div class="line-item total"><span class="lbl">Total (ya nacionalizado)</span><span class="val">${fmtUsd(total)}</span></div>
      <div class="hint">Este precio ya incluye la nacionalización — ${p.businessName} solo debe confirmar que tiene stock disponible para tu pedido.</div>
      <div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="sendToRepForConfirmation()">Enviar a <span id="quoteRepNameInline">${p.businessName}</span> para confirmar</button>
        <button class="btn btn-outline" onclick="generateCatalogOrder()">Ajustar cantidad</button>
      </div>
    </div>
  `;
  $('quoteResult').scrollIntoView({behavior:'smooth', block:'nearest'});
}

// "Mis pedidos anteriores" solo tiene sentido con cuenta — un invitado no
// tiene un client_id estable de una visita a otra, así que no hay de dónde
// sacarle un historial real. Se oculta la tarjeta completa hasta que hay
// sesión (ver updateHistoryCardVisibility, llamada al entrar/loguearse).
function updateHistoryCardVisibility(){
  const card = $('historyCard');
  if(!card) return;
  card.style.display = state.loggedIn ? 'flex' : 'none';
  if(!state.loggedIn){ $('historyPanel').style.display = 'none'; }
}
let pastOrders = [];
async function toggleHistory(){
  const panel = $('historyPanel');
  if(panel.style.display === 'block'){ panel.style.display='none'; return; }
  panel.style.display = 'block';
  if(!supabaseClient || !state.accountId){
    panel.innerHTML = `<div class="hint" style="margin-top:8px;">No se pudo cargar tu historial ahora mismo.</div>`;
    return;
  }
  panel.innerHTML = `<div class="hint" style="margin-top:8px;">Cargando…</div>`;
  const { data, error } = await supabaseClient
    .from('quote_requests')
    .select('*')
    .eq('client_id', state.accountId)
    .eq('status', 'accepted')
    .order('created_at', { ascending:false })
    .limit(10);
  if(error){
    panel.innerHTML = `<div class="hint" style="margin-top:8px;">No se pudo cargar tu historial: ${error.message}</div>`;
    return;
  }
  pastOrders = data || [];
  if(pastOrders.length === 0){
    panel.innerHTML = `<div class="hint" style="margin-top:8px;">Todavía no tienes pedidos aceptados — aparecerán aquí cuando completes tu primera importación.</div>`;
    return;
  }
  panel.innerHTML = pastOrders.map(o=>{
    const q = o.confirmed_quote || o.preliminary_quote || {};
    const total = q.total || o.fob_usd || 0;
    return `
    <div class="card tight" style="margin-top:8px;">
      <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
        <div>
          <div style="font-weight:700; font-size:13px;">${o.product_name || 'Pedido'}</div>
          <div class="hint" style="margin:2px 0 0;">${new Date(o.created_at).toLocaleDateString('es-CO',{day:'numeric',month:'short',year:'numeric'})} · ${o.quantity||0} u · total ${fmtUsd(total)}</div>
        </div>
        <button class="btn btn-outline btn-sm" onclick="reorderPast('${o.id}')">Volver a pedir</button>
      </div>
    </div>
  `;
  }).join('');
}
async function reorderPast(id){
  const o = pastOrders.find(x=>x.id===id);
  if(!o) return;
  if(o.product_id){
    alert('Ese pedido fue del catálogo de una trading company — entra por Camino B y búscalo de nuevo en su catálogo actual, ya que el precio pudo cambiar.');
    return;
  }
  if(allReps.length === 0) await loadRepresentatives();
  state.path = 'A';
  const rep = repById(o.representative_id);
  if(!rep){
    alert('El representante de ese pedido ya no está disponible en la plataforma.');
    return;
  }
  chooseRep(rep.id);
  $('q_prod').value = o.product_name || '';
  $('q_qty').value = o.quantity || 0;
  $('q_fob').value = o.fob_usd || 0;
  $('q_weight').value = o.weight_kg || 0;
  $('q_cbm').value = o.volume_cbm || 0;
  $('q_boxes').value = o.boxes || 0;
  renderModeRecommend();
  if(o.verification_level){
    document.querySelectorAll('#quoteFormBlock .card:nth-of-type(2) .choice').forEach(c=>c.classList.remove('active'));
    const el = document.querySelector(`#quoteFormBlock .card:nth-of-type(2) .choice[data-v="${o.verification_level}"]`);
    if(el) el.classList.add('active');
  }
  generateQuote();
}
function currentReps(){
  return state.path==='B'
    ? allReps.filter(r=>r.repType==='trading_company')
    : allReps.filter(r=>r.repType==='agencia_aduanas' || r.repType==='agente_sourcing' || r.repType==='agente_carga');
}
function allTags(){ return ['Todos', ...new Set(currentReps().flatMap(r=>r.tags))]; }
function renderFilters(){
  $('repFilters').innerHTML = allTags().map(f=>`
    <div class="filter-chip ${f===activeFilter?'active':''}" onclick="setFilter('${f}')">${f}</div>
  `).join('');
}
function setFilter(f){ activeFilter=f; renderFilters(); renderReps(); }
function renderReps(){
  const list = currentReps().filter(r=> activeFilter==='Todos' || r.tags.includes(activeFilter));
  const actionLabel = state.path==='B' ? 'Pedir este producto' : 'Cotizar con este representante';
  if(list.length === 0){
    $('repList').innerHTML = `<div class="banner">Todavía no hay ${state.path==='B' ? 'trading companies' : 'representantes'} reales registrados en la plataforma para este camino. Cuando se registren y queden disponibles, van a aparecer aquí automáticamente.</div>`;
    renderCompareBar();
    return;
  }
  $('repList').innerHTML = list.map(r=>{
    const steps = VERIF_STEPS_BY_TYPE[r.repType] || [];
    const allVerified = steps.length>0 && steps.every(s=>r.verificationStatus[s.k]);
    return `
    <div class="rep-card">
      <div class="rep-top">
        <div class="rep-avatar">${r.init}</div>
        <div style="flex:1;">
          <div class="rep-name">${r.name}</div>
          <div class="rep-type">${r.type}</div>
          <span class="pill ${allVerified?'pill-ok':'pill-warn'}">${allVerified?'✓ Verificado':'⏳ En validación'}</span>
          <details style="margin-top:6px;">
            <summary style="font-size:11.5px; color:var(--ink-soft); cursor:pointer; text-decoration:underline;">¿Qué verificamos?</summary>
            <p class="hint" style="margin-top:6px;">Identidad legal, ${r.repType==='agencia_aduanas' ? 'licencia de agencia de aduanas vigente ante la DIAN' : r.repType==='trading_company' ? 'RUT con registro de importador activo' : 'antecedentes comerciales'}, titularidad de su cuenta bancaria y antecedentes en listas restrictivas.${r.bank ? ' Última reverificación: '+r.bank.verifiedDate+'.' : ' Aún en proceso de verificación.'}</p>
          </details>
        </div>
      </div>
      <div class="rep-meta-row">
        <span>⭐ ${r.rating}</span><span>${r.ops}</span><span>resp. ${r.response}</span><span>${r.commission}</span>
      </div>
      <div class="rep-actions">
        <button class="btn btn-outline btn-sm" onclick="openChat('${r.id}')">Conversar</button>
        <button class="btn btn-primary btn-sm" onclick="chooseRep('${r.id}')">${actionLabel}</button>
      </div>
      <label style="display:flex; align-items:center; gap:6px; margin-top:10px; font-size:12px; color:var(--ink-soft); cursor:pointer;">
        <input type="checkbox" style="width:auto;" ${compareSelection.includes(r.id)?'checked':''} onchange="toggleCompare('${r.id}', this.checked)">
        Comparar cotización con otros
      </label>
    </div>
  `;
  }).join('') + `<div id="compareBarSpacer" style="height:${compareSelection.length>=2?'56px':'0'};"></div>`;
  renderCompareBar();
}
function toggleCompare(id, checked){
  if(checked){ if(!compareSelection.includes(id)) compareSelection.push(id); }
  else{ compareSelection = compareSelection.filter(x=>x!==id); }
  renderReps();
}
function renderCompareBar(){
  let bar = document.getElementById('compareBar');
  if(compareSelection.length < 2){
    if(bar) bar.remove();
    return;
  }
  if(!bar){
    bar = document.createElement('div');
    bar.id = 'compareBar';
    bar.style.cssText = 'position:fixed; bottom:14px; left:16px; right:16px; max-width:648px; margin:0 auto; background:var(--ink); color:#fff; border-radius:12px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; gap:10px; z-index:20; box-shadow:0 8px 24px rgba(0,0,0,0.18);';
    document.body.appendChild(bar);
  }
  bar.innerHTML = `<span style="font-size:13px; font-weight:600;">${compareSelection.length} seleccionados para comparar</span>
    <button class="btn btn-primary btn-sm" onclick="goToCompare()">Comparar cotizaciones →</button>`;
}
function goToCompare(){
  $('quoteRepName').textContent = compareSelection.map(id=>repById(id).name).join(' vs ');
  $('sourcingBlock').style.display = state.hasSupplier==='no' ? 'block' : 'none';
  $('quoteFormBlock').style.display = state.hasSupplier==='no' ? 'none' : 'block';
  state.compareMode = true;
  goTo(2);
  $('generateQuoteBtn').textContent = 'Generar comparación';
}
function repById(id){ return currentReps().find(r=>r.id===id); }
function openChat(id){
  const r = repById(id);
  const panel = $('chatPanel');
  panel.innerHTML = `
    <div class="chat-box">
      <div class="chat-head">${r.name} <span class="pill pill-ok">✓ Verificado</span></div>
      <div class="chat-thread" id="chatThread">
        <div class="msg them">Hola, gracias por escribir 👋 Cuéntame qué producto quieres importar y desde qué país.</div>
      </div>
      <div class="chat-input-row">
        <input type="text" id="chatInput" placeholder="Escribe tu mensaje...">
        <button class="btn btn-primary btn-sm" onclick="sendMsg()">Enviar</button>
      </div>
    </div>
  `;
  panel.scrollIntoView({behavior:'smooth', block:'nearest'});
}
function sendMsg(){
  const input = $('chatInput');
  const val = input.value.trim();
  if(!val) return;
  const thread = $('chatThread');
  thread.insertAdjacentHTML('beforeend', `<div class="msg me">${val}</div>`);
  input.value = '';
  thread.scrollTop = thread.scrollHeight;
  setTimeout(()=>{
    thread.insertAdjacentHTML('beforeend', `<div class="msg them">Perfecto, con eso puedo armar tu cotización dentro de la plataforma. Cuando quieras, dale a "Cotizar" y seguimos desde ahí.</div>`);
    thread.scrollTop = thread.scrollHeight;
  }, 700);
}
function chooseRep(id){
  state.selectedRepId = id;
  state.compareMode = false;
  const r = repById(id);
  $('quoteRepName').textContent = r.name;
  $('catalogOrderBlock').style.display = 'none';
  $('sourcingBlock').style.display = state.hasSupplier==='no' ? 'block' : 'none';
  $('quoteFormBlock').style.display = state.hasSupplier==='no' ? 'none' : 'block';
  goTo(2);
  $('generateQuoteBtn').textContent = 'Generar cotización preliminar';
}

// ---------------------------------------------------------------------
// STEP 3: SOURCING (si no tiene proveedor)
// ---------------------------------------------------------------------
function requestSourcing(){
  $('sourcingStatus').innerHTML = `Solicitud enviada. ${$('quoteRepName') ? $('quoteRepName').textContent : 'Tu contacto'} suele presentar entre 2 y 3 opciones de proveedor en 48 horas. Mientras tanto, puedes ir definiendo tus preferencias de ruta y verificación a continuación.`;
  $('quoteFormBlock').style.display = 'block';
  $('quoteFormBlock').scrollIntoView({behavior:'smooth', block:'nearest'});
}

// ---------------------------------------------------------------------
// STEP 3: COTIZACIÓN
// ---------------------------------------------------------------------
function toggleNoInfo(){
  const off = $('noInfoYet').checked;
  ['q_weight','q_cbm','q_boxes'].forEach(id=>{ $(id).disabled = off; $(id).style.opacity = off? .4:1; });
}
function fileAttached(input){
  if(input.files[0]){ $('fileNote').textContent = `Adjunto: ${input.files[0].name}`; state.supplierQuoteAttached = true; }
}
// ---------------------------------------------------------------------
// INCOTERM EN LENGUAJE SENCILLO
// ---------------------------------------------------------------------
const INCOTERM_INFO = {
  EXW: { name:'EXW', plain:'El proveedor solo deja el pedido listo en su fábrica', detail:'Tú (o tu representante) se encargan de recogerlo, sacarlo del país y traerlo hasta Colombia. Es la opción donde más cosas organiza tu lado.' },
  FOB: { name:'FOB', plain:'El proveedor lo lleva hasta el barco o avión en su país', detail:'De ahí en adelante, el flete, el seguro y traerlo a Colombia corren por tu cuenta (o la de tu representante). Es la opción más común.' },
  CIF: { name:'CIF', plain:'El proveedor ya paga el flete y el seguro hasta Colombia', detail:'Pero tú sigues encargándote de sacarlo de la aduana colombiana (impuestos, agente, etc.) una vez llega.' },
  DDP: { name:'DDP', plain:'El proveedor se compromete a entregarte todo en tu bodega', detail:'Es la opción con menos cosas que organizar de tu lado — casi todo el trabajo lo hace el proveedor, normalmente cuesta un poco más.' }
};
const INCOTERM_KNOWLEDGE_OPTS = [
  { v:'unknown', t:'Todavía no hemos hablado de eso con el proveedor', d:'Tranquilo, es lo más normal en una primera cotización — tu representante lo define contigo más adelante.' },
  { v:'described', t:'El proveedor me dijo algo pero no sé qué significa', d:'Cuéntanos qué te dijo (aunque sea una palabra suelta) y te ayudamos a entenderlo.' },
  { v:'known', t:'Sí, ya tengo esto claro con el proveedor', d:'Perfecto, elige abajo cuál de las 4 opciones aplica.' }
];
function renderIncotermKnowledgeChoices(){
  $('incotermKnowledgeChoices').innerHTML = INCOTERM_KNOWLEDGE_OPTS.map(o=>`
    <div class="choice ${o.v===state.incotermKnowledge?'active':''}" data-v="${o.v}" onclick="setIncotermKnowledge('${o.v}')">
      <div class="radio"></div>
      <div class="choice-body"><h4>${o.t}</h4><p>${o.d}</p></div>
    </div>`).join('');
  renderIncotermHelper();
}
function setIncotermKnowledge(v){
  state.incotermKnowledge = v;
  renderIncotermKnowledgeChoices();
}
function setIncoterm(v){
  state.incoterm = v;
  renderIncotermHelper();
}
function matchIncotermFromText(text){
  const t = text.toLowerCase();
  if(/ddp|puesto en (mi|tu|la) bodega|entrega en bodega|todo incluido|puerta a puerta/.test(t)) return 'DDP';
  if(/cif|flete y seguro incluido|paga el flete|el proveedor paga el envío/.test(t)) return 'CIF';
  if(/fob|puesto en (el )?(barco|puerto|buque|avión)|sube al barco/.test(t)) return 'FOB';
  if(/exw|en (la )?f[aá]brica|ex works|recoger en fábrica|recogida en fábrica/.test(t)) return 'EXW';
  return null;
}
function tryMatchIncoterm(){
  const text = $('incoterm_free_text').value.trim();
  const guess = matchIncotermFromText(text);
  const box = $('incotermMatchResult');
  if(!guess){
    box.innerHTML = `<div class="hint" style="margin-top:8px;">No logramos identificarlo con esas palabras — no pasa nada, tu representante lo confirma directamente con tu proveedor. Seguimos con el estimado más común (FOB) por ahora.</div>`;
    state.incoterm = 'FOB';
    return;
  }
  const info = INCOTERM_INFO[guess];
  box.innerHTML = `
    <div class="banner" style="margin-top:8px;">
      Creemos que tu proveedor se refiere a <b>${info.name}</b>: ${info.plain.toLowerCase()}. ${info.detail}
    </div>
    <button class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="confirmIncotermGuess('${guess}')">Sí, es esto</button>
    <button class="btn btn-text btn-sm" onclick="setIncotermKnowledge('unknown')">No estoy seguro, mejor que lo defina mi representante</button>
  `;
}
function confirmIncotermGuess(v){
  state.incoterm = v;
  $('incotermMatchResult').innerHTML = `<div class="banner" style="margin-top:8px;">✓ Quedó registrado como <b>${v}</b>.</div>`;
}
function renderIncotermHelper(){
  const box = $('incotermHelper');
  if(state.incotermKnowledge === 'unknown'){
    state.incoterm = state.incoterm || 'FOB';
    box.innerHTML = `<div class="banner">No te preocupes por esto todavía — para tu cotización preliminar usamos el escenario más común (el proveedor solo lo pone listo para embarcar), y tu representante lo ajusta contigo cuando hable con el proveedor.</div>`;
  } else if(state.incotermKnowledge === 'described'){
    box.innerHTML = `
      <label class="field-label">¿Qué te dijo el proveedor sobre el envío?</label>
      <input type="text" id="incoterm_free_text" placeholder="Ej. 'EXW', 'lo dejo en el puerto', 'te lo entrego en tu bodega'...">
      <button class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="tryMatchIncoterm()">Ayúdame a entenderlo</button>
      <div id="incotermMatchResult"></div>
    `;
  } else if(state.incotermKnowledge === 'known'){
    box.innerHTML = `
      <div class="choice-list">
        ${Object.values(INCOTERM_INFO).map(info=>`
          <div class="choice ${state.incoterm===info.name?'active':''}" onclick="setIncoterm('${info.name}')">
            <div class="radio"></div>
            <div class="choice-body"><h4>${info.name} — ${info.plain}</h4><p>${info.detail}</p></div>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    box.innerHTML = '';
  }
}
renderIncotermKnowledgeChoices();

function selectVerif(v){
  state.verif = v;
  document.querySelectorAll('#quoteFormBlock .card:nth-of-type(2) .choice').forEach(c=>c.classList.remove('active'));
  document.querySelector(`#quoteFormBlock .card:nth-of-type(2) .choice[data-v="${v}"]`).classList.add('active');
}
// Límites reales del régimen de courier/mensajería (los 4 se exigen juntos —
// basta con superar uno solo para que el pedido ya no califique). Las medidas
// (≤1.50 m) no se piden como dato en el formulario, así que solo se advierten
// en el texto, no se validan en código.
const COURIER_LIMITS = { fob:2000, weightKg:50, maxUnitsSameRef:6 };
function courierIsEligible(fob, weight, qty){
  return fob <= COURIER_LIMITS.fob && weight <= COURIER_LIMITS.weightKg && (qty<=0 || qty <= COURIER_LIMITS.maxUnitsSameRef);
}
// Transporte interno de referencia entre el puerto/aeropuerto de llegada y la
// ciudad final de entrega — no es lo mismo que el flete internacional, y hoy
// no se estaba cobrando nada por este tramo.
const INLAND_TABLE = {
  'Cartagena_Bogotá':380, 'Cartagena_Medellín':250, 'Cartagena_Cali':420, 'Cartagena_Barranquilla':90, 'Cartagena_Cartagena':0,
  'Buenaventura_Bogotá':320, 'Buenaventura_Medellín':300, 'Buenaventura_Cali':90, 'Buenaventura_Cartagena':450, 'Buenaventura_Buenaventura':0,
  'Barranquilla_Bogotá':400, 'Barranquilla_Medellín':300, 'Barranquilla_Cali':480, 'Barranquilla_Barranquilla':0,
  'Bogotá_Bogotá':0, 'Bogotá_Medellín':150, 'Bogotá_Cali':180, 'Bogotá_Cartagena':300
};
function updateInlandSuggestion(){
  const destPort = $('q_destPort').value;
  const finalCity = $('q_finalCity').value;
  const key = destPort + '_' + finalCity;
  const val = INLAND_TABLE[key] ?? (destPort === finalCity ? 0 : 300);
  $('q_inlandFee').value = val;
  $('routeHint').textContent = (destPort === finalCity)
    ? 'Tu ciudad final coincide con el puerto/aeropuerto de llegada — el transporte interno sugerido es bajo o $0 (retiro en puerto/aeropuerto).'
    : `Trayecto por carretera de ${destPort} a ${finalCity} — valor sugerido de referencia, ajústalo si tu representante te dio uno distinto.`;
}
updateInlandSuggestion();
function renderModeRecommend(){
  const weight = parseFloat($('q_weight').value)||0;
  const cbm = parseFloat($('q_cbm').value)||0;
  const fob = parseFloat($('q_fob').value)||0;
  const qty = parseInt($('q_qty').value)||0;
  const rates = { LCL: Math.max(cbm,1)*75, FCL: 2600, AIR: Math.max(weight,45)*9.4, COURIER: weight*12 };
  const courierOk = courierIsEligible(fob, weight, qty);
  const eligibleEntries = Object.entries(rates).filter(([k])=> k!=='COURIER' || courierOk);
  const cheapest = eligibleEntries.reduce((a,b)=> b[1]<a[1]? b:a)[0];
  const labels = { LCL:'Marítimo LCL', FCL:'Marítimo FCL', AIR:'Aéreo (carga)', COURIER:'Courier / mensajería' };
  state.mode = cheapest;
  $('modeRecommend').innerHTML = Object.entries(rates).map(([k,v])=>{
    const disabled = k==='COURIER' && !courierOk;
    return `
    <div class="choice ${!disabled && k===state.mode?'active':''}" data-mode="${k}" style="${disabled?'opacity:.5; cursor:not-allowed;':''}" onclick="${disabled?'':`pickMode('${k}')`}">
      <div class="radio"></div>
      <div class="choice-body"><h4>${labels[k]} ${!disabled && k===cheapest?'· recomendado':''}${disabled?' · no aplica a este pedido':''}</h4><p>${disabled ? 'Supera los límites del régimen de courier para este pedido' : 'Costo estimado de flete'}</p><span class="choice-price">${disabled?'—':`≈ $${v.toFixed(0)} USD`}</span></div>
    </div>
  `;
  }).join('');
  $('modeNote').textContent = `Sugerencia según ${weight} kg y ${cbm} m³ declarados. Puedes elegir otra vía si el tiempo importa más que el costo.`;
  $('courierLimitsNote').innerHTML = `<b>Courier / mensajería</b> solo aplica si se cumplen los 4 límites a la vez: FOB ≤ USD ${COURIER_LIMITS.fob.toLocaleString('en-US')}, peso ≤ ${COURIER_LIMITS.weightKg} kg, medidas ≤ 1.50 m, y máximo ${COURIER_LIMITS.maxUnitsSameRef} unidades de la misma referencia — si se supera cualquiera de los 4, ya no aplica. ${REGULATORY_THRESHOLD_NOTE}`;
  renderGroupSuggestion(cbm);
}

function renderGroupSuggestion(cbm){
  const banner = $('groupBanner');
  if(state.mode === 'LCL' && cbm > 0 && cbm < 1){
    banner.style.display = 'block';
    banner.innerHTML = `<b>💡 Estás pagando capacidad que no usas:</b> tu volumen (${cbm.toFixed(2)} m³) no llega al mínimo facturable de 1 m³ en LCL. Puedes unirte a un <b>envío grupal</b> con otros importadores de tu misma ruta y pagar solo tu parte real del contenedor. <span style="text-decoration:underline; cursor:pointer; font-weight:600;" onclick="toggleGroupShipments(${cbm})">Ver envíos grupales disponibles</span>`;
  } else {
    banner.style.display = 'none';
    $('groupShipments').style.display = 'none';
  }
}
function toggleGroupShipments(cbm){
  const box = $('groupShipments');
  if(box.style.display === 'block'){ box.style.display='none'; return; }
  const rateLCL = 75;
  const individualCost = Math.max(cbm,1)*rateLCL;
  const groups = [
    { route:'Shenzhen → Cartagena', sale:'Sale en 5 días', joined:3, capacityLeft:'0.6 m³ libres' },
    { route:'Shenzhen → Buenaventura', sale:'Sale en 9 días', joined:5, capacityLeft:'1.1 m³ libres' }
  ];
  box.style.display = 'block';
  box.innerHTML = groups.map((g,i)=>{
    const sharedCost = cbm*rateLCL*1.15; // pequeño recargo de coordinación grupal
    const savings = individualCost - sharedCost;
    return `
    <div class="card tight" style="margin-bottom:8px;">
      <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
        <div>
          <div style="font-weight:700; font-size:13px;">${g.route}</div>
          <div class="hint" style="margin:2px 0 0;">${g.sale} · ${g.joined} importadores confirmados · ${g.capacityLeft}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:13px; font-weight:700; color:var(--lime-deep);">${fmtUsd(sharedCost)}</div>
          <div class="hint" style="margin:0; color:var(--lime-deep);">ahorras ${fmtUsd(savings)}</div>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" style="margin-top:10px;" onclick="joinGroup(${i}, ${sharedCost.toFixed(2)})">Unirme a este grupo</button>
    </div>`;
  }).join('') + `<div class="hint">Al unirte, tu carga viaja en el mismo contenedor que otros pedidos de la ruta — el representante coordina la consolidación y el despacho conjunto.</div>`;
}
function joinGroup(i, cost){
  const rates = { LCL: cost, FCL:2600, AIR: 999999, COURIER: 999999 }; // fuerza LCL grupal como mejor opción
  state.groupFreightOverride = cost;
  $('groupShipments').innerHTML = `<div class="hint" style="color:var(--lime-deep); font-weight:600;">✓ Te uniste al envío grupal. Tu flete quedó en ${fmtUsd(cost)} en vez del mínimo individual — esto se reflejará en tu próxima cotización.</div>`;
}
function pickMode(k){
  state.mode = k;
  document.querySelectorAll('#modeRecommend .choice').forEach(c=>c.classList.remove('active'));
  document.querySelector(`#modeRecommend .choice[data-mode="${k}"]`).classList.add('active');
}
['q_weight','q_cbm'].forEach(id=> $(id).addEventListener('input', renderModeRecommend));
renderModeRecommend();

function computeQuoteLines(fobOverride, freightOverride, repOverride){
  const fob = fobOverride ?? (parseFloat($('q_fob').value)||0);
  const weight = parseFloat($('q_weight').value)||0;
  const cbm = parseFloat($('q_cbm').value)||0;
  const inlandFee = parseFloat($('q_inlandFee') ? $('q_inlandFee').value : 0)||0;
  const incoterm = state.incoterm || 'FOB';
  const rep = repOverride || repById(state.selectedRepId);
  const repCommission = rep ? (rep.feeType==='flat' ? rep.feeValue : fob*(rep.feeValue/100)) : fob*0.01;
  const lockFee = state.priceLocked ? 12 : 0;

  if(incoterm === 'DDP'){
    // El proveedor ya incluyó flete, seguro, arancel e IVA en su precio —
    // sumarlos de nuevo duplicaría el costo. Solo se agrega lo que el
    // proveedor nunca cubre: la comisión del representante y el tramo
    // interno hasta tu bodega.
    const total = fob + repCommission + inlandFee + lockFee;
    return { fob, freight:0, insurance:0, exwFee:0, cif:fob, tariffRate:0, tariff:0, ivaRate:0, iva:0, verifCost:0, repCommission, agentFee:0, inlandFee, lockFee, total, incoterm };
  }

  // EXW: el proveedor no cubre ni siquiera sacar la mercancía de la fábrica —
  // ese trámite de recogida y exportación no está en ningún otro renglón.
  const exwFee = incoterm === 'EXW' ? 150 : 0;
  const groupRate = (state.mode==='LCL' && state.groupFreightOverride) ? state.groupFreightOverride : null;
  const modeRates = { LCL: groupRate ?? Math.max(cbm,1)*75, FCL:2600, AIR: Math.max(weight,45)*9.4, COURIER: weight*12 };
  // CIF: el proveedor ya cobró flete y seguro dentro del valor declarado —
  // cobrarlos aparte otra vez inflaría el costo real.
  const freight = incoterm === 'CIF' ? 0 : (freightOverride ?? (modeRates[state.mode] || 0));
  const insurance = incoterm === 'CIF' ? 0 : fob*0.005;
  const cif = fob+freight+insurance+exwFee;
  const tariffRate = 15, ivaRate = 19;
  const tariff = cif*(tariffRate/100);
  const iva = (cif+tariff)*(ivaRate/100);
  const verifCost = state.verif==='basic'?45: state.verif==='inspection'?180:0;
  const agentFee = 220;
  const total = cif+tariff+iva+verifCost+repCommission+agentFee+inlandFee+lockFee;
  return { fob, freight, insurance, exwFee, cif, tariffRate, tariff, ivaRate, iva, verifCost, repCommission, agentFee, inlandFee, lockFee, total, incoterm };
}
const fmtUsd = n => '$ '+n.toLocaleString('en-US',{minimumFractionDigits:2, maximumFractionDigits:2});
const verifLabels = { none:'Sin verificación', basic:'Verificación básica', inspection:'Inspección de sitio' };

// Fee de activación de la plataforma, cobrado al cliente cuando acepta la
// cotización confirmada — separado de la comisión del representante.
// VALORES DE EJEMPLO, por definir cuando haya datos reales de
// representantes y de las primeras transacciones. Fácil de ajustar aquí.
const PLATFORM_FEE_TIERS = [
  { maxFob: 3000, fee: 15 },
  { maxFob: 10000, fee: 35 },
  { maxFob: Infinity, fee: 60 }
];
function getPlatformFee(fob){
  const tier = PLATFORM_FEE_TIERS.find(t => fob < t.maxFob);
  return tier ? tier.fee : PLATFORM_FEE_TIERS[PLATFORM_FEE_TIERS.length-1].fee;
}

const INCOTERM_CALC_NOTE = {
  EXW: 'Con EXW el proveedor no cubre transporte de ningún tipo — se sumó una recogida en fábrica + trámite de exportación estimados, aparte del flete internacional.',
  CIF: 'Con CIF el proveedor ya incluyó flete y seguro dentro del valor declarado, por eso no se cobran aparte aquí — evita declarar un FOB que ya traiga flete sumado.',
  DDP: 'Con DDP el proveedor ya incluyó flete, seguro, arancel e IVA en su precio — pídele por escrito qué queda cubierto exactamente antes de aceptar.'
};
function unitCostChip(total, qty){
  if(!qty || qty<=0) return '';
  return `
    <div style="display:flex; align-items:center; justify-content:space-between; background:var(--lime-tint); border:1px solid var(--lime-deep); border-radius:8px; padding:10px 14px; margin-bottom:12px;">
      <span style="font-size:12.5px; font-weight:700; color:var(--ink);">💰 Costo por unidad puesta en tu bodega</span>
      <span style="font-family:'JetBrains Mono',monospace; font-weight:800; font-size:17px; color:var(--ink);">${fmtUsd(total/qty)}</span>
    </div>
  `;
}
function quoteLinesHtml(q, qty){
  const note = INCOTERM_CALC_NOTE[q.incoterm];
  if(q.incoterm === 'DDP'){
    return `
      ${unitCostChip(q.total, qty)}
      <div class="line-item"><span class="lbl">Valor DDP declarado (todo incluido por el proveedor)</span><span class="val">${fmtUsd(q.fob)}</span></div>
      <div class="line-item"><span class="lbl">Comisión / honorarios</span><span class="val">${fmtUsd(q.repCommission)}</span></div>
      <div class="line-item"><span class="lbl">Transporte interno hasta tu bodega</span><span class="val">${fmtUsd(q.inlandFee)}</span></div>
      ${q.lockFee ? `<div class="line-item"><span class="lbl">🧊 Congelar precio por 48h</span><span class="val">${fmtUsd(q.lockFee)}</span></div>` : ''}
      <div class="line-item total"><span class="lbl">Total puesto en tu bodega</span><span class="val">${fmtUsd(q.total)}</span></div>
      <div class="hint" style="margin-top:8px;">ℹ ${note}</div>
    `;
  }
  return `
    ${unitCostChip(q.total, qty)}
    <div class="line-item"><span class="lbl">Valor FOB${q.incoterm && q.incoterm!=='FOB' ? ' declarado ('+q.incoterm+')' : ''}</span><span class="val">${fmtUsd(q.fob)}</span></div>
    ${q.exwFee ? `<div class="line-item"><span class="lbl">Recogida en fábrica + trámite de exportación (EXW)</span><span class="val">${fmtUsd(q.exwFee)}</span></div>` : ''}
    <div class="line-item"><span class="lbl">Flete internacional</span><span class="val">${q.incoterm==='CIF' ? 'Incluido en el FOB' : fmtUsd(q.freight)}</span></div>
    <div class="line-item"><span class="lbl">Seguro</span><span class="val">${q.incoterm==='CIF' ? 'Incluido en el FOB' : fmtUsd(q.insurance)}</span></div>
    <div class="line-item"><span class="lbl">CIF</span><span class="val">${fmtUsd(q.cif)}</span></div>
    <div class="line-item"><span class="lbl">Arancel (${q.tariffRate}%)</span><span class="val">${fmtUsd(q.tariff)}</span></div>
    <div class="line-item"><span class="lbl">IVA importación (${q.ivaRate}%)</span><span class="val">${fmtUsd(q.iva)}</span></div>
    <div class="line-item"><span class="lbl">${verifLabels[state.verif]}</span><span class="val">${q.verifCost? fmtUsd(q.verifCost):'Incluido'}</span></div>
    <div class="line-item"><span class="lbl">Comisión / honorarios</span><span class="val">${fmtUsd(q.repCommission)}</span></div>
    <div class="line-item"><span class="lbl">Agente de aduanas + gastos portuarios</span><span class="val">${fmtUsd(q.agentFee)}</span></div>
    <div class="line-item"><span class="lbl">Transporte interno hasta tu bodega</span><span class="val">${fmtUsd(q.inlandFee)}</span></div>
    ${q.lockFee ? `<div class="line-item"><span class="lbl">🧊 Congelar precio por 48h</span><span class="val">${fmtUsd(q.lockFee)}</span></div>` : ''}
    <div class="line-item total"><span class="lbl">Total puesto en tu bodega</span><span class="val">${fmtUsd(q.total)}</span></div>
    ${note ? `<div class="hint" style="margin-top:8px;">ℹ ${note}</div>` : ''}
  `;
}

function unitLinesHtml(q, qty, uid){
  if(!qty || qty<=0) return '';
  const unitFob = q.fob/qty;
  const unitOther = (q.total-q.fob)/qty;
  const unitTotal = q.total/qty;
  return `
    <div class="card">
      <div class="section-title">Costo por unidad</div>
      <div class="line-item"><span class="lbl">Costo inicial (FOB/u)</span><span class="val">${fmtUsd(unitFob)}</span></div>
      <div class="line-item"><span class="lbl">Envío + trámites + comisiones/u</span><span class="val">${fmtUsd(unitOther)}</span></div>
      <div class="line-item total"><span class="lbl">Total puesto en tu bodega/u</span><span class="val">${fmtUsd(unitTotal)}</span></div>
      <div style="margin-top:14px;">
        <label class="field-label">¿En cuánto piensas vender cada unidad? (USD)</label>
        <div style="display:flex; gap:8px;">
          <input type="number" id="sellPrice_${uid}" placeholder="Ej. 9.90" style="flex:1;">
          <button class="btn btn-outline btn-sm" onclick="calcMargin(${unitTotal}, ${qty}, '${uid}')">Calcular margen</button>
        </div>
        <div id="marginResult_${uid}" class="hint"></div>
      </div>
    </div>
  `;
}
function calcMargin(unitCost, qty, uid){
  const sell = parseFloat($('sellPrice_'+uid).value)||0;
  const el = $('marginResult_'+uid);
  if(sell<=0){ el.textContent = 'Ingresa un precio de venta válido.'; return; }
  const margin = sell-unitCost;
  const marginPct = (margin/sell)*100;
  if(margin<=0){
    el.innerHTML = `<span style="color:#B42318; font-weight:600;">A ese precio venderías con pérdida (${fmtUsd(margin)}/u). Necesitas vender por encima de ${fmtUsd(unitCost)} para cubrir el costo puesto en bodega.</span>`;
  } else {
    el.innerHTML = `Margen bruto: <b>${fmtUsd(margin)} por unidad (${marginPct.toFixed(1)}%)</b>. Con ${qty} unidades, tu ganancia bruta total sería <b>${fmtUsd(margin*qty)}</b> (antes de otros gastos operativos).`;
  }
}

function generateQuote(){
  if(state.compareMode && compareSelection.length>=2){ renderCompareQuotes(); return; }
  const q = computeQuoteLines();
  state.lastQuote = q;
  state.preliminaryQuote = q;
  if(!state.trmAtQuote) state.trmAtQuote = 4050;
  const qty = parseFloat($('q_qty').value)||0;
  $('quoteResult').style.display = 'block';
  $('quoteResult').innerHTML = `
    <div class="card">
      <div class="quote-stage-label">
        <span class="pill pill-warn">Estimado automático</span>
        <span class="hint" style="margin:0;">Calculado por la plataforma con tarifas de referencia</span>
      </div>
      <div class="section-title">Cotización preliminar · ${state.mode} · ${verifLabels[state.verif]}</div>
      ${quoteLinesHtml(q, qty)}
      <div class="hint">Este valor es solo una referencia. Tu representante revisará el pedido real (peso, empaque, ruta disponible) y puede ajustar cifras antes de confirmar.</div>
      <label class="choice" style="margin-top:12px;" onclick="event.preventDefault(); togglePriceLock();">
        <div class="radio ${state.priceLocked?'':''}" id="lockRadio"></div>
        <div class="choice-body"><h4>🧊 Congelar este precio por 48h</h4><p>Protege tu cotización de cambios en el flete o la TRM mientras decides. Si el representante confirma dentro de ese plazo, el total no cambia.</p><span class="choice-price">+ USD 12</span></div>
      </label>
      <div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="sendToRepForConfirmation()">Enviar a <span id="quoteRepNameInline">${$('quoteRepName').textContent}</span> para confirmar</button>
        <button class="btn btn-outline" onclick="generateQuote()">Ajustar y recalcular</button>
      </div>
    </div>
    ${unitLinesHtml(q, qty, 'prelim')}
  `;
  const lockRadio = $('lockRadio');
  if(state.priceLocked){ lockRadio.parentElement.classList.add('active'); }
  $('quoteResult').scrollIntoView({behavior:'smooth', block:'nearest'});
}
function togglePriceLock(){
  state.priceLocked = !state.priceLocked;
  generateQuote();
}

function renderCompareQuotes(){
  const qty = parseFloat($('q_qty').value)||0;
  const quotes = compareSelection.map(id=>{
    const rep = repById(id);
    const q = computeQuoteLines(undefined, undefined, rep);
    return { rep, q };
  }).sort((a,b)=> a.q.total - b.q.total);
  $('quoteResult').style.display = 'block';
  $('quoteResult').innerHTML = `
    <div class="quote-stage-label">
      <span class="pill pill-warn">Estimados automáticos</span>
      <span class="hint" style="margin:0;">Comparando ${quotes.length} opciones para el mismo pedido</span>
    </div>
    ${quotes.map((item,i)=>`
      <div class="card ${i===0?'':''}" style="${i===0?'border-color:var(--ink);':''}">
        ${i===0?'<span class="pill pill-ok">Más económico</span>':''}
        <div class="section-title" style="margin-top:${i===0?'8px':'0'};">${item.rep.name}</div>
        <div class="hint" style="margin-top:-6px;">${item.rep.type} · comisión: ${item.rep.commission}</div>
        <div class="line-item total"><span class="lbl">Total puesto en tu bodega</span><span class="val">${fmtUsd(item.q.total)}</span></div>
        <div class="line-item"><span class="lbl">Costo por unidad</span><span class="val">${qty>0? fmtUsd(item.q.total/qty):'—'}</span></div>
        <button class="btn btn-primary btn-sm" style="margin-top:10px;" onclick="pickFromCompare('${item.rep.id}')">Elegir a ${item.rep.name.split(' ')[0]} y continuar</button>
      </div>
    `).join('')}
    <div class="hint">Los totales varían solo por la comisión de cada representante — el resto del costeo (flete, arancel, IVA) es el mismo porque es el mismo pedido.</div>
  `;
  $('quoteResult').scrollIntoView({behavior:'smooth', block:'nearest'});
}
function pickFromCompare(id){
  state.compareMode = false;
  state.selectedRepId = id;
  $('quoteRepName').textContent = repById(id).name;
  generateQuote();
}

async function sendToRepForConfirmation(){
  if(!state.contactEmail){ renderContactCapture(); return; }
  await proceedToWaiting();
}
function renderContactCapture(){
  $('quoteResult').innerHTML = `
    <div class="card">
      <div class="section-title">¿A dónde te avisamos?</div>
      <p class="hint" style="margin-top:0;">${$('quoteRepName').textContent} puede tardar horas en responder — no tienes que quedarte esperando en esta pantalla. Déjanos tu correo (y WhatsApp si quieres) para avisarte apenas conteste. Esto todavía no crea una cuenta.</p>
      <div class="grid">
        <div><label class="field-label">Correo electrónico</label><input type="email" id="contact_email" autocomplete="email" placeholder="tucorreo@ejemplo.com"></div>
        <div><label class="field-label">WhatsApp (opcional)</label><input type="tel" id="contact_whatsapp" autocomplete="tel" placeholder="+57 300 000 0000"></div>
      </div>
      <button class="btn btn-primary" style="margin-top:12px;" onclick="submitContactAndSend()">Enviar solicitud</button>
    </div>
  `;
  $('quoteResult').scrollIntoView({behavior:'smooth', block:'nearest'});
}
async function submitContactAndSend(){
  const email = $('contact_email').value.trim();
  if(!email){ alert('Ingresa un correo para poder avisarte cuando respondan.'); return; }
  state.contactEmail = email;
  state.contactWhatsapp = $('contact_whatsapp').value.trim();
  const pill = $('accountPill');
  pill.innerHTML = `<span class="dot"></span>${email}`;
  await proceedToWaiting();
}
async function proceedToWaiting(){
  if(!requireSupabase()) return;
  const rep = repById(state.selectedRepId);
  if(!rep){ alert('Elige un representante real antes de continuar.'); goTo(1); return; }
  if(!state.quoteRequestDbId){
    const folio = 'SOL-' + Math.floor(3000+Math.random()*900);
    let payload;
    if(state.path === 'B'){
      const p = state.selectedProduct;
      const q = state.preliminaryQuote;
      payload = {
        folio,
        client_id: state.accountId || null,
        contact_email: state.contactEmail,
        contact_whatsapp: state.contactWhatsapp || null,
        representative_id: rep.id,
        product_id: p.id,
        status: 'pending',
        product_name: p.name,
        quantity: q.qty,
        fob_usd: q.total,
        preliminary_quote: q
      };
    } else {
      const q = state.preliminaryQuote || computeQuoteLines();
      payload = {
        folio,
        client_id: state.accountId || null,
        contact_email: state.contactEmail,
        contact_whatsapp: state.contactWhatsapp || null,
        representative_id: rep.id,
        status: 'pending',
        product_name: $('q_prod').value,
        quantity: parseInt($('q_qty').value)||0,
        fob_usd: parseFloat($('q_fob').value)||0,
        weight_kg: parseFloat($('q_weight').value)||0,
        volume_cbm: parseFloat($('q_cbm').value)||0,
        boxes: parseInt($('q_boxes').value)||0,
        shipping_mode: state.mode,
        verification_level: state.verif,
        incoterm: state.incoterm,
        price_locked: state.priceLocked,
        preliminary_quote: q
      };
    }
    const { data, error } = await supabaseClient.from('quote_requests').insert(payload).select().single();
    if(error){ alert('No se pudo enviar tu solicitud: ' + error.message); return; }
    state.requestId = data.folio;
    state.quoteRequestDbId = data.id;
  }
  logNotification(state.contactEmail, 'Recibimos tu solicitud de cotización', `Enviamos tu pedido a ${$('quoteRepName').textContent}. Folio ${state.requestId}. Te avisaremos aquí mismo cuando responda.`);
  renderWaitingCard();
}
function renderWaitingCard(){
  $('quoteResult').innerHTML = `
    <div class="card">
      <div class="waiting-box">
        <div class="dot-spinner"><span></span><span></span><span></span></div>
        Esperando confirmación de ${$('quoteRepName').textContent}…
      </div>
      <div class="hint" style="margin-top:0;">Folio <b>${state.requestId}</b> · normalmente responde en 24–48h. Te avisaremos a <b>${state.contactEmail}</b>${state.contactWhatsapp?` y por WhatsApp al ${state.contactWhatsapp}`:''}. Puedes cerrar esta pestaña — cuando vuelvas a entrar verás el estado actualizado aquí mismo.</div>
      <div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
        <button class="btn btn-outline btn-sm" onclick="checkRepResponse(this)">🔄 Actualizar estado</button>
        <button class="btn btn-text btn-sm" onclick="openSupport()">💬 Hablar con un asesor</button>
      </div>
      <div class="hint" style="margin-top:14px; padding-top:12px; border-top:1px dashed var(--line);">Tu representante responde esto desde su propio portal, normalmente desde otro computador. Si quieres simular su respuesta para probar el flujo, entra a la <span style="text-decoration:underline; cursor:pointer; font-weight:700; color:var(--ink);" onclick="goToRepPortal()">vista de representante</span> con la cuenta de representante y responde la solicitud desde ahí.</div>
    </div>
    <div id="clientFaqDeck" style="margin-top:14px;"></div>
  `;
  initFaqDeck('clientFaqDeck', CLIENT_FAQS, 'faqClientSeen', 'Importador informado');
  $('quoteResult').scrollIntoView({behavior:'smooth', block:'nearest'});
}
async function checkRepResponse(btn){
  if(!state.quoteRequestDbId || !supabaseClient) return;
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Consultando…';
  const { data, error } = await supabaseClient
    .from('quote_requests').select('*').eq('id', state.quoteRequestDbId).maybeSingle();
  btn.disabled = false;
  btn.textContent = original;
  if(error || !data){
    alert('No se pudo consultar el estado ahora mismo. Intenta de nuevo en un momento.');
    return;
  }
  if(data.status === 'rejected'){
    state.rejected = true;
    state.rejectReason = data.reject_reason;
    state.rejectMsg = data.reject_msg;
    renderRejectedCard();
  } else if(data.status === 'responded' || data.status === 'accepted'){
    state.repResponded = true;
    state.repRealQuote = data.confirmed_quote;
    state.repNote = data.rep_note;
    logNotification(state.contactEmail, `${$('quoteRepName').textContent} confirmó tu cotización`, 'Ya puedes revisar los valores finales y aceptar para continuar con el pago.');
    renderConfirmedQuote();
  } else {
    btn.textContent = 'Aún sin respuesta…';
    setTimeout(()=>{ btn.textContent = original; }, 1200);
  }
}
function renderRejectedCard(){
  $('quoteResult').innerHTML = `
    <div class="card" style="border-color:var(--danger);">
      <span class="pill" style="background:var(--danger-soft); color:var(--danger);">Solicitud rechazada</span>
      <div class="section-title" style="margin-top:8px;">${$('quoteRepName').textContent} no pudo confirmar tu pedido</div>
      <p class="hint" style="margin-top:0;">Motivo: <b>${state.rejectReason}</b>${state.rejectMsg? ' — '+state.rejectMsg:''}</p>
      <button class="btn btn-primary" onclick="backToMarketplaceAfterReject()">Elegir otro representante</button>
    </div>
  `;
}
function backToMarketplaceAfterReject(){
  state.rejected = false; state.repResponded = false; state.requestId = null; state.repRealQuote = null; state.contactEmail = null; state.quoteRequestDbId = null;
  goTo(1);
}

function renderConfirmedQuote(){
  if(state.path === 'B'){ renderCatalogConfirmedQuote(); return; }
  // Usa los valores reales que dejó el representante en su portal
  let q;
  if(state.repRealQuote){
    q = state.repRealQuote;
  } else {
    const base = state.lastQuote;
    const adjustedFreight = state.priceLocked ? base.freight : base.freight * 1.08;
    q = computeQuoteLines(base.fob, adjustedFreight);
  }
  state.lastQuote = q;
  const repName = $('quoteRepName').textContent;
  const qty = parseFloat($('q_qty').value)||0;

  const prelim = state.preliminaryQuote;
  let deltaHtml = '';
  if(state.priceLocked){
    deltaHtml = `<span class="hint" style="margin:0; color:var(--lime-deep); font-weight:600;">🧊 Precio congelado — sin cambios vs tu estimado</span>`;
  } else if(prelim && prelim.total>0){
    const deltaPct = ((q.total-prelim.total)/prelim.total)*100;
    const sign = deltaPct>=0?'+':'';
    const color = deltaPct>0 ? '#B45309' : (deltaPct<0 ? 'var(--lime-deep)' : 'var(--ink-soft)');
    deltaHtml = `<span class="hint" style="margin:0; color:${color}; font-weight:600;">${sign}${deltaPct.toFixed(1)}% vs estimado inicial (${fmtUsd(prelim.total)})</span>`;
  }

  $('quoteResult').innerHTML = `
    <div class="card" style="border-color:var(--ink);">
      <div class="quote-stage-label">
        <span class="pill pill-ok">✓ Confirmada por ${repName}</span>
        ${deltaHtml}
      </div>
      <div class="section-title">Cotización confirmada · ${state.mode} · ${verifLabels[state.verif]}</div>
      ${state.repNote ? `<div class="hint" style="background:var(--paper); border-radius:8px; padding:10px 12px; margin-bottom:12px;">💬 "${state.repNote}" — ${repName}</div>` : ''}
      ${quoteLinesHtml(q, qty)}
      <div class="hint">Estos son los valores reales que aplicará ${repName}, ya con el flete cotizado a la tarifa vigente. Al aceptar, se compromete el pedido.</div>
      <div class="hint" style="margin-top:10px; padding-top:10px; border-top:1px dashed var(--line);">Además de esto, Conecta Importa cobra un <b>fee de activación de ${fmtUsd(getPlatformFee(q.fob))}</b> (ejemplo, por definir) — es un cobro aparte de la plataforma, no de ${repName}.</div>
      <div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="handleAcceptConfirmed()">Aceptar cotización confirmada</button>
        <button class="btn btn-outline">Solicitar otro ajuste</button>
      </div>
    </div>
    ${unitLinesHtml(q, qty, 'confirmed')}
  `;
}

function renderCatalogConfirmedQuote(){
  const q = state.repRealQuote || state.lastQuote;
  const p = state.selectedProduct;
  const repName = $('quoteRepName').textContent;
  state.lastQuote = q;
  $('quoteResult').innerHTML = `
    <div class="card" style="border-color:var(--ink);">
      <div class="quote-stage-label">
        <span class="pill pill-ok">✓ Confirmado por ${repName}</span>
      </div>
      <div class="section-title">${p ? p.name : 'Tu pedido'}</div>
      ${state.repNote ? `<div class="hint" style="background:var(--paper); border-radius:8px; padding:10px 12px; margin-bottom:12px;">💬 "${state.repNote}" — ${repName}</div>` : ''}
      <div class="line-item"><span class="lbl">Precio unitario</span><span class="val">${fmtUsd(q.unitPrice||0)}</span></div>
      <div class="line-item"><span class="lbl">Cantidad</span><span class="val">${q.qty||0}</span></div>
      <div class="line-item total"><span class="lbl">Total (ya nacionalizado)</span><span class="val">${fmtUsd(q.total||0)}</span></div>
      <div class="hint" style="margin-top:10px; padding-top:10px; border-top:1px dashed var(--line);">Además de esto, Conecta Importa cobra un <b>fee de activación de ${fmtUsd(getPlatformFee(q.total||0))}</b> (ejemplo, por definir) — es un cobro aparte de la plataforma, no de ${repName}.</div>
      <div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="handleAcceptConfirmed()">Aceptar pedido</button>
      </div>
    </div>
  `;
}
async function markQuoteAccepted(){
  if(!supabaseClient || !state.quoteRequestDbId) return;
  const { error } = await supabaseClient.from('quote_requests')
    .update({ status:'accepted', updated_at:new Date().toISOString() })
    .eq('id', state.quoteRequestDbId);
  if(error) console.error('No se pudo marcar la cotización como aceptada:', error);
}
async function handleAcceptConfirmed(){
  if(state.loggedIn){ await markQuoteAccepted(); renderPlatformFeeGate(); return; }
  renderAuthGate();
}
function renderPlatformFeeGate(){
  const q = state.lastQuote || {};
  const fee = getPlatformFee(q.fob || 0);
  $('quoteResult').innerHTML = `
    <div class="card" style="border-color:var(--ink);">
      <span class="pill pill-warn">Antes de continuar</span>
      <div class="section-title" style="margin-top:8px;">Fee de activación de la plataforma</div>
      <p class="hint" style="margin-top:0;">Además de lo que le transfieres directamente a tu representante, Conecta Importa cobra un fee de activación por conectar tu pedido — separado de su comisión.</p>
      <div class="line-item"><span class="lbl">Fee de activación (ejemplo, por definir)</span><span class="val">${fmtUsd(fee)}</span></div>
      <div class="hint" style="margin-top:8px;">Este valor es de ejemplo — el monto final y la forma exacta de cobro todavía se están definiendo. Lo dejamos visible desde ya para que sea transparente.</div>
      <button class="btn btn-primary btn-block" style="margin-top:14px;" onclick="goTo(3)">Entiendo, continuar →</button>
    </div>
  `;
  $('quoteResult').scrollIntoView({behavior:'smooth', block:'nearest'});
}

function renderAuthGate(mode){
  mode = mode || 'signup';
  const isLogin = mode === 'login';
  $('quoteResult').innerHTML += `
    <div class="auth-card" id="authGate" style="margin-top:14px;">
      <div class="lock-badge">🔒 Necesitas una cuenta para continuar</div>
      <p style="font-size:12.5px; line-height:1.6; margin:0 0 14px;">
        A partir de aquí compartimos tus datos y los del proveedor con ${$('quoteRepName').textContent}, y comprometemos el pago. Explorar y cotizar no requería cuenta — confirmar el pedido sí.
      </p>
      <div class="grid">
        ${isLogin ? '' : `<div><label class="field-label">Nombre completo</label><input type="text" id="auth_name" autocomplete="name" placeholder="Tu nombre"></div>`}
        <div><label class="field-label">Correo electrónico</label><input type="email" id="auth_email" autocomplete="email" value="${state.contactEmail||''}" placeholder="tucorreo@ejemplo.com"></div>
        <div><label class="field-label">Contraseña</label><input type="password" id="auth_pass" autocomplete="${isLogin?'current-password':'new-password'}" placeholder="Mínimo 8 caracteres"></div>
      </div>
      <div id="auth_gate_error" class="hint" style="color:#F0B4AE; display:none;"></div>
      <button class="btn btn-primary" style="margin-top:12px;" onclick="createAccountAndContinue('${mode}', this)">${isLogin ? 'Iniciar sesión y continuar' : 'Crear cuenta y continuar'}</button>
      <div class="hint" style="color:#B9BEC9;">${isLogin ? '¿Aún no tienes cuenta?' : '¿Ya tienes cuenta?'} <span style="color:var(--lime); font-weight:600; text-decoration:underline; cursor:pointer;" onclick="renderAuthGateSwitch('${isLogin?'signup':'login'}')">${isLogin ? 'Crear una' : 'Inicia sesión'}</span></div>
    </div>
  `;
  $('authGate').scrollIntoView({behavior:'smooth', block:'nearest'});
}
function renderAuthGateSwitch(mode){
  $('authGate').remove();
  renderAuthGate(mode);
}

async function createAccountAndContinue(mode, btn){
  const email = $('auth_email').value.trim() || state.contactEmail || '';
  const pass = $('auth_pass').value.trim();
  const errBox = $('auth_gate_error');
  if(errBox) errBox.style.display = 'none';
  if(!email || !pass){ alert('Ingresa correo y contraseña.'); return; }
  if(!requireSupabase()) return;
  const originalLabel = btn ? btn.textContent : '';
  if(btn){ btn.disabled = true; btn.textContent = 'Un momento…'; }
  try{
    let session;
    if(mode === 'login'){
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
      if(error) throw error;
      session = data.session;
    } else {
      const name = $('auth_name') ? $('auth_name').value.trim() : '';
      session = await upgradeOrSignUp(email, pass, { role:'client', full_name:name });
      if(!session){
        $('authGate').innerHTML = `<div class="banner">✓ Cuenta creada. Confirma tu correo (<b>${email}</b>) y vuelve a aceptar la cotización para continuar.</div>`;
        return;
      }
    }
    const profile = await ensureProfile(session);
    state.loggedIn = true;
    state.accountId = profile.id;
    state.accountEmail = profile.email;
    state.contactEmail = profile.email;
    const pill = $('accountPill');
    pill.classList.add('logged');
    pill.innerHTML = `<span class="dot"></span>${profile.email}`;
    logNotification(profile.email, mode==='login' ? 'Iniciaste sesión' : 'Bienvenido a Conecta Importa', mode==='login' ? 'Volviste a entrar a tu cuenta.' : 'Tu cuenta quedó creada. A partir de ahora, cada avance de tu pedido llegará también a este correo.');
    await markQuoteAccepted();
    renderPlatformFeeGate();
  } catch(err){
    if(errBox){ errBox.textContent = friendlyAuthError(err); errBox.style.display = 'block'; }
    else alert(friendlyAuthError(err));
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = originalLabel; }
  }
}

// ---------------------------------------------------------------------
// STEP 4: PAGO Y SEGUIMIENTO — transferencia directa a cuenta verificada
// ---------------------------------------------------------------------
function renderBankAccountCard(){
  const rep = repById(state.selectedRepId);
  const box = $('bankAccountCard');
  if(!box) return;
  if(!rep || !rep.bank){ box.innerHTML = ''; return; }
  box.innerHTML = `
    <div class="card" style="background:var(--paper); border-style:dashed;">
      <div class="section-title">Cuenta verificada de ${rep.name}</div>
      <div class="line-item"><span class="lbl">Entidad</span><span class="val" style="font-family:'Inter',sans-serif;">${rep.bank.entity}</span></div>
      <div class="line-item"><span class="lbl">Tipo de cuenta</span><span class="val" style="font-family:'Inter',sans-serif;">${rep.bank.accType}</span></div>
      <div class="line-item"><span class="lbl">Número</span><span class="val">•••• ${rep.bank.last4}</span></div>
      <div class="line-item"><span class="lbl">Valor a transferir</span><span class="val">${fmtUsd(state.lastQuote ? state.lastQuote.total : 0)}</span></div>
      <div class="hint" style="margin-top:8px;">✓ Verificamos la titularidad de esta cuenta el ${rep.bank.verifiedDate}. Transfiere solo a esta cuenta — nunca a una distinta que te pidan por fuera de la plataforma.</div>
    </div>
  `;
}
function handleReceiptUpload(input){
  const file = input.files[0];
  if(!file) return;
  state.receipt = { name:file.name, time: new Date().toLocaleString('es-CO',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) };
  $('receiptStatus').innerHTML = `<div class="banner" style="margin-top:8px;">✓ <b>${file.name}</b> quedó guardado como comprobante de tu pago, con fecha y hora — tú y tu representante pueden verlo cuando quieran en "Documentos".</div>`;
  $('payBtn').disabled = false;
}
function confirmPayment(){
  state.paid = true;
  $('payBtn').disabled = true;
  $('payBtn').textContent = 'Transferencia confirmada';
  $('payStatus').innerHTML = `${$('shareInvoice').checked ? `Le avisamos a tu representante que ya transferiste, con tu comprobante adjunto.` : 'Guardamos tu comprobante — avísale tú directamente a tu representante que ya transferiste.'}`;
  logNotification(state.accountEmail || state.contactEmail, 'Registramos tu comprobante de pago', 'Tu representante ya puede verlo. Te iremos avisando cada etapa del envío por este medio.');
  state.tlCurrentIndex = 1;
  renderTimeline(1);
  renderDocs();
}
const TL_STEPS = [
  { title:'Pedido confirmado y pagado', desc:'Se notificó al proveedor para iniciar producción.', days:0 },
  { title:'En fabricación', desc:'El proveedor está produciendo el pedido.', days:6 },
  { title:'Listo para despacho', desc:'Producto empacado y fotografiado antes de salir de fábrica.', photos:true, days:9 },
  { title:'En tránsito internacional', desc:'Carga en camino según la vía seleccionada.', days:22 },
  { title:'En aduana (Colombia)', desc:'Trámite de declaración de importación y levante ante la DIAN.', days:26 },
  { title:'Recibido en tu bodega', desc:'Mercancía nacionalizada y entregada.', days:29 }
];
function estimatedDate(days){
  const d = new Date();
  d.setDate(d.getDate()+days);
  return d.toLocaleDateString('es-CO', {day:'numeric', month:'short'});
}
function renderTlRail(currentIdx){
  const total = TL_STEPS.length;
  const activeIdx = Math.max(currentIdx, 0);
  const pct = currentIdx < 0 ? 0 : (activeIdx/(total-1))*100;
  const label = currentIdx < 0 ? 'Esperando confirmación de pago' : TL_STEPS[activeIdx].title;
  $('tlRail').innerHTML = `
    <div class="tl-rail">
      <div class="tl-rail-label">Estado actual</div>
      <div class="tl-rail-current-label">${label}</div>
      <div class="tl-rail-track">
        <div class="tl-rail-fill" style="width:${pct}%;"></div>
      </div>
      <div class="tl-rail-nodes">
        ${TL_STEPS.map((s,i)=>`<div class="tl-rail-node ${i<activeIdx || (currentIdx>=0 && i<=activeIdx && i<activeIdx)?'done':''} ${i===activeIdx && currentIdx>=0?'current':''}"></div>`).join('')}
      </div>
    </div>
  `;
}
function renderTimeline(currentIdx){
  renderTlRail(currentIdx);
  $('timeline').innerHTML = TL_STEPS.map((s,i)=>{
    const cls = i<currentIdx ? 'done' : i===currentIdx ? 'current' : '';
    const icon = i<currentIdx ? '✓' : '';
    return `
    <div class="tl-step ${cls}">
      <div class="tl-dot">${icon}</div>
      <div class="tl-title">${s.title}</div>
      <div class="tl-desc">${state.tlNotes[i] || s.desc}</div>
      <div class="hint" style="margin-top:3px;">📅 Estimado: ${estimatedDate(s.days)} <span style="color:var(--ink-faint);">· predicción según despachos similares de la ruta</span></div>
      ${renderTlFiles(state.tlFiles[i])}
      ${i===currentIdx ? `<button class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="advanceTimeline()">Ya lo vi, seguir esperando →</button>` : ''}
    </div>`;
  }).join('');
  renderRatingBlock(currentIdx);
}
function renderRatingBlock(currentIdx){
  let box = $('ratingBlock');
  if(currentIdx < TL_STEPS.length-1){
    if(box) box.remove();
    return;
  }
  if(!box){
    box = document.createElement('div');
    box.id = 'ratingBlock';
    $('timeline').insertAdjacentElement('afterend', box);
  }
  if(state.clientRating){
    box.innerHTML = `<div class="banner">✓ Gracias por calificar a ${$('quoteRepName') ? $('quoteRepName').textContent : 'tu representante'} con ${state.clientRating.stars}★. Tu reseña ya es visible para futuros clientes.</div>`;
    return;
  }
  box.innerHTML = `
    <div class="card">
      <div class="section-title">¿Cómo te fue con ${$('quoteRepName') ? $('quoteRepName').textContent : 'tu representante'}?</div>
      <div style="display:flex; gap:6px; margin-bottom:12px;" id="starPicker">
        ${[1,2,3,4,5].map(n=>`<span data-n="${n}" onclick="pickStar(${n})" style="font-size:24px; cursor:pointer; color:var(--line-strong);">★</span>`).join('')}
      </div>
      <textarea id="rating_comment" rows="2" placeholder="Cuéntale a otros clientes cómo fue tu experiencia (opcional)"></textarea>
      <button class="btn btn-primary btn-sm" style="margin-top:10px;" onclick="submitRating()">Enviar calificación</button>
    </div>
  `;
}
function pickStar(n){
  state.pendingStars = n;
  document.querySelectorAll('#starPicker span').forEach(s=>{
    s.style.color = parseInt(s.dataset.n) <= n ? 'var(--lime-deep)' : 'var(--line-strong)';
  });
}
function submitRating(){
  if(!state.pendingStars){ alert('Elige de 1 a 5 estrellas.'); return; }
  state.clientRating = { stars: state.pendingStars, comment: $('rating_comment').value.trim() };
  logNotification(state.accountEmail || state.contactEmail, 'Gracias por tu calificación', `Calificaste con ${state.clientRating.stars}★ a ${$('quoteRepName').textContent}. Esto ayuda a otros importadores a decidir.`);
  renderRatingBlock(state.tlCurrentIndex);
}
function renderTlFiles(files){
  if(!files || !files.length) return '';
  return `<div class="tl-photos">${files.map(f=>{
    if(f.isImage){
      return `<img src="${f.dataUrl}" class="tl-photo" style="object-fit:cover; padding:0; cursor:pointer;" onclick="window.open('${f.dataUrl.replace(/'/g,"")}','_blank')" title="${f.name}">`;
    }
    return `<a href="${f.dataUrl}" download="${f.name}" class="tl-photo" style="text-decoration:none; padding:4px; word-break:break-all;">📄 ${f.name.length>14? f.name.slice(0,12)+'…':f.name}</a>`;
  }).join('')}</div>`;
}
function advanceTimeline(){
  const idx = Array.from(document.querySelectorAll('.tl-step')).indexOf(document.querySelector('.tl-step.current'));
  state.tlCurrentIndex = Math.min(idx+1, TL_STEPS.length-1);
  renderTimeline(state.tlCurrentIndex);
}
renderTimeline(-1);

const DOCS = [
  { name:'Cotización aceptada', note:'Generada al aceptar la cotización.', ready:true },
  { name:'Factura comercial del proveedor', note:'Sube tu contacto al confirmar la compra.', ready:true },
  { name:'Packing list', note:'Detalle de cajas, pesos y contenido.', ready:false },
  { name:'Documento de transporte (BL / AWB)', note:'Emitido al despachar la carga.', ready:false },
  { name:'Declaración de importación', note:'Documento oficial ante la DIAN.', ready:false },
  { name:'Levante', note:'Autorización final para retirar la mercancía.', ready:false }
];
function renderDocs(){
  const receiptDoc = state.receipt ? [{ name:`Comprobante de pago (${state.receipt.name})`, note:`Subido por ti el ${state.receipt.time}`, ready:true }] : [];
  const list = [...receiptDoc, ...DOCS];
  $('docList').innerHTML = list.map(d=>`
    <div class="doc-row">
      <div><div class="doc-name">${d.name}</div><div class="doc-note">${d.note}</div></div>
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="pill ${d.ready?'pill-ok':'pill-muted'}">${d.ready?'Disponible':'Pendiente'}</span>
        <button class="btn btn-outline btn-sm" ${d.ready?'':'disabled'}>Ver</button>
      </div>
    </div>
  `).join('');
}
renderDocs();

// Al final, porque necesita las funciones y el `state` definidos arriba.
restoreSession();
