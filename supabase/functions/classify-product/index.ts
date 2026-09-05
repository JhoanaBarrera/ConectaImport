// Edge Function: classify-product
// -----------------------------------------------------------------------
// FUNCIÓN EXPERIMENTAL (beta) — sugerencia PRELIMINAR de categoría a partir
// de una foto del producto, para orientar al cliente en el paso 1 del
// wizard. NUNCA devuelve una subpartida arancelaria a 10 dígitos como si
// fuera definitiva: la clasificación exacta es una tarea compleja incluso
// para profesionales, y presentarla como determinación final es un riesgo
// legal real (aranceles mal calculados, permisos pasados por alto).
//
// Variables de entorno (Secrets del proyecto en Supabase):
//   ANTHROPIC_API_KEY                        -> tu llave de console.anthropic.com
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY -> Supabase ya los define
//                                                automáticamente en toda función.
// -----------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MODEL = 'claude-haiku-4-5-20251001'; // tiene capacidad de visión, bajo costo

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

const DISCLAIMER = 'Esta es una sugerencia preliminar generada automáticamente. Tu agencia de aduanas debe confirmar la clasificación arancelaria exacta antes de declarar.';

const SYSTEM_PROMPT = `Ves la foto de un producto que alguien quiere importar a Colombia. Da SOLO:
1. Una descripción breve (una frase) de qué es el producto.
2. Una sugerencia PRELIMINAR de categoría general (ej. "Electrónica de consumo", "Textil / confección",
   "Repuesto automotriz"), nunca una subpartida arancelaria de 10 dígitos ni un número de partida
   presentado como definitivo.

Responde ÚNICAMENTE en JSON válido, sin texto adicional, con esta forma exacta:
{"description":"...", "suggested_category":"..."}`;

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });

  const accountId = await getCallerAccountId(req);
  if (!accountId) {
    return new Response(JSON.stringify({ error: 'No se pudo identificar tu sesión.' }), { status: 401, headers: corsHeaders() });
  }

  let body: any;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400, headers: corsHeaders() }); }
  const { image_base64, media_type } = body;
  if (!image_base64 || typeof image_base64 !== 'string') {
    return new Response(JSON.stringify({ error: 'Falta la imagen.' }), { status: 400, headers: corsHeaders() });
  }
  if (image_base64.length > MAX_IMAGE_BYTES * 1.4) { // base64 ~1.37x el tamaño real
    return new Response(JSON.stringify({ error: 'La imagen es demasiado grande (máximo 5MB).' }), { status: 400, headers: corsHeaders() });
  }
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const mediaType = allowedTypes.includes(media_type) ? media_type : 'image/jpeg';

  let suggestion: { description: string; suggested_category: string };
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
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image_base64 } },
            { type: 'text', text: '¿Qué producto es este y a qué categoría general pertenece?' }
          ]
        }]
      })
    });
    if (!res.ok) {
      console.error('Anthropic error:', res.status, await res.text());
      throw new Error('anthropic_error');
    }
    const data = await res.json();
    const raw = (data.content || []).map((b: any) => b.text || '').join('').trim();
    suggestion = JSON.parse(raw);
    if (!suggestion.description || !suggestion.suggested_category) throw new Error('bad_shape');
  } catch (err) {
    console.error('classify-product error:', err);
    return new Response(JSON.stringify({ error: 'No pudimos analizar la imagen — intenta con otra foto o continúa sin ella.' }), { status: 500, headers: corsHeaders() });
  }

  // Guarda evidencia de la sugerencia y de que el aviso se mostró — no es
  // un dato de producto más, es evidencia de que se comunicó el límite.
  // No está ligado todavía a una quote_request (esta se crea más adelante
  // en el wizard) — el frontend reenvía este mismo bloque al armar la
  // solicitud, para guardarlo en quote_requests.ai_classification.
  const result = {
    description: suggestion.description,
    suggested_category: suggestion.suggested_category,
    disclaimer: DISCLAIMER,
    disclaimer_shown_at: new Date().toISOString(),
    account_id: accountId
  };

  return new Response(JSON.stringify(result), { headers: corsHeaders() });
});
