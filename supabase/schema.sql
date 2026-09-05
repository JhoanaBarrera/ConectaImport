-- ============================================================
-- CONECTA IMPORTA — esquema de base de datos (Supabase / Postgres)
-- ============================================================
-- Cómo usar este archivo:
-- 1. Entra a tu proyecto en supabase.com
-- 2. Ve al menú lateral "SQL Editor"
-- 3. Pega todo este archivo y dale "Run"
-- Esto crea todas las tablas necesarias para que la app guarde
-- datos reales en vez de perderlos al recargar la página.
-- ============================================================

-- ------------------------------------------------------------
-- PERFILES: una fila por cada persona que crea cuenta,
-- sea cliente o representante. Se conecta automáticamente con
-- el sistema de login de Supabase (auth.users).
-- ------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('client','representative')),
  full_name text,
  email text not null,
  whatsapp text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- REPRESENTANTES: datos propios de agencias / personas naturales
-- / trading companies. Uno por cada perfil con role='representative'.
-- ------------------------------------------------------------
create table representatives (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  business_name text not null,
  -- Los 4 roles legales reales (ver notas del negocio): una agencia de
  -- aduanas NO puede además ser representante comercial del proveedor.
  rep_type text not null check (rep_type in ('agencia_aduanas','agente_sourcing','agente_carga','trading_company')),
  nit_or_cedula text,
  dian_license text,
  categories text[] default '{}',
  available boolean not null default true,
  min_order_usd numeric default 0,
  commission_type text check (commission_type in ('pct','flat')),
  commission_value numeric,
  rating numeric default 0,
  operations_count integer default 0,
  bank_entity text,
  bank_account_type text,
  bank_last4 text,
  bank_verified_date date,
  -- guarda el checklist de verificación como {"identidad":true,"licencia":false,...}
  verification_status jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- SOLICITUDES DE COTIZACIÓN: el corazón del negocio.
-- Un cliente pide cotizar con un representante; el representante
-- responde con valores reales o rechaza.
-- ------------------------------------------------------------
create table quote_requests (
  id uuid primary key default gen_random_uuid(),
  folio text unique not null,
  -- Apunta a auth.users (no a profiles): un visitante anónimo ya tiene
  -- identidad real en Supabase antes de crear su fila en profiles.
  client_id uuid references auth.users(id) on delete set null,
  contact_email text not null,
  contact_whatsapp text,
  representative_id uuid not null references representatives(id),

  status text not null default 'pending'
    check (status in ('pending','responded','accepted','rejected')),

  -- lo que declara el cliente
  product_name text,
  quantity integer,
  fob_usd numeric,
  weight_kg numeric,
  volume_cbm numeric,
  boxes integer,
  shipping_mode text check (shipping_mode in ('LCL','FCL','AIR','COURIER')),
  verification_level text check (verification_level in ('none','basic','inspection')),
  incoterm text,
  price_locked boolean default false,
  supplier_quote_file_url text,

  -- cotización calculada automáticamente por la plataforma (estimado)
  preliminary_quote jsonb,

  -- lo que responde el representante con sus valores reales
  confirmed_quote jsonb,
  rep_note text,

  -- si el representante rechaza
  reject_reason text,
  reject_msg text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- PEDIDOS: se crea cuando el cliente acepta la cotización
-- confirmada y paga (transferencia directa + comprobante).
-- ------------------------------------------------------------
create table orders (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references quote_requests(id),
  receipt_file_url text,
  paid_at timestamptz,
  current_stage_index integer not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- SEGUIMIENTO DEL ENVÍO: cada vez que el representante avanza
-- una etapa (en fabricación, en tránsito, etc.) queda una fila.
-- ------------------------------------------------------------
create table shipment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  stage_index integer not null,
  note text,
  file_urls text[] default '{}',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- CALIFICACIONES del cliente al representante al final del pedido.
-- ------------------------------------------------------------
create table ratings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  representative_id uuid not null references representatives(id),
  stars integer not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- NOTIFICACIONES: reemplaza el "logNotification" que hoy solo
-- vive en pantalla. Aquí queda guardado quién debe recibir qué.
-- (El envío real de email se conecta más adelante.)
-- ------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  to_email text not null,
  subject text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SEGURIDAD (Row Level Security)
-- Por defecto, en Supabase cualquiera con la clave pública podría
-- leer o escribir cualquier fila. Esto lo bloquea: cada quien solo
-- ve y edita lo que le corresponde.
-- ============================================================
alter table profiles enable row level security;
alter table representatives enable row level security;
alter table quote_requests enable row level security;
alter table orders enable row level security;
alter table shipment_events enable row level security;
alter table ratings enable row level security;
alter table notifications enable row level security;

-- Cada quien puede ver y editar su propio perfil
create policy "profiles: leer el propio" on profiles
  for select using (auth.uid() = id);
create policy "profiles: crear el propio" on profiles
  for insert with check (auth.uid() = id);
create policy "profiles: editar el propio" on profiles
  for update using (auth.uid() = id);

-- Los representantes verificados son visibles para todos (marketplace público)
create policy "representatives: visibles para todos" on representatives
  for select using (true);
-- Pero solo el dueño del perfil puede crear/editar su propia ficha de representante
create policy "representatives: crear la propia" on representatives
  for insert with check (auth.uid() = profile_id);
create policy "representatives: editar la propia" on representatives
  for update using (auth.uid() = profile_id);

-- Solicitudes: las ve el cliente que la creó, o el representante al que va dirigida
create policy "quote_requests: ver las propias (cliente)" on quote_requests
  for select using (auth.uid() = client_id);
create policy "quote_requests: ver las propias (representante)" on quote_requests
  for select using (
    representative_id in (select id from representatives where profile_id = auth.uid())
  );
create policy "quote_requests: cliente puede crear" on quote_requests
  for insert with check (true);
create policy "quote_requests: representante puede responder" on quote_requests
  for update using (
    representative_id in (select id from representatives where profile_id = auth.uid())
  );
-- Un cliente que cotiza SIN cuenta (invitado) no tiene auth.uid(), así que
-- necesita otra forma de consultar el estado de su propia solicitud.
-- Esta política permite leer las solicitudes de invitados (client_id nulo).
-- Nota de seguridad (prototipo): esto hace que las solicitudes de invitados
-- sean técnicamente legibles por cualquiera con la llave pública que consulte
-- la tabla sin filtrar — no se expone en ningún botón de la interfaz, pero
-- antes de un lanzamiento real conviene cerrar esto (por ejemplo con sesiones
-- anónimas de Supabase, para que hasta los invitados tengan un auth.uid()).
create policy "quote_requests: invitado ve sus solicitudes" on quote_requests
  for select using (client_id is null);

-- Ahora que hasta los invitados tienen un auth.uid() real (sesión anónima),
-- el cliente dueño de la solicitud puede marcarla como aceptada él mismo.
create policy "quote_requests: cliente puede aceptar" on quote_requests
  for update using (auth.uid() = client_id)
  with check (auth.uid() = client_id and status = 'accepted');

-- Notificaciones: cada quien ve solo las suyas
create policy "notifications: ver las propias" on notifications
  for select using (auth.uid() = profile_id);

-- ============================================================
-- MIGRACIÓN: catálogo de productos para Camino B (trading companies)
-- ------------------------------------------------------------
-- Camino B es una compra local de mercancía ya nacionalizada — el
-- trading company fija un precio fijo por producto de una vez, en vez
-- de que el cliente arme una cotización de flete/aduana como en el
-- Camino A. Esta tabla guarda ese catálogo.
-- Cómo aplicar esta parte: pégala y corre en el SQL Editor de Supabase
-- (ya lo hiciste antes con otras migraciones de este mismo archivo).
-- ============================================================
create table products (
  id uuid primary key default gen_random_uuid(),
  representative_id uuid not null references representatives(id) on delete cascade,
  name text not null,
  description text,
  price_usd numeric not null,
  unit text not null default 'unidad',
  stock integer,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table products enable row level security;

-- Cualquiera puede ver los productos activos (catálogo público)
create policy "products: visibles para todos" on products
  for select using (active = true);
-- El dueño del producto también puede ver los suyos aunque estén
-- inactivos (para poder reactivarlos o editarlos desde su portal)
create policy "products: ver los propios" on products
  for select using (
    representative_id in (select id from representatives where profile_id = auth.uid())
  );
create policy "products: crear el propio" on products
  for insert with check (
    representative_id in (select id from representatives where profile_id = auth.uid())
  );
create policy "products: editar el propio" on products
  for update using (
    representative_id in (select id from representatives where profile_id = auth.uid())
  );

-- Cada solicitud/pedido de Camino B queda ligado al producto de catálogo
-- que lo originó (en Camino A esto queda en null — ahí no hay catálogo).
alter table quote_requests add column product_id uuid references products(id);

-- ============================================================
-- MIGRACIÓN: validación legal — tratamiento de datos + figura tributaria
-- ------------------------------------------------------------
-- Cómo aplicar: pégala y corre en el SQL Editor de Supabase, igual que
-- las migraciones anteriores de este archivo.
-- ============================================================
-- Queda registro de cuándo aceptó cada quien la política de tratamiento
-- de datos personales (Ley 1581 de 2012) — evidencia mínima de consentimiento.
alter table profiles add column privacy_accepted_at timestamptz;

-- Prepara el dato de qué figura tributaria tiene el representante
-- (persona natural o jurídica) para cuando se defina el régimen aplicable
-- a cada tipo — no cambia ningún flujo todavía, solo lo deja capturado.
alter table representatives add column legal_person_type text check (legal_person_type in ('natural','juridica'));

-- ============================================================
-- MIGRACIÓN: chat de soporte con IA (alcance acotado a FAQ)
-- ------------------------------------------------------------
-- Guarda cada conversación para que Jhoana pueda revisar calidad
-- periódicamente (directo en el SQL Editor o el Table Editor de
-- Supabase — no hay panel propio en la app todavía).
-- Los mensajes los escribe la Edge Function support-chat con la
-- service_role key (no el navegador), por eso no hace falta una
-- policy de "insert" para el cliente.
-- Cómo aplicar: pégala y corre en el SQL Editor de Supabase.
-- ============================================================
create table chat_conversations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references auth.users(id) on delete set null,
  escalated boolean not null default false,
  created_at timestamptz not null default now()
);
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
alter table chat_conversations enable row level security;
alter table chat_messages enable row level security;
create policy "chat_conversations: ver las propias" on chat_conversations
  for select using (auth.uid() = account_id);
create policy "chat_messages: ver las propias" on chat_messages
  for select using (
    conversation_id in (select id from chat_conversations where account_id = auth.uid())
  );

-- ============================================================
-- MIGRACIÓN: sugerencia de clasificación arancelaria por imagen (beta)
-- ------------------------------------------------------------
-- Guarda la sugerencia generada y evidencia de que el aviso de "esto no
-- es una clasificación definitiva" sí se mostró — no es solo un dato de
-- producto, es evidencia de que se comunicó el límite de la sugerencia.
-- Cómo aplicar: pégala y corre en el SQL Editor de Supabase.
-- ============================================================
alter table quote_requests add column ai_classification jsonb;
alter table quote_requests add column ai_classification_disclaimer_shown_at timestamptz;

-- ============================================================
-- MIGRACIÓN: seguridad — políticas de RLS que faltaban, verificación
-- manual de representantes, solicitudes de eliminación de datos, log de
-- errores del cliente, e índices para las columnas más consultadas.
-- ------------------------------------------------------------
-- Cómo aplicar: pégala y corre en el SQL Editor de Supabase.
-- ============================================================

-- "orders", "shipment_events" y "ratings" ya tenían Row Level Security
-- ACTIVADO desde el inicio, pero nunca se les creó ninguna política —
-- eso significa que hoy, con solo la llave pública, NADIE puede leerlas
-- ni escribirlas (ni el cliente dueño ni su representante). Sin estas
-- políticas, el seguimiento del pedido no puede funcionar de verdad.
create policy "orders: ver las propias (cliente)" on orders
  for select using (
    quote_request_id in (select id from quote_requests where client_id = auth.uid())
  );
create policy "orders: ver las propias (representante)" on orders
  for select using (
    quote_request_id in (
      select qr.id from quote_requests qr
      join representatives r on r.id = qr.representative_id
      where r.profile_id = auth.uid()
    )
  );
create policy "orders: cliente puede crear la propia" on orders
  for insert with check (
    quote_request_id in (select id from quote_requests where client_id = auth.uid())
  );
create policy "orders: representante puede avanzar etapa" on orders
  for update using (
    quote_request_id in (
      select qr.id from quote_requests qr
      join representatives r on r.id = qr.representative_id
      where r.profile_id = auth.uid()
    )
  );

create policy "shipment_events: ver los propios (cliente)" on shipment_events
  for select using (
    order_id in (
      select o.id from orders o
      join quote_requests qr on qr.id = o.quote_request_id
      where qr.client_id = auth.uid()
    )
  );
create policy "shipment_events: ver los propios (representante)" on shipment_events
  for select using (
    order_id in (
      select o.id from orders o
      join quote_requests qr on qr.id = o.quote_request_id
      join representatives r on r.id = qr.representative_id
      where r.profile_id = auth.uid()
    )
  );
create policy "shipment_events: representante puede registrar avance" on shipment_events
  for insert with check (
    order_id in (
      select o.id from orders o
      join quote_requests qr on qr.id = o.quote_request_id
      join representatives r on r.id = qr.representative_id
      where r.profile_id = auth.uid()
    )
  );

-- Las calificaciones son prueba social pública (como el rating agregado
-- del representante, que ya es visible para todos en el marketplace).
create policy "ratings: visibles para todos" on ratings
  for select using (true);
create policy "ratings: cliente puede calificar su propio pedido" on ratings
  for insert with check (
    order_id in (
      select o.id from orders o
      join quote_requests qr on qr.id = o.quote_request_id
      where qr.client_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- Verificación manual de representantes (nunca autocertificada)
-- ------------------------------------------------------------
-- Antes, un botón de demo dejaba que el representante avanzara su propio
-- checklist de verificación — se quitó del frontend, y esto lo cierra
-- también a nivel de base de datos: aunque alguien intente llamar a la
-- API directamente con la llave pública, no puede tocar estas columnas.
-- Deja verified_at/verified_by para que quede registro de fecha y quién
-- hizo la verificación manual (por ahora, el equipo de Conecta Importa
-- directamente en el Table Editor de Supabase).
alter table representatives add column verified_at timestamptz;
alter table representatives add column verified_by text;

revoke update on representatives from authenticated, anon;
grant update (
  business_name, categories, available, min_order_usd,
  commission_type, commission_value, bank_entity, bank_account_type,
  bank_last4, legal_person_type
) on representatives to authenticated;
-- nit_or_cedula, dian_license, rep_type, verification_status, rating,
-- operations_count, verified_at, verified_by, profile_id quedan fuera:
-- solo se editan desde el Table Editor de Supabase (o una función propia
-- con service_role, si más adelante se construye un panel de admin).

-- ------------------------------------------------------------
-- Solicitud de eliminación de datos (Ley 1581 de 2012)
-- ------------------------------------------------------------
-- No se borra automáticamente al pedirlo (borrar en cascada sin
-- supervisión es riesgoso) — queda registrada la solicitud, con fecha,
-- para que el equipo la atienda y confirme por ese mismo medio.
create table data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references auth.users(id) on delete set null,
  contact_email text not null,
  note text,
  status text not null default 'pending' check (status in ('pending','done')),
  created_at timestamptz not null default now()
);
alter table data_deletion_requests enable row level security;
create policy "data_deletion_requests: crear la propia" on data_deletion_requests
  for insert with check (auth.uid() = account_id);
create policy "data_deletion_requests: ver las propias" on data_deletion_requests
  for select using (auth.uid() = account_id);

-- ------------------------------------------------------------
-- Log de errores del cliente (sin depender de que el usuario los reporte)
-- ------------------------------------------------------------
create table client_error_logs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references auth.users(id) on delete set null,
  message text not null,
  stack text,
  url text,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table client_error_logs enable row level security;
create policy "client_error_logs: cualquiera puede reportar" on client_error_logs
  for insert with check (true);
-- Nadie puede leerlos con la llave pública (ni siquiera el que lo mandó) —
-- son para revisión del equipo desde el Table Editor de Supabase.

-- ------------------------------------------------------------
-- Índices en las columnas más consultadas (listados del wizard, portal
-- de representante, catálogo)
-- ------------------------------------------------------------
create index if not exists idx_quote_requests_representative_id on quote_requests(representative_id);
create index if not exists idx_quote_requests_client_id on quote_requests(client_id);
create index if not exists idx_quote_requests_status on quote_requests(status);
create index if not exists idx_representatives_profile_id on representatives(profile_id);
create index if not exists idx_products_representative_id on products(representative_id);
create index if not exists idx_orders_quote_request_id on orders(quote_request_id);
create index if not exists idx_shipment_events_order_id on shipment_events(order_id);
