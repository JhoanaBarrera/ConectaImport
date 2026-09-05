// Edge Function: support-chat
// -----------------------------------------------------------------------
// Chat de soporte simple: responde dudas sobre CÓMO FUNCIONA la plataforma
// (pasos del wizard, fee de activación, Camino A vs B, incoterms, roles de
// representante) — nunca asesoría sobre un caso real de importación de
// quien pregunta (montos de su pedido, clasificación de su producto,
// plazos puntuales, disputas con su representante).
//
// Por qué API directa y no una plataforma de automatización como Dapta:
// al volumen esperado (cientos de clientes, pocas preguntas cada uno),
// llamar directo a la API de Claude cuesta unos pocos dólares al mes
// (se paga por uso), muy por debajo de una suscripción a una plataforma
// pensada para flujos de negocio mucho más amplios que "responder FAQ".
//
// Variables de entorno que necesita (Secrets del proyecto en Supabase,
// nunca se escriben aquí):
//   ANTHROPIC_API_KEY                        -> tu llave de console.anthropic.com
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY -> Supabase ya los define
//                                                automáticamente en toda función.
// -----------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// El modelo más económico que resuelve bien preguntas de alcance acotado —
// el volumen es bajo y el dominio (FAQ de la plataforma) es angosto.
const MODEL = 'claude-haiku-4-5-20251001';

// Evita que una sola cuenta (o un script) dispare el costo de uso de la
// API — no es un límite de negocio, solo un tope de abuso razonable.
const RATE_LIMIT_MESSAGES = 30;
const RATE_LIMIT_WINDOW_HOURS = 1;

const SYSTEM_PROMPT = `Eres el asistente virtual de soporte de Conecta Importa, una plataforma
colombiana que conecta personas que quieren importar con representantes verificados
(agencia de aduanas, agente de sourcing, agente de carga, trading company).

TU ÚNICO ALCANCE: explicar cómo funciona la plataforma. Ejemplos de lo que sí respondes:
- Los pasos del wizard: (1) contar qué quiere traer y su situación tributaria, (2) elegir
  representante o revisar el catálogo, (3) cotizar, (4) pagar y hacer seguimiento.
- Camino A (importar a su propio nombre, con RUT de importador, requiere agencia de aduanas
  si el FOB supera USD 1.000) vs Camino B (comprar ya nacionalizada a un trading company,
  sin trámite propio, pagando un poco más por su margen).
- Qué es un incoterm (FOB, CIF, DDP) en términos simples.
- Qué es el fee de activación: un cobro aparte de la plataforma (no de la comisión del
  representante), por tramos de valor FOB, que siempre se muestra antes de aceptar.
- Que el pago del pedido siempre es transferencia DIRECTA a la cuenta del representante —
  la plataforma nunca recibe ni retiene ese dinero.
- Los 4 roles de representante y en qué se diferencian legalmente.
- Cómo verifica la plataforma a un representante (identidad y, según el tipo, licencia).

LO QUE NUNCA HACES — ante cualquiera de estos, NO improvises una respuesta; usa el mensaje
de redirección de abajo:
- Asesoría sobre un caso específico de importación de quien pregunta: montos de SU pedido,
  clasificación arancelaria de SU producto, plazos de SU pedido puntual, disputas con SU
  representante, si SU producto necesita un permiso específico.
- Cualquier cosa que no sea sobre el funcionamiento de la plataforma.

Mensaje de redirección a usar (adáptalo, no lo copies literal siempre): "Eso depende de tu
caso particular — tu agencia de aduanas puede confirmártelo, o puedes hablar con una persona
del equipo aquí." Y recuerda que el botón "Hablar con una persona" siempre está visible.

Identifícate como asistente virtual (no una persona) si te preguntan quién eres. Responde en
español, corto y claro (2-4 frases), sin inventar datos que no están arriba.`;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function corsHeaders(){
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json'
  };
}

async function getCallerAccountId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(jwt);
  if (error || !data?.user) return null;
  return data.user.id;
}

async function isRateLimited(accountId: string): Promise<boolean> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from('chat_messages')
    .select('id, chat_conversations!inner(account_id)', { count: 'exact', head: true })
    .eq('role', 'user')
    .eq('chat_conversations.account_id', accountId)
    .gte('created_at', since);
  return (count ?? 0) >= RATE_LIMIT_MESSAGES;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });

  const accountId = await getCallerAccountId(req);
  if (!accountId) {
    return new Response(JSON.stringify({ error: 'No se pudo identificar tu sesión.' }), { status: 401, headers: corsHeaders() });
  }

  let body: any;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400, headers: corsHeaders() }); }
  const { message, conversation_id } = body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return new Response(JSON.stringify({ error: 'Falta el mensaje.' }), { status: 400, headers: corsHeaders() });
  }
  if (message.length > 2000) {
    return new Response(JSON.stringify({ error: 'Mensaje demasiado largo.' }), { status: 400, headers: corsHeaders() });
  }

  if (await isRateLimited(accountId)) {
    return new Response(JSON.stringify({
      error: 'Has hecho muchas preguntas seguidas — espera un momento e intenta de nuevo, o usa el botón "Hablar con una persona".'
    }), { status: 429, headers: corsHeaders() });
  }

  // Conversación: reusa la que venga del cliente, o crea una nueva ligada
  // a la cuenta (incluso invitados anónimos ya tienen auth.uid() real).
  let convId = conversation_id as string | null;
  if (convId) {
    const { data: conv } = await supabaseAdmin
      .from('chat_conversations').select('id, account_id').eq('id', convId).maybeSingle();
    if (!conv || conv.account_id !== accountId) convId = null;
  }
  if (!convId) {
    const { data: created, error } = await supabaseAdmin
      .from('chat_conversations').insert({ account_id: accountId }).select().single();
    if (error) return new Response(JSON.stringify({ error: 'No se pudo iniciar la conversación.' }), { status: 500, headers: corsHeaders() });
    convId = created.id;
  }

  // Historial reciente para contexto (suficiente para un FAQ, no hace
  // falta cargar toda la conversación).
  const { data: history } = await supabaseAdmin
    .from('chat_messages')
    .select('role, content')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
    .limit(20);

  const { error: userInsertError } = await supabaseAdmin
    .from('chat_messages').insert({ conversation_id: convId, role: 'user', content: message });
  if (userInsertError) {
    return new Response(JSON.stringify({ error: 'No se pudo guardar tu mensaje.' }), { status: 500, headers: corsHeaders() });
  }

  const messages = [...(history || []), { role: 'user', content: message }]
    .map(m => ({ role: m.role, content: m.content }));

  let replyText: string;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages
      })
    });
    if (!res.ok) {
      console.error('Anthropic error:', res.status, await res.text());
      throw new Error('anthropic_error');
    }
    const data = await res.json();
    replyText = (data.content || []).map((b: any) => b.text || '').join('').trim()
      || 'No pude generar una respuesta — intenta de nuevo o habla con una persona del equipo.';
  } catch (err) {
    console.error('support-chat error:', err);
    replyText = 'Tuvimos un problema técnico respondiendo tu pregunta. Puedes intentar de nuevo, o hablar con una persona del equipo con el botón de abajo.';
  }

  await supabaseAdmin
    .from('chat_messages').insert({ conversation_id: convId, role: 'assistant', content: replyText });

  return new Response(JSON.stringify({ reply: replyText, conversation_id: convId }), { headers: corsHeaders() });
});
