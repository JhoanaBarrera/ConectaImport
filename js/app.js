const $ = id => document.getElementById(id);
let state = { status:'natNoRut', hasSupplier:'yes', path:'B', verif:'basic', selectedRepId:null, mode:'AIR', paid:false, maxReached:0, loggedIn:false, accountEmail:null, lastQuote:null, preliminaryQuote:null, groupFreightOverride:null, compareMode:false, trmAtQuote:null, priceLocked:false, contactEmail:null, contactWhatsapp:null, requestId:null, notifications:[], repResponded:false, repRealQuote:null, repNote:null, rejected:false, rejectReason:null, rejectMsg:null, tlCurrentIndex:-1, tlNotes:{}, tlFiles:{}, repLoggedIn:false, repEmail:null, receipt:null, faqClientSeen:{}, faqRepSeen:{}, repVerifType:null, repVerifStatus:{}, supplierQuoteAttached:false, repAvailable:true, repMinOrder:0, clientRating:null, pendingStars:0, incotermKnowledge:'unknown', incoterm:'FOB' };

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
  window.scrollTo(0,0);
}
function backToLanding(){
  $('appShell').style.display = 'none';
  $('landingScreen').style.display = 'block';
  resetLandingView();
  window.scrollTo(0,0);
}
function resetLandingView(){
  $('portalSelectSection').style.display = 'block';
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
  mode = mode || 'login';
  const isSignup = mode === 'signup';
  $('portalSelectSection').style.display = 'none';
  $('marketingContent').style.display = 'none';
  $('clientLoginGate').style.display = 'block';
  $('clientLoginGate').innerHTML = `
    <div class="wrap">
      <div class="auth-card" style="margin-top:6px;">
        <div class="lock-badge">🧑‍💼 Portal Cliente</div>
        <p style="font-size:12.5px; color:var(--ink); line-height:1.6; margin:0 0 14px;">
          Puedes explorar y cotizar sin cuenta. Inicia sesión si ya tienes una, regístrate, o entra como invitado — solo te pediremos crear cuenta cuando confirmes un pedido.
        </p>
        <div class="grid">
          ${isSignup ? `<div><label class="field-label">Nombre completo</label><input type="text" id="cl_gate_name" placeholder="Tu nombre"></div>` : ''}
          <div><label class="field-label">Correo electrónico</label><input type="text" id="cl_gate_email" placeholder="tucorreo@ejemplo.com"></div>
          <div><label class="field-label">Contraseña</label><input type="password" id="cl_gate_pass" placeholder="Mínimo 8 caracteres"></div>
        </div>
        <button class="btn btn-primary btn-block" style="margin-top:12px;" onclick="clientGateSubmit('${mode}')">${isSignup ? 'Crear cuenta y entrar' : 'Iniciar sesión'}</button>
        <div class="hint" style="text-align:center; margin-top:10px;">${isSignup ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'} <span style="color:var(--ink); font-weight:600; cursor:pointer;" onclick="openClientPortalGate('${isSignup?'login':'signup'}')">${isSignup ? 'Inicia sesión' : 'Regístrate'}</span></div>
        <div class="hint" style="text-align:center; margin-top:6px;"><span style="text-decoration:underline; cursor:pointer; font-weight:600; color:var(--ink);" onclick="continueAsGuest()">Continuar como invitado →</span></div>
        <button class="btn btn-text btn-sm" style="margin-top:16px; display:block; margin-left:auto; margin-right:auto;" onclick="resetLandingView()">← Volver</button>
      </div>
    </div>
  `;
  window.scrollTo(0,0);
}
function clientGateSubmit(mode){
  const email = $('cl_gate_email').value.trim();
  const pass = $('cl_gate_pass').value.trim();
  if(!email || !pass){ alert('Ingresa correo y contraseña.'); return; }
  state.loggedIn = true;
  state.accountEmail = email;
  state.contactEmail = email;
  enterApp();
  logNotification(email, mode==='signup' ? 'Bienvenido a Conecta Importa' : 'Iniciaste sesión', mode==='signup' ? 'Tu cuenta quedó creada.' : 'Volviste a entrar a tu cuenta.');
}
function continueAsGuest(){
  enterApp();
}
function goToRepPortal(){
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
function renderRepLoginGate(mode){
  mode = mode || 'login';
  const isSignup = mode === 'signup';
  $('repPortalContent').style.display = 'none';
  $('repLoginBox').innerHTML = `
    ${isSignup ? `<div class="banner" style="margin-top:22px;">🚀 <b>Primeros representantes:</b> cotizar y responder solicitudes nunca tiene costo. La plataforma no te cobra comisión sobre la tuya — solo cuando un pedido se concreta, el cliente ve tu comisión con total transparencia, igual que si te contratara directo.</div>` : ''}
    <div class="auth-card" id="repAuthCard" ${isSignup?'':'style="margin-top:22px;"'}>
      <div class="lock-badge">🔒 Acceso solo para representantes y agencias verificadas</div>
      <p style="font-size:12.5px; color:var(--ink); line-height:1.6; margin:0 0 14px;">
        ${isSignup ? 'Regístrate con los datos legales de tu agencia o negocio — nada de esto te activa de inmediato, primero pasa por nuestro proceso de verificación.' : 'Ingresa con tu cuenta de representante para ver y responder solicitudes de clientes.'}
      </p>
      <div class="grid">
        ${isSignup ? `
        <div><label class="field-label">Nombre de la agencia / representante</label><input type="text" id="rep_auth_name" placeholder="Ej. Aduanas Cordillera S.A.S."></div>
        <div><label class="field-label">Tipo</label>
          <select id="rep_auth_type">
            <option value="agencia">Agencia de aduanas</option>
            <option value="natural">Persona natural con registro de importador</option>
            <option value="trading">Trading company / comercializadora</option>
          </select>
        </div>
        <div><label class="field-label">NIT o cédula</label><input type="text" id="rep_auth_nit" placeholder="900.123.456-7"></div>
        <div><label class="field-label">N° de licencia DIAN (si aplica)</label><input type="text" id="rep_auth_license" placeholder="Ej. RES-2024-00218"></div>
        ` : ''}
        <div><label class="field-label">Correo electrónico</label><input type="text" id="rep_auth_email" placeholder="tucorreo@agencia.com"></div>
        <div><label class="field-label">Contraseña</label><input type="password" id="rep_auth_pass" placeholder="Mínimo 8 caracteres"></div>
      </div>
      <button class="btn btn-primary" style="margin-top:12px;" onclick="repLogin('${mode}')">${isSignup ? 'Enviar a verificación' : 'Iniciar sesión'}</button>
      <div class="hint">${isSignup ? '¿Ya tienes cuenta?' : '¿Eres nuevo en la plataforma?'} <span style="color:var(--ink); font-weight:600; cursor:pointer;" onclick="renderRepLoginGate('${isSignup?'login':'signup'}')">${isSignup ? 'Inicia sesión' : 'Regístrate'}</span></div>
    </div>
  `;
}
const VERIF_STEPS_BY_TYPE = {
  agencia: [
    { k:'identidad', label:'Identidad legal (NIT + Cámara de Comercio / RUES)', auto:true },
    { k:'licencia', label:'Licencia de agencia de aduanas activa ante la DIAN', auto:false },
    { k:'poliza', label:'Vigencia de la póliza de cumplimiento', auto:false },
    { k:'cuenta', label:'Titularidad de la cuenta bancaria', auto:false },
    { k:'antecedentes', label:'Consulta en listas restrictivas (SARLAFT / UIAF)', auto:false },
    { k:'humana', label:'Verificación humana (llamada o videollamada)', auto:false }
  ],
  natural: [
    { k:'identidad', label:'Identidad legal (cédula)', auto:true },
    { k:'licencia', label:'RUT con registro de importador activo', auto:false },
    { k:'cuenta', label:'Titularidad de la cuenta bancaria', auto:false },
    { k:'antecedentes', label:'Consulta en listas restrictivas (SARLAFT / UIAF)', auto:false },
    { k:'humana', label:'Verificación humana (llamada o videollamada)', auto:false }
  ],
  trading: [
    { k:'identidad', label:'Identidad legal (NIT + Cámara de Comercio / RUES)', auto:true },
    { k:'licencia', label:'RUT con registro de importador activo', auto:false },
    { k:'cuenta', label:'Titularidad de la cuenta bancaria', auto:false },
    { k:'antecedentes', label:'Consulta en listas restrictivas (SARLAFT / UIAF)', auto:false },
    { k:'humana', label:'Verificación humana (llamada o videollamada)', auto:false }
  ]
};
function repLogin(mode){
  const email = $('rep_auth_email').value.trim();
  const pass = $('rep_auth_pass').value.trim();
  if(!email || !pass){ alert('Ingresa correo y contraseña.'); return; }
  state.repLoggedIn = true;
  state.repEmail = email;
  if(mode === 'signup'){
    state.repVerifType = $('rep_auth_type').value;
    state.repVerifStatus = {};
    VERIF_STEPS_BY_TYPE[state.repVerifType].forEach(s=>{ state.repVerifStatus[s.k] = s.auto; });
    logNotification(email, 'Recibimos tu solicitud de verificación', 'Revisamos tu identidad de inmediato; la licencia, cuenta bancaria y antecedentes suelen tardar 24–72h.');
    showRepPortalContent();
    renderRepVerificationChecklist();
  } else {
    logNotification(email, 'Iniciaste sesión como representante', 'Ya puedes ver y responder solicitudes de clientes.');
    showRepPortalContent();
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
function simulateVerifStep(){
  const steps = VERIF_STEPS_BY_TYPE[state.repVerifType];
  const next = steps.find(s=>!state.repVerifStatus[s.k]);
  if(next){ state.repVerifStatus[next.k] = true; }
  renderRepVerificationChecklist();
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
  if(badgeEl) badgeEl.innerHTML = seen===total ? `<span class="pill pill-accent">🏅 ${badgeText}</span>` : '';
}

function showRepPortalContent(){
  $('repLoginBox').innerHTML = `<div class="hint" style="margin-top:22px;">Conectado como <b>${state.repEmail}</b> · <span style="text-decoration:underline; cursor:pointer;" onclick="repLogout()">cerrar sesión</span></div>`;
  $('repPortalContent').style.display = 'block';
  renderRepVerificationChecklist();
  renderAvailabilityPanel();
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
function repLogout(){
  state.repLoggedIn = false;
  renderRepLoginGate('login');
}
function backToClientFromRep(){
  $('repShell').style.display = 'none';
  $('appShell').style.display = 'block';
  window.scrollTo(0,0);
}
function renderRepQueue(){
  if(!state.repAvailable){
    $('repQueue').innerHTML = `<div class="banner">⚪ Estás pausado — no te están llegando nuevas solicitudes. Actívate arriba cuando quieras volver a recibir clientes.</div>`;
    return;
  }
  const items = [];
  if(state.requestId && !state.repResponded && !state.rejected){
    items.push({ id:'live', client: state.contactEmail || 'Cliente en curso', prod: $('q_prod') ? $('q_prod').value : 'Pedido', folio: state.requestId, live:true });
  }
  items.push(
    { id:'m1', client:'Carolina Ruiz', prod:'Repuestos de bicicleta', folio:'SOL-1180', live:false },
    { id:'m2', client:'Andrés Pineda', prod:'Empaques biodegradables', folio:'SOL-1176', live:false }
  );
  $('repQueue').innerHTML = items.map(it=>`
    <div class="card tight" style="margin-bottom:8px; ${it.live?'border-color:var(--ink);':''}">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
        <div>
          <div style="font-weight:700; font-size:13px;">${it.client} ${it.live?'<span class=\"pill pill-accent\" style=\"margin-left:6px;\">Vivo</span>':''}</div>
          <div class="hint" style="margin:2px 0 0;">${it.prod} · Folio ${it.folio}</div>
        </div>
        <button class="btn ${it.live?'btn-primary':'btn-outline'} btn-sm" onclick="openRepForm('${it.id}')">${it.live? 'Responder ahora':'Ver (ejemplo)'}</button>
      </div>
    </div>
  `).join('');
}

function getClientContextHtml(){
  const statusObj = STATUS_OPTS.find(s=>s.v===state.status);
  const pathText = {
    A:'Va a importar a su propio nombre — te necesita como <b>agente de aduanas</b>, no como representante comercial.',
    B:'No tiene registro de importador — te necesita como <b>representante comercial</b>: la mercancía se nacionaliza a tu nombre y luego se la entregas a él.',
    C:'Es una empresa que importa a su propio nombre — te necesita como <b>agente de aduanas</b> para el despacho.'
  }[state.path] || 'No especificado.';
  const incoterm = state.incoterm || 'FOB';
  const qualityChips = [
    { ok: state.hasSupplier==='yes', label: state.hasSupplier==='yes' ? 'Ya tiene proveedor' : 'Buscando proveedor' },
    { ok: state.loggedIn, label: state.loggedIn ? 'Cuenta verificada' : 'Aún como invitado' },
    { ok: state.supplierQuoteAttached, label: state.supplierQuoteAttached ? 'Adjuntó cotización del proveedor' : 'Sin cotización de fábrica' },
    { ok: state.verif !== 'none', label: state.verif !== 'none' ? 'Pidió verificación de proveedor' : 'Sin verificación de proveedor' }
  ];
  return `
    <div class="card" style="background:var(--paper); border-style:dashed;">
      <div class="section-title">Contexto del cliente</div>
      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">
        ${qualityChips.map(c=>`<span class="pill ${c.ok?'pill-accent':'pill-muted'}">${c.ok?'✓':'○'} ${c.label}</span>`).join('')}
      </div>
      <div class="line-item"><span class="lbl">Perfil</span><span class="val" style="font-family:'Inter',sans-serif;">${statusObj ? statusObj.t : '—'}</span></div>
      <div class="line-item"><span class="lbl">¿Tiene proveedor?</span><span class="val" style="font-family:'Inter',sans-serif;">${state.hasSupplier==='yes'?'Sí':'No — pidió ayuda para buscarlo'}</span></div>
      <div class="line-item"><span class="lbl">Categoría</span><span class="val" style="font-family:'Inter',sans-serif;">${$('p_cat') ? $('p_cat').value : '—'}</span></div>
      <div class="line-item"><span class="lbl">Incoterm / ruta elegida</span><span class="val" style="font-family:'Inter',sans-serif;">${incoterm} · ${state.mode}</span></div>
      <div class="line-item"><span class="lbl">Verificación que pidió</span><span class="val" style="font-family:'Inter',sans-serif;">${verifLabels[state.verif]}</span></div>
      <div class="hint" style="margin-top:10px; padding-top:10px; border-top:1px dashed var(--line);">🧭 <b>¿Qué tipo de relación necesita?</b> ${pathText}</div>
    </div>
  `;
}

function openRepForm(id){
  const isLive = id==='live';
  $('repForm').style.display = 'block';
  if(!isLive){
    $('repForm').innerHTML = `<div class="card"><div class="section-title">Solicitud de ejemplo</div><p class="hint" style="margin-top:0;">Esta tarjeta solo ilustra cómo se ve la bandeja del representante con más volumen — no está conectada a datos reales de este demo.</p></div>`;
    $('repForm').scrollIntoView({behavior:'smooth', block:'nearest'});
    return;
  }
  const q = state.preliminaryQuote || computeQuoteLines();
  $('repForm').innerHTML = `
    ${getClientContextHtml()}
    <div class="card">
      <div class="section-title">Pedido declarado por el cliente</div>
      <div class="grid">
        <div><label class="field-label">Producto</label><input type="text" value="${$('q_prod').value}" disabled></div>
        <div><label class="field-label">Unidades</label><input type="text" value="${$('q_qty').value}" disabled></div>
        <div><label class="field-label">Peso / volumen</label><input type="text" value="${$('q_weight').value} kg · ${$('q_cbm').value} m³" disabled></div>
        <div><label class="field-label">FOB declarado (USD)</label><input type="text" value="${fmtUsd(q.fob)}" disabled></div>
      </div>
    </div>
    <div class="card">
      <div class="section-title">Tus valores reales</div>
      <p class="hint" style="margin-top:0;">Estos campos vienen prellenados con <b>nuestro estimado automático</b> — ajústalos a las tarifas reales que puedes ofrecer. Es lo que verá el cliente en su cotización confirmada.</p>
      <div class="grid">
        <div><label class="field-label">Flete real (USD)</label><input type="number" id="rr_freight" value="${q.freight.toFixed(2)}" oninput="updateRRTotal()"></div>
        <div><label class="field-label">Seguro real (USD)</label><input type="number" id="rr_insurance" value="${q.insurance.toFixed(2)}" oninput="updateRRTotal()"></div>
        <div><label class="field-label">Arancel real (%)</label><input type="number" id="rr_tariff" value="${q.tariffRate}" step="0.5" oninput="updateRRTotal()"></div>
        <div><label class="field-label">IVA (%)</label><input type="number" id="rr_iva" value="${q.ivaRate}" step="0.5" oninput="updateRRTotal()"></div>
        <div><label class="field-label">Costo verificación (USD)</label><input type="number" id="rr_verif" value="${q.verifCost}" oninput="updateRRTotal()"></div>
        <div><label class="field-label">Tu comisión / honorarios (USD)</label><input type="number" id="rr_commission" value="${q.repCommission.toFixed(2)}" oninput="updateRRTotal()"></div>
        <div><label class="field-label">Agente aduanas + portuarios (USD)</label><input type="number" id="rr_agent" value="${q.agentFee}" oninput="updateRRTotal()"></div>
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
function toggleRejectBox(){
  const box = $('rrRejectBox');
  box.style.display = box.style.display==='block' ? 'none' : 'block';
  if(box.style.display==='block') box.scrollIntoView({behavior:'smooth', block:'nearest'});
}
function updateRRTotal(){
  const fob = (state.preliminaryQuote || computeQuoteLines()).fob;
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
  const prelimTotal = state.preliminaryQuote ? state.preliminaryQuote.total : total;
  const diffPct = prelimTotal>0 ? ((total-prelimTotal)/prelimTotal*100) : 0;
  const sign = diffPct>=0?'+':'';
  $('rrTotalPreview').textContent = `Total real para el cliente: ${fmtUsd(total)}  (estimado automático era ${fmtUsd(prelimTotal)}, ${sign}${diffPct.toFixed(1)}%)`;
}
function submitRepResponse(){
  const fob = (state.preliminaryQuote || computeQuoteLines()).fob;
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
  const lockFee = state.priceLocked ? 12 : 0;
  const total = cif+tariff+iva+verifCost+repCommission+agentFee+lockFee;
  state.repRealQuote = { fob, freight, insurance, cif, tariffRate, tariff, ivaRate, iva, verifCost, repCommission, agentFee, lockFee, total };
  state.repResponded = true;
  state.repNote = $('rep_note').value;
  logNotification(state.contactEmail, `${$('quoteRepName') ? $('quoteRepName').textContent : 'Tu representante'} confirmó tu cotización`, 'La cotización confirmada con valores reales ya está disponible — vuelve a la plataforma para revisarla y aceptar.');
  $('repForm').innerHTML = `<div class="banner">✓ Enviaste la cotización confirmada con tus valores reales. El cliente ya puede verla en su vista, incluyendo tu nota.</div>`;
  renderRepQueue();
}
function submitRejection(){
  const reason = $('rr_reject_reason').value;
  const msg = $('rr_reject_msg').value.trim();
  state.rejected = true;
  state.rejectReason = reason;
  state.rejectMsg = msg;
  logNotification(state.contactEmail, 'Tu solicitud fue rechazada', `Motivo: ${reason}.${msg? ' Nota del representante: '+msg:''} Puedes elegir otro representante desde la plataforma.`);
  $('repForm').innerHTML = `<div class="banner" style="background:var(--danger-soft); border-color:var(--danger); color:#7A241F;">✗ Rechazaste la solicitud (${reason}). El cliente fue notificado y puede elegir otro representante.</div>`;
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
  { v:'natNoRut', t:'Es mi primera vez — no tengo idea de trámites', d:'No has hecho ningún trámite ante el gobierno para esto todavía. Tranquilo, la mayoría empieza así.' },
  { v:'natRutNoImp', t:'Tengo RUT (para otra cosa) pero nunca he importado', d:'Facturas o tienes otro negocio, pero nunca has usado eso para traer productos del exterior.' },
  { v:'natRutImp', t:'Ya he importado antes a mi nombre', d:'Ya hiciste el trámite que te habilita para esto (se llama "registro de importador") y puedes declarar tú mismo ante la DIAN.' },
  { v:'empNew', t:'Tengo una empresa, pero nunca ha importado', d:'Tu empresa existe legalmente, pero es la primera vez que trae algo del exterior.' },
  { v:'empExp', t:'Mi empresa ya importa seguido', d:'Ya tienen la experiencia y el trámite resuelto bajo la empresa.' }
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
  'Electrónica / tecnología': { entity:'RETIE / homologación CRC', note:'Productos eléctricos requieren certificado RETIE, y equipos con radiofrecuencia (Bluetooth, WiFi) necesitan homologación ante la CRC.' },
  'Hogar / ferretería': { entity:'ICA (si aplica)', note:'La mayoría no requiere permiso previo, pero si el producto tiene componente agrícola u orgánico, el ICA puede exigir uno.' },
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

function renderProfileResult(){
  const status = state.status, freq = $('p_freq').value, value = $('p_value').value, cat = $('p_cat').value;
  const isCompany = status==='empNew' || status==='empExp';
  let path = 'A';
  if(isCompany) path = 'C';
  else if(status==='natRutImp' && freq!=='occasional') path = 'A';
  else if(freq==='occasional' || value==='v1' || value==='v2') path='B';
  else path='A';
  state.path = path;

  const titles = {
    A:'Importar tú mismo, con RUT de importador',
    B:'Comprar a través de un representante ya registrado como importador',
    C: isCompany ? 'Continuar como empresa importadora' : 'Formalizar una empresa importadora'
  };
  const descs = {
    A:'Ya tiene sentido tramitar tu RUT como obligado aduanero y traer la mercancía a tu propio nombre. Aun así, si tu embarque supera USD 1.000 FOB, la ley exige que trabajes con una agencia de aduanas.',
    B:'Por tu frecuencia y valor actual, no compensa registrarte tú mismo todavía. Te conviene comprar a través de alguien que ya está habilitado como importador.',
    C:'Al tratarse de una empresa, lo más ordenado es formalizar el proceso bajo tu figura empresarial, apoyándote en una agencia de aduanas para cada embarque.'
  };
  const step2Content = {
    A:{ title:'Elige tu agencia de aduanas', sub:'Vas a importar a tu nombre. Necesitas un agente de aduanas para tramitar la declaración — aquí tienes opciones verificadas.' },
    B:{ title:'Elige tu representante', sub:'Estas personas o agencias ya están registradas como importadoras y pueden nacionalizar la mercancía a su nombre y entregártela.' },
    C:{ title:'Elige tu agencia de aduanas', sub:'Como empresa, tú declaras la importación — te acompaña una agencia de aduanas en cada embarque.' }
  };
  window.__step2Content = step2Content[path];

  const box = $('profileResult');
  box.style.display = 'block';
  box.innerHTML = `
    <div class="card" style="border-color:var(--ink); background:var(--lime-tint);">
      <span class="pill pill-accent">Recomendado</span>
      <div class="section-title" style="margin-top:8px;">${titles[path]}</div>
      <p style="font-size:13px; color:var(--ink-soft); line-height:1.6; margin:0 0 14px;">Para importar <b>${cat.toLowerCase()}</b>. ${descs[path]}</p>
      <button class="btn btn-primary btn-block" onclick="continueFromProfile()">Continuar →</button>
    </div>
  `;
  box.scrollIntoView({behavior:'smooth', block:'nearest'});
}
function continueFromProfile(){
  $('step2Title').textContent = window.__step2Content.title;
  $('step2Sub').textContent = window.__step2Content.sub;
  renderCompanyBanner();
  renderFilters();
  renderReps();
  goTo(1);
}
function renderCompanyBanner(){
  $('companyBanner').style.display = (state.path==='C') ? 'block' : 'none';
}

// ---------------------------------------------------------------------
// STEP 2: SOCIOS (marketplace — labels change by path)
// ---------------------------------------------------------------------
const REPS_B = [
  { id:'r1', name:'Aduanas Cordillera S.A.S.', type:'Agencia de aduanas — Nivel 1', init:'AC', tags:['Autopartes','China','India'], ops:'340 importaciones', rating:'4.9', response:'< 2h', commission:'0.8% – 1.2% del FOB', feeType:'pct', feeValue:1.0, bank:{ entity:'Bancolombia', accType:'Cuenta corriente', last4:'4821', verifiedDate:'14 mar 2026' } },
  { id:'r2', name:'Laura Peña — persona natural avalada', type:'Importadora con RUT activo', init:'LP', tags:['Textil','Ferretería'], ops:'58 importaciones', rating:'4.7', response:'< 4h', commission:'USD 90 – 180 flat', feeType:'flat', feeValue:135, bank:{ entity:'Davivienda', accType:'Cuenta de ahorros', last4:'1097', verifiedDate:'2 may 2026' } },
  { id:'r3', name:'GlobalTrade LatAm', type:'Trading company', init:'GT', tags:['Electrónica','Hogar'], ops:'1.200 importaciones', rating:'4.8', response:'< 1h', commission:'1.0% – 1.5% del FOB', feeType:'pct', feeValue:1.25, bank:{ entity:'Banco de Bogotá', accType:'Cuenta corriente', last4:'3305', verifiedDate:'9 ene 2026' } },
  { id:'r4', name:'FarmaImport Andina', type:'Agencia especialista en salud', init:'FI', tags:['Farma','Dispositivos médicos'], ops:'210 importaciones', rating:'5.0', response:'< 3h', commission:'1.2% – 1.8% del FOB', feeType:'pct', feeValue:1.5, bank:{ entity:'Bancolombia', accType:'Cuenta corriente', last4:'7710', verifiedDate:'20 jun 2026' } }
];
const REPS_A = [
  { id:'a1', name:'Aduanas Cordillera S.A.S.', type:'Agencia de aduanas — Nivel 1', init:'AC', tags:['Autopartes','China','India'], ops:'340 despachos', rating:'4.9', response:'< 2h', commission:'0.4% – 0.9% del FOB (honorarios)', feeType:'pct', feeValue:0.65, bank:{ entity:'Bancolombia', accType:'Cuenta corriente', last4:'4821', verifiedDate:'14 mar 2026' } },
  { id:'a2', name:'Roldán Customs Broker', type:'Agencia de aduanas', init:'RC', tags:['Electrónica','Hogar'], ops:'890 despachos', rating:'4.8', response:'< 3h', commission:'USD 180 – 260 flat', feeType:'flat', feeValue:220, bank:{ entity:'BBVA Colombia', accType:'Cuenta corriente', last4:'6642', verifiedDate:'11 feb 2026' } },
  { id:'a3', name:'FarmaImport Andina', type:'Agencia especialista en salud', init:'FI', tags:['Farma','Dispositivos médicos'], ops:'210 despachos', rating:'5.0', response:'< 3h', commission:'0.6% – 1.0% del FOB', feeType:'pct', feeValue:0.8, bank:{ entity:'Bancolombia', accType:'Cuenta corriente', last4:'7710', verifiedDate:'20 jun 2026' } }
];
let compareSelection = [];
let activeFilter = 'Todos';

const ORDER_HISTORY = [
  { id:'o1', prod:'Filtros de aceite automotriz', qty:500, fob:1800, weight:320, cbm:1.4, boxes:20, path:'B', repId:'r1', repName:'Aduanas Cordillera S.A.S.', mode:'AIR', verif:'basic', date:'12 jun 2026', total:3120.50 },
  { id:'o2', prod:'Correas de distribución', qty:200, fob:900, weight:140, cbm:0.6, boxes:10, path:'B', repId:'r3', repName:'GlobalTrade LatAm', mode:'LCL', verif:'none', date:'3 mar 2026', total:1780.00 }
];
function toggleHistory(){
  const panel = $('historyPanel');
  if(panel.style.display === 'block'){ panel.style.display='none'; return; }
  panel.style.display = 'block';
  panel.innerHTML = ORDER_HISTORY.map(o=>`
    <div class="card tight" style="margin-top:8px;">
      <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
        <div>
          <div style="font-weight:700; font-size:13px;">${o.prod}</div>
          <div class="hint" style="margin:2px 0 0;">${o.date} · ${o.qty} u · con ${o.repName} · total $ ${o.total.toLocaleString('en-US',{minimumFractionDigits:2})}</div>
        </div>
        <button class="btn btn-outline btn-sm" onclick="reorderPast('${o.id}')">Volver a pedir</button>
      </div>
    </div>
  `).join('');
}
function reorderPast(id){
  const o = ORDER_HISTORY.find(x=>x.id===id);
  state.path = o.path;
  state.verif = o.verif;
  state.mode = o.mode;
  chooseRep(o.repId);
  $('q_prod').value = o.prod;
  $('q_qty').value = o.qty;
  $('q_fob').value = o.fob;
  $('q_weight').value = o.weight;
  $('q_cbm').value = o.cbm;
  $('q_boxes').value = o.boxes;
  renderModeRecommend();
  document.querySelectorAll('#quoteFormBlock .card:nth-of-type(2) .choice').forEach(c=>c.classList.remove('active'));
  const el = document.querySelector(`#quoteFormBlock .card:nth-of-type(2) .choice[data-v="${o.verif}"]`);
  if(el) el.classList.add('active');
  generateQuote();
}
function currentReps(){ return state.path==='B' ? REPS_B : REPS_A; }
function allTags(){ return ['Todos', ...new Set(currentReps().flatMap(r=>r.tags))]; }
function renderFilters(){
  $('repFilters').innerHTML = allTags().map(f=>`
    <div class="filter-chip ${f===activeFilter?'active':''}" onclick="setFilter('${f}')">${f}</div>
  `).join('');
}
function setFilter(f){ activeFilter=f; renderFilters(); renderReps(); }
function renderReps(){
  const list = currentReps().filter(r=> activeFilter==='Todos' || r.tags.includes(activeFilter));
  const actionLabel = state.path==='B' ? 'Cotizar con este representante' : 'Cotizar con esta agencia';
  $('repList').innerHTML = list.map(r=>`
    <div class="rep-card">
      <div class="rep-top">
        <div class="rep-avatar">${r.init}</div>
        <div style="flex:1;">
          <div class="rep-name">${r.name}</div>
          <div class="rep-type">${r.type}</div>
          <span class="pill pill-accent">✓ Verificado</span>
          <details style="margin-top:6px;">
            <summary style="font-size:11.5px; color:var(--ink-soft); cursor:pointer; text-decoration:underline;">¿Qué verificamos?</summary>
            <p class="hint" style="margin-top:6px;">Identidad legal (NIT/Cámara de Comercio), ${state.path==='B' ? 'registro de importador activo' : 'licencia de agencia de aduanas vigente ante la DIAN'}, titularidad de su cuenta bancaria y antecedentes en listas restrictivas. Última reverificación: ${r.bank.verifiedDate}.</p>
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
  `).join('') + `<div id="compareBarSpacer" style="height:${compareSelection.length>=2?'56px':'0'};"></div>`;
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
      <div class="chat-head">${r.name} <span class="pill pill-accent">✓ Verificado</span></div>
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
function renderModeRecommend(){
  const weight = parseFloat($('q_weight').value)||0;
  const cbm = parseFloat($('q_cbm').value)||0;
  const rates = { LCL: Math.max(cbm,1)*75, FCL: 2600, AIR: Math.max(weight,45)*9.4, COURIER: weight*12 };
  const cheapest = Object.entries(rates).reduce((a,b)=> b[1]<a[1]? b:a)[0];
  const labels = { LCL:'Marítimo LCL', FCL:'Marítimo FCL', AIR:'Aéreo (carga)', COURIER:'Courier / mensajería' };
  state.mode = cheapest;
  $('modeRecommend').innerHTML = Object.entries(rates).map(([k,v])=>`
    <div class="choice ${k===state.mode?'active':''}" data-mode="${k}" onclick="pickMode('${k}')">
      <div class="radio"></div>
      <div class="choice-body"><h4>${labels[k]} ${k===cheapest?'· recomendado':''}</h4><p>Costo estimado de flete</p><span class="choice-price">≈ $${v.toFixed(0)} USD</span></div>
    </div>
  `).join('');
  $('modeNote').textContent = `Sugerencia según ${weight} kg y ${cbm} m³ declarados. Puedes elegir otra vía si el tiempo importa más que el costo.`;
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
  const groupRate = (state.mode==='LCL' && state.groupFreightOverride) ? state.groupFreightOverride : null;
  const modeRates = { LCL: groupRate ?? Math.max(cbm,1)*75, FCL:2600, AIR: Math.max(weight,45)*9.4, COURIER: weight*12 };
  const freight = freightOverride ?? (modeRates[state.mode] || 0);
  const insurance = fob*0.005;
  const cif = fob+freight+insurance;
  const tariffRate = 15, ivaRate = 19;
  const tariff = cif*(tariffRate/100);
  const iva = (cif+tariff)*(ivaRate/100);
  const verifCost = state.verif==='basic'?45: state.verif==='inspection'?180:0;
  const rep = repOverride || repById(state.selectedRepId);
  const repCommission = rep ? (rep.feeType==='flat' ? rep.feeValue : fob*(rep.feeValue/100)) : fob*0.01;
  const agentFee = 220;
  const lockFee = state.priceLocked ? 12 : 0;
  const total = cif+tariff+iva+verifCost+repCommission+agentFee+lockFee;
  return { fob, freight, insurance, cif, tariffRate, tariff, ivaRate, iva, verifCost, repCommission, agentFee, lockFee, total };
}
const fmtUsd = n => '$ '+n.toLocaleString('en-US',{minimumFractionDigits:2, maximumFractionDigits:2});
const verifLabels = { none:'Sin verificación', basic:'Verificación básica', inspection:'Inspección de sitio' };

function quoteLinesHtml(q){
  return `
    <div class="line-item"><span class="lbl">Valor FOB</span><span class="val">${fmtUsd(q.fob)}</span></div>
    <div class="line-item"><span class="lbl">Flete internacional</span><span class="val">${fmtUsd(q.freight)}</span></div>
    <div class="line-item"><span class="lbl">Seguro</span><span class="val">${fmtUsd(q.insurance)}</span></div>
    <div class="line-item"><span class="lbl">CIF</span><span class="val">${fmtUsd(q.cif)}</span></div>
    <div class="line-item"><span class="lbl">Arancel (${q.tariffRate}%)</span><span class="val">${fmtUsd(q.tariff)}</span></div>
    <div class="line-item"><span class="lbl">IVA importación (${q.ivaRate}%)</span><span class="val">${fmtUsd(q.iva)}</span></div>
    <div class="line-item"><span class="lbl">${verifLabels[state.verif]}</span><span class="val">${q.verifCost? fmtUsd(q.verifCost):'Incluido'}</span></div>
    <div class="line-item"><span class="lbl">Comisión / honorarios</span><span class="val">${fmtUsd(q.repCommission)}</span></div>
    <div class="line-item"><span class="lbl">Agente de aduanas + gastos portuarios</span><span class="val">${fmtUsd(q.agentFee)}</span></div>
    ${q.lockFee ? `<div class="line-item"><span class="lbl">🧊 Congelar precio por 48h</span><span class="val">${fmtUsd(q.lockFee)}</span></div>` : ''}
    <div class="line-item total"><span class="lbl">Total puesto en tu bodega</span><span class="val">${fmtUsd(q.total)}</span></div>
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
      ${quoteLinesHtml(q)}
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
        ${i===0?'<span class="pill pill-accent">Más económico</span>':''}
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

function sendToRepForConfirmation(){
  if(!state.contactEmail){ renderContactCapture(); return; }
  proceedToWaiting();
}
function renderContactCapture(){
  $('quoteResult').innerHTML = `
    <div class="card">
      <div class="section-title">¿A dónde te avisamos?</div>
      <p class="hint" style="margin-top:0;">${$('quoteRepName').textContent} puede tardar horas en responder — no tienes que quedarte esperando en esta pantalla. Déjanos tu correo (y WhatsApp si quieres) para avisarte apenas conteste. Esto todavía no crea una cuenta.</p>
      <div class="grid">
        <div><label class="field-label">Correo electrónico</label><input type="text" id="contact_email" placeholder="tucorreo@ejemplo.com"></div>
        <div><label class="field-label">WhatsApp (opcional)</label><input type="text" id="contact_whatsapp" placeholder="+57 300 000 0000"></div>
      </div>
      <button class="btn btn-primary" style="margin-top:12px;" onclick="submitContactAndSend()">Enviar solicitud</button>
    </div>
  `;
  $('quoteResult').scrollIntoView({behavior:'smooth', block:'nearest'});
}
function submitContactAndSend(){
  const email = $('contact_email').value.trim();
  if(!email){ alert('Ingresa un correo para poder avisarte cuando respondan.'); return; }
  state.contactEmail = email;
  state.contactWhatsapp = $('contact_whatsapp').value.trim();
  const pill = $('accountPill');
  pill.innerHTML = `<span class="dot"></span>${email}`;
  proceedToWaiting();
}
function proceedToWaiting(){
  if(!state.requestId) state.requestId = 'SOL-' + Math.floor(3000+Math.random()*900);
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
      <div class="hint" style="margin-top:14px; padding-top:12px; border-top:1px dashed var(--line);">🧪 <b>Modo demo:</b> esto normalmente lo resuelve tu representante desde su propio portal. Para verlo ahora, entra a la <span style="text-decoration:underline; cursor:pointer; font-weight:700; color:var(--ink);" onclick="goToRepPortal()">vista de representante</span> y responde la solicitud.</div>
    </div>
    <div id="clientFaqDeck" style="margin-top:14px;"></div>
  `;
  initFaqDeck('clientFaqDeck', CLIENT_FAQS, 'faqClientSeen', 'Importador informado');
  $('quoteResult').scrollIntoView({behavior:'smooth', block:'nearest'});
}
function checkRepResponse(btn){
  if(state.rejected){
    renderRejectedCard();
    return;
  }
  if(state.repResponded){
    logNotification(state.contactEmail, `${$('quoteRepName').textContent} confirmó tu cotización`, 'Ya puedes revisar los valores finales y aceptar para continuar con el pago.');
    renderConfirmedQuote();
  } else {
    const original = btn.textContent;
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
  state.rejected = false; state.repResponded = false; state.requestId = null; state.repRealQuote = null; state.contactEmail = null;
  goTo(1);
}

function renderConfirmedQuote(){
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
        <span class="pill pill-accent">✓ Confirmada por ${repName}</span>
        ${deltaHtml}
      </div>
      <div class="section-title">Cotización confirmada · ${state.mode} · ${verifLabels[state.verif]}</div>
      ${state.repNote ? `<div class="hint" style="background:var(--paper); border-radius:8px; padding:10px 12px; margin-bottom:12px;">💬 "${state.repNote}" — ${repName}</div>` : ''}
      ${quoteLinesHtml(q)}
      <div class="hint">Estos son los valores reales que aplicará ${repName}, ya con el flete cotizado a la tarifa vigente. Al aceptar, se compromete el pedido.</div>
      <div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="handleAcceptConfirmed()">Aceptar cotización confirmada</button>
        <button class="btn btn-outline">Solicitar otro ajuste</button>
      </div>
    </div>
    ${unitLinesHtml(q, qty, 'confirmed')}
  `;
}

function handleAcceptConfirmed(){
  if(state.loggedIn){ goTo(3); return; }
  renderAuthGate();
}

function renderAuthGate(mode){
  mode = mode || 'signup';
  const isLogin = mode === 'login';
  $('quoteResult').innerHTML += `
    <div class="auth-card" id="authGate" style="margin-top:14px;">
      <div class="lock-badge">🔒 Necesitas una cuenta para continuar</div>
      <p style="font-size:12.5px; color:var(--ink); line-height:1.6; margin:0 0 14px;">
        A partir de aquí compartimos tus datos y los del proveedor con ${$('quoteRepName').textContent}, y comprometemos el pago. Explorar y cotizar no requería cuenta — confirmar el pedido sí.
      </p>
      <div class="grid">
        ${isLogin ? '' : `<div><label class="field-label">Nombre completo</label><input type="text" id="auth_name" placeholder="Tu nombre"></div>`}
        <div><label class="field-label">Correo electrónico</label><input type="text" id="auth_email" value="${state.contactEmail||''}" placeholder="tucorreo@ejemplo.com"></div>
        <div><label class="field-label">Contraseña</label><input type="password" id="auth_pass" placeholder="Mínimo 8 caracteres"></div>
      </div>
      <button class="btn btn-primary" style="margin-top:12px;" onclick="createAccountAndContinue('${mode}')">${isLogin ? 'Iniciar sesión y continuar' : 'Crear cuenta y continuar'}</button>
      <div class="hint">${isLogin ? '¿Aún no tienes cuenta?' : '¿Ya tienes cuenta?'} <span style="color:var(--ink); font-weight:600; cursor:pointer;" onclick="renderAuthGateSwitch('${isLogin?'signup':'login'}')">${isLogin ? 'Crear una' : 'Inicia sesión'}</span></div>
    </div>
  `;
  $('authGate').scrollIntoView({behavior:'smooth', block:'nearest'});
}
function renderAuthGateSwitch(mode){
  $('authGate').remove();
  renderAuthGate(mode);
}

function createAccountAndContinue(mode){
  const email = $('auth_email').value.trim() || state.contactEmail || 'invitado@correo.com';
  const pass = $('auth_pass').value.trim();
  if(mode==='login' && !pass){ alert('Ingresa tu contraseña para iniciar sesión.'); return; }
  state.loggedIn = true;
  state.accountEmail = email;
  state.contactEmail = email;
  const pill = $('accountPill');
  pill.classList.add('logged');
  pill.innerHTML = `<span class="dot"></span>${email}`;
  logNotification(email, mode==='login' ? 'Iniciaste sesión' : 'Bienvenido a Conecta Importa', mode==='login' ? 'Volviste a entrar a tu cuenta.' : 'Tu cuenta quedó creada. A partir de ahora, cada avance de tu pedido llegará también a este correo.');
  goTo(3);
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
        <span class="pill ${d.ready?'pill-accent':'pill-muted'}">${d.ready?'Disponible':'Pendiente'}</span>
        <button class="btn btn-outline btn-sm" ${d.ready?'':'disabled'}>Ver</button>
      </div>
    </div>
  `).join('');
}
renderDocs();
