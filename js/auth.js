// ---------------------------------------------------------------------
// AUTENTICACIÓN REAL (Supabase) — reemplaza las cuentas de mentira.
// Crea la sesión (login) en Supabase Auth, y además una fila en
// "profiles" (y en "representatives" si aplica) para guardar los
// datos propios de la app. Todo lo demás (state.loggedIn, etc.)
// sigue funcionando igual que antes para no romper el resto del código.
// ---------------------------------------------------------------------

function requireSupabase(){
  if(!supabaseClient){
    alert('No hay conexión con la base de datos ahora mismo. Revisa tu internet e intenta de nuevo.');
    return false;
  }
  return true;
}

function friendlyAuthError(err){
  const msg = (err && err.message) || '';
  if(/already registered/i.test(msg)) return 'Ya existe una cuenta con ese correo — intenta iniciar sesión en vez de crear una nueva.';
  if(/invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.';
  if(/email not confirmed/i.test(msg)) return 'Debes confirmar tu correo antes de iniciar sesión — revisa tu bandeja de entrada (y la carpeta de spam).';
  if(/password should be at least/i.test(msg)) return 'La contraseña debe tener al menos 6 caracteres.';
  return msg || 'Ocurrió un error inesperado. Intenta de nuevo.';
}

// Se asegura de que exista una fila en "profiles" para la sesión actual.
// La crea usando los datos que se guardaron al registrarse (user_metadata)
// si todavía no existe (por ejemplo, la primera vez que inicia sesión
// después de confirmar el correo).
async function ensureProfile(session){
  const { data: existing } = await supabaseClient
    .from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  if(existing) return existing;
  const meta = session.user.user_metadata || {};
  const { data: created, error } = await supabaseClient
    .from('profiles')
    .insert({
      id: session.user.id,
      role: meta.role || 'client',
      full_name: meta.full_name || null,
      email: session.user.email,
      whatsapp: meta.whatsapp || null,
      privacy_accepted_at: meta.privacy_accepted_at || null
    })
    .select().single();
  if(error) throw error;
  return created;
}

// Igual que ensureProfile, pero para la ficha propia de representante.
async function ensureRepresentative(session, profile){
  if(profile.role !== 'representative') return null;
  const { data: existing } = await supabaseClient
    .from('representatives').select('*').eq('profile_id', session.user.id).maybeSingle();
  if(existing) return existing;
  const meta = session.user.user_metadata || {};
  const repType = meta.rep_type || 'agencia_aduanas';
  const steps = VERIF_STEPS_BY_TYPE[repType] || VERIF_STEPS_BY_TYPE.agencia_aduanas;
  const verificationStatus = {};
  steps.forEach(s => { verificationStatus[s.k] = !!s.auto; });
  const { data: created, error } = await supabaseClient
    .from('representatives')
    .insert({
      profile_id: session.user.id,
      business_name: meta.business_name || 'Representante',
      rep_type: repType,
      nit_or_cedula: meta.nit_or_cedula || null,
      dian_license: meta.dian_license || null,
      legal_person_type: meta.legal_person_type || null,
      verification_status: verificationStatus
    })
    .select().single();
  if(error) throw error;
  return created;
}

// Se asegura de que exista ALGUNA sesión, aunque sea anónima. Así, incluso
// un visitante que nunca crea cuenta tiene una identidad real de Supabase
// (auth.uid() no nulo) — eso es lo que permite que sus propias solicitudes
// de cotización queden protegidas por las mismas reglas que las de un
// cliente con cuenta, en vez de tener que dejarlas visibles sin filtro.
async function ensureSession(){
  if(!supabaseClient) return null;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if(session) return session;
  const { data, error } = await supabaseClient.auth.signInAnonymously();
  if(error){ console.error('No se pudo iniciar sesión anónima:', error); return null; }
  return data.session;
}

// Al abrir la página, revisa si ya había una sesión guardada (Supabase
// la recuerda sola en el navegador) para no pedir login otra vez.
async function restoreSession(){
  if(!supabaseClient) return;
  const session = await ensureSession();
  if(!session) return;
  if(session.user.is_anonymous){
    // Invitado sin cuenta: no está "loggedIn" para la interfaz, pero ya
    // tiene un id real que usamos como client_id al pedir una cotización.
    state.accountId = session.user.id;
    return;
  }
  try{
    const profile = await ensureProfile(session);
    if(profile.role === 'client'){
      state.loggedIn = true;
      state.accountId = profile.id;
      state.accountEmail = profile.email;
      state.contactEmail = profile.email;
      updateAccountPillIfLogged();
    } else if(profile.role === 'representative'){
      const rep = await ensureRepresentative(session, profile);
      state.repLoggedIn = true;
      state.repEmail = profile.email;
      if(rep){
        state.repVerifType = rep.rep_type;
        state.repVerifStatus = rep.verification_status || {};
        state.repRecordId = rep.id;
        state.repAvailable = rep.available;
        state.repMinOrder = rep.min_order_usd || 0;
      }
    }
  } catch(err){
    console.error('No se pudo restaurar la sesión:', err);
  }
}
// Nota: restoreSession() se llama al final de app.js, no aquí, porque
// necesita funciones (state, $, VERIF_STEPS_BY_TYPE...) que se definen ahí.

// Crea la cuenta real de un cliente/representante. Si ya venía navegando
// con una sesión anónima (por ejemplo, porque ya había pedido una
// cotización como invitado), la "convierte" en cuenta real en vez de crear
// una nueva — así no pierde lo que ya había hecho.
async function upgradeOrSignUp(email, password, metadata){
  const { data: { session: existing } } = await supabaseClient.auth.getSession();
  if(existing && existing.user.is_anonymous){
    const { error } = await supabaseClient.auth.updateUser({ email, password, data: metadata });
    if(error) throw error;
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session;
  }
  const { data, error } = await supabaseClient.auth.signUp({ email, password, options: { data: metadata } });
  if(error) throw error;
  return data.session;
}

async function clientLogout(){
  if(supabaseClient) await supabaseClient.auth.signOut();
  state.loggedIn = false;
  state.accountId = null;
  state.accountEmail = null;
  state.contactEmail = null;
  const pill = $('accountPill');
  if(pill){
    pill.classList.remove('logged');
    pill.innerHTML = '<span class="dot"></span>Invitado';
  }
  backToLanding();
  const anonSession = await ensureSession();
  if(anonSession) state.accountId = anonSession.user.id;
}
function handleAccountPillClick(){
  if(!state.loggedIn) return;
  if(confirm('¿Cerrar tu sesión?')) clientLogout();
}
