-- ============================================================================
-- SmartLar — esquema da base de dados (PostgreSQL / Supabase)
-- Execute este ficheiro em: Supabase > SQL Editor > New query > Run
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
do $$ begin
  create type payment_method as enum ('mpesa', 'emola', 'cod');
exception when duplicate_object then null; end $$;

-- Instalações antigas já tinham o tipo sem 'cod' (pagamento na entrega): adiciona se faltar.
alter type payment_method add value if not exists 'cod';

do $$ begin
  create type payment_status as enum ('pending', 'awaiting_confirmation', 'paid', 'failed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('new', 'payment_pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_status as enum ('pending', 'sent', 'failed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Categorias
-- ---------------------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  position int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Produtos
-- Preços em MZN, guardados em CENTAVOS (inteiros) para evitar erros de vírgula
-- flutuante. 2.099,00 MT => 209900
-- ---------------------------------------------------------------------------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sku text unique,
  short_description text,
  description text,
  category_id uuid references categories(id) on delete set null,
  price_cents int not null check (price_cents >= 0),
  compare_at_price_cents int check (compare_at_price_cents >= 0),
  images text[] not null default '{}',
  stock int not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  is_new boolean not null default false,
  sales_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_idx on products (category_id);
create index if not exists products_active_idx on products (is_active);
create index if not exists products_created_idx on products (created_at desc);

-- ---------------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  alternative_phone text,
  province text not null,
  city text not null,
  neighborhood text not null,
  address_reference text not null,
  created_at timestamptz not null default now()
);

create index if not exists customers_phone_idx on customers (phone);

-- ---------------------------------------------------------------------------
-- Encomendas
-- ---------------------------------------------------------------------------
create sequence if not exists order_number_seq start 1;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references customers(id) on delete restrict,
  subtotal_cents int not null,
  delivery_fee_cents int not null default 0,
  total_cents int not null,
  payment_method payment_method not null,
  payment_status payment_status not null default 'pending',
  order_status order_status not null default 'new',
  notes text,
  idempotency_key text unique,
  -- Meta Pixel / Conversions API: mesmo event_id nos dois lados (deduplicação)
  purchase_event_id uuid not null default gen_random_uuid(),
  purchase_tracked_at timestamptz,
  capi_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists orders_status_idx on orders (order_status);
create index if not exists orders_payment_status_idx on orders (payment_status);

-- ---------------------------------------------------------------------------
-- Itens da encomenda (com snapshot de nome e preço)
-- ---------------------------------------------------------------------------
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name_snapshot text not null,
  product_image_snapshot text,
  quantity int not null check (quantity > 0),
  unit_price_cents int not null check (unit_price_cents >= 0),
  subtotal_cents int not null check (subtotal_cents >= 0)
);

create index if not exists order_items_order_idx on order_items (order_id);

-- ---------------------------------------------------------------------------
-- Pagamentos
-- ---------------------------------------------------------------------------
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  method payment_method not null,
  payer_phone text,
  transaction_reference text,
  receipt_url text,
  status payment_status not null default 'pending',
  confirmed_at timestamptz,
  confirmed_by text,
  created_at timestamptz not null default now()
);

create index if not exists payments_order_idx on payments (order_id);

-- ---------------------------------------------------------------------------
-- Notificações (WhatsApp e futuros canais)
-- ---------------------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  channel text not null default 'whatsapp',
  audience text not null default 'admin', -- admin | customer
  recipient text,
  payload_preview text,
  status notification_status not null default 'pending',
  attempts int not null default 0,
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notifications_order_idx on notifications (order_id);
create index if not exists notifications_status_idx on notifications (status);

-- ---------------------------------------------------------------------------
-- Subscrições de notificações push (navegador/telemóvel, PWA instalada)
-- ---------------------------------------------------------------------------
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  admin_email text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Registo de eventos (auditoria simples, sem dados sensíveis)
-- ---------------------------------------------------------------------------
create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  event text not null,
  detail text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Configurações do site (apenas valores não sensíveis)
-- ---------------------------------------------------------------------------
create table if not exists site_settings (
  id int primary key default 1 check (id = 1),
  store_name text not null default 'SmartLar',
  tagline text not null default 'Inovação • Conforto • Para o seu lar.',
  contact_whatsapp text,
  contact_email text,
  mpesa_number text default '858910700',
  emola_number text default '870253638',
  mpesa_enabled boolean not null default true,
  emola_enabled boolean not null default true,
  cod_enabled boolean not null default true,
  delivery_fee_cents int not null default 0,
  free_delivery_threshold_cents int,
  delivery_areas text[] not null default array['Maputo', 'Matola'],
  announcement text,
  updated_at timestamptz not null default now()
);

insert into site_settings (id) values (1) on conflict (id) do nothing;

-- Instalações antigas já tinham a tabela sem esta coluna: adiciona se faltar.
alter table site_settings add column if not exists cod_enabled boolean not null default true;

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_updated_at on products;
create trigger products_updated_at before update on products
  for each row execute function set_updated_at();

drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at before update on orders
  for each row execute function set_updated_at();

drop trigger if exists notifications_updated_at on notifications;
create trigger notifications_updated_at before update on notifications
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Número do pedido: SL-000001, SL-000002, ...
-- ---------------------------------------------------------------------------
create or replace function next_order_number() returns text as $$
begin
  return 'SL-' || lpad(nextval('order_number_seq')::text, 6, '0');
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- create_order: cria cliente + encomenda + itens + pagamento numa só transação.
-- Revalida preços na base de dados, verifica stock, calcula o total no servidor
-- e reserva o stock de forma segura (linhas bloqueadas com FOR UPDATE).
--
-- payload esperado:
-- {
--   "idempotency_key": "uuid",
--   "customer": { "name", "phone", "alternative_phone", "province", "city",
--                 "neighborhood", "address_reference" },
--   "items": [{ "product_id": "uuid", "quantity": 2 }],
--   "payment": { "method": "mpesa", "payer_phone", "transaction_reference", "receipt_url" },
--   "notes": "texto opcional"
-- }
-- ---------------------------------------------------------------------------
create or replace function create_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := nullif(payload->>'idempotency_key', '');
  v_existing orders%rowtype;
  v_customer_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_product products%rowtype;
  v_qty int;
  v_line_subtotal int;
  v_subtotal int := 0;
  v_delivery_fee int;
  v_method payment_method;
begin
  -- Idempotência: mesma chave devolve a encomenda já criada
  if v_key is not null then
    select * into v_existing from orders where idempotency_key = v_key;
    if found then
      return jsonb_build_object(
        'order_id', v_existing.id,
        'order_number', v_existing.order_number,
        'total_cents', v_existing.total_cents,
        'purchase_event_id', v_existing.purchase_event_id,
        'duplicate', true
      );
    end if;
  end if;

  if jsonb_array_length(coalesce(payload->'items', '[]'::jsonb)) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  v_method := (payload->'payment'->>'method')::payment_method;
  select coalesce(delivery_fee_cents, 0) into v_delivery_fee from site_settings where id = 1;
  v_delivery_fee := coalesce(v_delivery_fee, 0);

  insert into customers (name, phone, alternative_phone, province, city, neighborhood, address_reference)
  values (
    payload->'customer'->>'name',
    payload->'customer'->>'phone',
    nullif(payload->'customer'->>'alternative_phone', ''),
    payload->'customer'->>'province',
    payload->'customer'->>'city',
    payload->'customer'->>'neighborhood',
    payload->'customer'->>'address_reference'
  )
  returning id into v_customer_id;

  v_order_number := next_order_number();

  insert into orders (order_number, customer_id, subtotal_cents, delivery_fee_cents, total_cents,
                      payment_method, payment_status, order_status, notes, idempotency_key)
  values (v_order_number, v_customer_id, 0, v_delivery_fee, 0, v_method, 'pending', 'new',
          nullif(payload->>'notes', ''), v_key)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty < 1 then
      raise exception 'INVALID_QUANTITY';
    end if;

    select * into v_product
      from products
     where id = (v_item->>'product_id')::uuid
       for update;

    if not found or not v_product.is_active then
      raise exception 'PRODUCT_UNAVAILABLE:%', coalesce(v_product.name, v_item->>'product_id');
    end if;

    if v_product.stock < v_qty then
      raise exception 'OUT_OF_STOCK:%', v_product.name;
    end if;

    -- preço lido SEMPRE da base de dados, nunca do navegador
    v_line_subtotal := v_product.price_cents * v_qty;
    v_subtotal := v_subtotal + v_line_subtotal;

    insert into order_items (order_id, product_id, product_name_snapshot, product_image_snapshot,
                             quantity, unit_price_cents, subtotal_cents)
    values (v_order_id, v_product.id, v_product.name,
            coalesce(v_product.images[1], null), v_qty, v_product.price_cents, v_line_subtotal);

    update products
       set stock = stock - v_qty,
           sales_count = sales_count + v_qty
     where id = v_product.id;
  end loop;

  update orders
     set subtotal_cents = v_subtotal,
         total_cents = v_subtotal + v_delivery_fee
   where id = v_order_id;

  insert into payments (order_id, method, payer_phone, transaction_reference, receipt_url, status)
  values (
    v_order_id,
    v_method,
    nullif(payload->'payment'->>'payer_phone', ''),
    nullif(payload->'payment'->>'transaction_reference', ''),
    nullif(payload->'payment'->>'receipt_url', ''),
    'pending'
  );

  insert into activity_logs (order_id, event, detail)
  values (v_order_id, 'order_created', 'Encomenda ' || v_order_number || ' criada');

  return (
    select jsonb_build_object(
      'order_id', o.id,
      'order_number', o.order_number,
      'total_cents', o.total_cents,
      'subtotal_cents', o.subtotal_cents,
      'delivery_fee_cents', o.delivery_fee_cents,
      'purchase_event_id', o.purchase_event_id,
      'duplicate', false
    ) from orders o where o.id = v_order_id
  );
end;
$$;

do $$
begin
  revoke all on function create_order(jsonb) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function create_order(jsonb) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function create_order(jsonb) from authenticated;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Devolve stock ao cancelar uma encomenda.
-- ---------------------------------------------------------------------------
create or replace function restore_stock(p_product_id uuid, p_quantity int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update products
     set stock = stock + p_quantity,
         sales_count = greatest(0, sales_count - p_quantity)
   where id = p_product_id;
end;
$$;

do $$
begin
  revoke all on function restore_stock(uuid, int) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function restore_stock(uuid, int) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function restore_stock(uuid, int) from authenticated;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Marca o evento Purchase como enviado. Devolve true apenas na PRIMEIRA vez,
-- garantindo que um refresh de /pedido-confirmado não dispara Purchase de novo.
-- ---------------------------------------------------------------------------
create or replace function claim_purchase_event(p_order_number text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed boolean := false;
begin
  update orders
     set purchase_tracked_at = now()
   where order_number = p_order_number
     and purchase_tracked_at is null
  returning true into v_claimed;

  return coalesce(v_claimed, false);
end;
$$;

do $$
begin
  revoke all on function claim_purchase_event(text) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function claim_purchase_event(text) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function claim_purchase_event(text) from authenticated;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- O catálogo é público (leitura). Tudo o resto só é acessível pelo servidor,
-- que usa a service role key (a service role ignora RLS).
-- ---------------------------------------------------------------------------
alter table categories enable row level security;
alter table products enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table notifications enable row level security;
alter table activity_logs enable row level security;
alter table site_settings enable row level security;
alter table push_subscriptions enable row level security;

drop policy if exists "categorias visíveis a todos" on categories;
create policy "categorias visíveis a todos" on categories
  for select using (is_active = true);

drop policy if exists "produtos ativos visíveis a todos" on products;
create policy "produtos ativos visíveis a todos" on products
  for select using (is_active = true);

drop policy if exists "definições públicas" on site_settings;
create policy "definições públicas" on site_settings
  for select using (true);

-- Sem políticas para customers, orders, order_items, payments, notifications,
-- activity_logs e push_subscriptions: nenhum cliente do navegador consegue
-- lê-las ou escrevê-las diretamente (só via server actions com service role).

-- ---------------------------------------------------------------------------
-- Storage
-- Crie no painel (Storage > New bucket):
--   produtos       -> público   (imagens dos produtos)
--   comprovativos  -> privado   (comprovativos de pagamento enviados pelos clientes)
-- ---------------------------------------------------------------------------
