// Conexión a Supabase (base de datos + login real).
// La "publishable key" está pensada para ir en el código del navegador,
// por eso es segura de tener aquí — no es un secreto.
// NUNCA pongas aquí la "service_role" / "secret key".
const SUPABASE_URL = 'https://qyzuuvytadhxvmsjflos.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fHH46sHZ97S6fkKRhxTV2g_OEoW0r2i';

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;
if (!supabaseClient) {
  console.error('No se pudo cargar la librería de Supabase (revisa tu conexión a internet).');
}
