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
