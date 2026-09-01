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
      whatsapp: meta.whatsapp || null
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
  const repType = meta.rep_type || 'natural';
  const steps = VERIF_STEPS_BY_TYPE[repType] || VERIF_STEPS_BY_TYPE.natural;
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
      verification_status: verificationStatus
    })
    .select().single();
  if(error) throw error;
  return created;
}

// Al abrir la página, revisa si ya había una sesión guardada (Supabase
// la recuerda sola en el navegador) para no pedir login otra vez.
async function restoreSession(){
  if(!supabaseClient) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if(!session) return;
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
}
function handleAccountPillClick(){
  if(!state.loggedIn) return;
  if(confirm('¿Cerrar tu sesión?')) clientLogout();
}
