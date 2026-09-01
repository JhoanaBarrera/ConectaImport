// Edge Function: notify
// -----------------------------------------------------------------------
// Recibe eventos de la tabla `quote_requests` (vía Database Webhooks de
// Supabase) y envía el correo correspondiente con Resend:
//   - Nueva solicitud (INSERT)              -> avisa al representante
//   - Cotización confirmada (status:responded) -> avisa al cliente
//   - Solicitud rechazada (status:rejected)     -> avisa al cliente
//   - Cliente aceptó (status:accepted)          -> avisa al representante
//
// Variables de entorno que necesita (se configuran como "Secrets" del
// proyecto en Supabase, nunca se escriben aquí):
//   RESEND_API_KEY              -> tu llave de resend.com
//   WEBHOOK_SECRET               -> una clave inventada por ti, para que
//                                    solo tus propios webhooks puedan
//                                    llamar a esta función
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY -> Supabase ya los define
//                                    automáticamente en toda función.
//   SITE_URL                     -> (opcional) el link de tu app publicada
// -----------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_URL = Deno.env.get('SITE_URL') || 'https://jhoanabarrera.github.io/ConectaImport/';
const FROM_ADDRESS = 'Conecta Importa <onboarding@resend.dev>';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html })
  });
  if (!res.ok) {
    console.error('Resend error:', res.status, await res.text());
  }
}

async function getRepEmail(representativeId: string): Promise<string | null> {
  const { data: rep } = await supabaseAdmin
    .from('representatives')
    .select('profile_id')
    .eq('id', representativeId)
    .maybeSingle();
  if (!rep) return null;
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('id', rep.profile_id)
    .maybeSingle();
  return profile?.email ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const { type, table, record, old_record } = payload;
  if (table !== 'quote_requests') {
    return new Response('ignored', { status: 200 });
  }

  try {
    if (type === 'INSERT') {
      const repEmail = await getRepEmail(record.representative_id);
      if (repEmail) {
        await sendEmail(
          repEmail,
          `Nueva solicitud de cotización — Folio ${record.folio}`,
          `<p>Tienes una nueva solicitud de <b>${record.contact_email}</b> para <b>${record.product_name || 'un pedido'}</b>.</p>
           <p>Folio: ${record.folio}</p>
           <p><a href="${SITE_URL}">Entra a tu portal de representante para responder</a>.</p>`
        );
      }
    } else if (type === 'UPDATE' && old_record && record.status !== old_record.status) {
      if (record.status === 'responded') {
        await sendEmail(
          record.contact_email,
          `Tu cotización ya fue confirmada — Folio ${record.folio}`,
          `<p>Tu representante ya confirmó tu cotización con valores reales.</p>
           <p><a href="${SITE_URL}">Entra a Conecta Importa para revisarla y aceptar</a>.</p>
           <p>Folio: ${record.folio}</p>`
        );
      } else if (record.status === 'rejected') {
        await sendEmail(
          record.contact_email,
          `Tu solicitud fue rechazada — Folio ${record.folio}`,
          `<p>Motivo: ${record.reject_reason || 'No especificado'}.${record.reject_msg ? ' ' + record.reject_msg : ''}</p>
           <p><a href="${SITE_URL}">Entra a Conecta Importa para elegir otro representante</a>.</p>`
        );
      } else if (record.status === 'accepted') {
        const repEmail = await getRepEmail(record.representative_id);
        if (repEmail) {
          await sendEmail(
            repEmail,
            `El cliente aceptó tu cotización — Folio ${record.folio}`,
            `<p><b>${record.contact_email}</b> aceptó tu cotización confirmada y va a proceder con el pago.</p>
             <p>Folio: ${record.folio}</p>`
          );
        }
      }
    }
  } catch (err) {
    console.error('notify function error:', err);
  }

  return new Response('ok', { status: 200 });
});
