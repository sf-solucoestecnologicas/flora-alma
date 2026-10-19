-- =========================================================
-- Flora Alma — schema Supabase
-- Tudo fica no schema privado `flora` (sem acesso pela API).
-- A vitrine e o painel falam com o banco SÓ através das funções
-- public.flora_* abaixo, que validam preço, estoque e permissão.
--
-- Segurança:
--  • preços, descontos, frete e presente recalculados no servidor
--  • limite de tentativas por IP (cf-connecting-ip) e por WhatsApp
--  • códigos de pedido aleatórios (gerador criptográfico pgcrypto)
--  • convites da equipe: token aleatório de 192 bits, guardado só
--    como hash SHA-256, uso único e validade de 7 dias
--  • tudo que vem do painel é validado e limpo antes de salvar
--  • histórico (auditoria) das ações da equipe
--  • remoção de dados pessoais de clientes (LGPD)
-- Idempotente: pode rodar de novo sem perder dados.
-- =========================================================

create schema if not exists flora;

-- ---------- Tabelas ----------
create table if not exists flora.products (
  id          text primary key,
  name        text not null,
  aroma       text not null default '',
  cat         text not null,
  sub         text not null default '',
  price       numeric(10,2) not null check (price >= 0),
  old_price   numeric(10,2) check (old_price is null or old_price >= 0),
  stock       integer not null default 0,
  options     text[] not null default '{}',
  opt_label   text not null default 'Aroma',
  moods       text[] not null default '{}',
  notes       text not null default '',
  description text not null default '',
  specs       jsonb not null default '[]',
  art         jsonb not null default '{}',
  image       text,
  featured    boolean not null default false,
  is_new      boolean not null default false,
  active      boolean not null default true,
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'products_id_format') then
    alter table flora.products add constraint products_id_format
      check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(id) <= 60);
  end if;
end $$;

create sequence if not exists flora.order_seq start 1001;

create table if not exists flora.orders (
  id           text primary key,
  created_at   timestamptz not null default now(),
  customer     jsonb not null,
  delivery     jsonb not null,
  payment      text not null check (payment in ('pix','cartao','entrega')),
  installments integer not null default 1,
  items        jsonb not null,
  subtotal     numeric(10,2) not null,
  discount     numeric(10,2) not null default 0,
  coupon       text,
  pix_discount numeric(10,2) not null default 0,
  shipping     numeric(10,2) not null default 0,
  gift         jsonb not null default '{}',
  gift_fee     numeric(10,2) not null default 0,
  total        numeric(10,2) not null,
  status       text not null default 'novo'
               check (status in ('novo','pago','preparando','enviado','entregue','cancelado')),
  notes        text
);

-- Itens de lembrancinha (preço por unidade)
create table if not exists flora.souvenirs (
  id          text primary key,
  name        text not null,
  description text not null default '',
  price       numeric(10,2) not null default 0,
  min_qty     integer not null default 20,
  sort        integer not null default 0,
  active      boolean not null default true
);

create sequence if not exists flora.request_seq start 101;

-- Pedidos de orçamento de lembrancinhas para eventos
create table if not exists flora.requests (
  id          text primary key,
  created_at  timestamptz not null default now(),
  event       text not null,
  event_date  date not null,
  qty         integer not null,
  items       jsonb not null,
  aroma       text not null default '',
  custom      text not null default '',
  name        text not null,
  phone       text not null,
  notes       text not null default '',
  estimate    numeric(10,2) not null default 0,
  status      text not null default 'novo'
              check (status in ('novo','orcado','aprovado','producao','entregue','cancelado'))
);

create table if not exists flora.coupons (
  code      text primary key,
  kind      text not null check (kind in ('percent','fixed')),
  value     numeric(10,2) not null check (value >= 0),
  min_total numeric(10,2) not null default 0,
  active    boolean not null default true
);

create table if not exists flora.settings (
  id   integer primary key default 1 check (id = 1),
  data jsonb not null default '{}'
);

create table if not exists flora.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

-- Convites da equipe: só o hash SHA-256 do token fica salvo
create table if not exists flora.invites (
  id            uuid primary key default gen_random_uuid(),
  token_hash    text not null unique,
  created_by    uuid,
  created_email text,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '7 days',
  used_at       timestamptz,
  used_by       uuid,
  used_email    text,
  revoked_at    timestamptz
);

-- Histórico das ações da equipe
create table if not exists flora.audit (
  id      bigserial primary key,
  at      timestamptz not null default now(),
  user_id uuid,
  email   text,
  action  text not null,
  detail  jsonb not null default '{}'
);

-- Limite de tentativas (anti-abuso)
create table if not exists flora.rate_hits (
  bucket text not null,
  at     timestamptz not null default now()
);
create index if not exists rate_hits_bucket_at on flora.rate_hits (bucket, at);
create index if not exists rate_hits_at on flora.rate_hits (at);

-- convite antigo (código em texto puro) deixa de existir
drop function if exists public.flora_admin_invite(boolean);
drop table if exists flora.secrets;

-- RLS ligado e nenhum acesso direto: só as funções abaixo tocam nas tabelas
do $$
declare t text;
begin
  foreach t in array array['products','orders','souvenirs','requests','coupons','settings','admins','invites','audit','rate_hits'] loop
    execute format('alter table flora.%I enable row level security', t);
    execute format('revoke all on flora.%I from public, anon, authenticated', t);
  end loop;
end $$;
revoke all on all sequences in schema flora from public, anon, authenticated;
-- o schema não precisa ser visível para quem acessa pela API
revoke usage on schema flora from public, anon, authenticated;
alter default privileges in schema flora revoke execute on functions from public;

-- =========================================================
-- Helpers internos (schema flora, sem acesso externo)
-- =========================================================
create or replace function public.flora_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from flora.admins a where a.user_id = auth.uid());
$$;

create or replace function flora.require_admin()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.flora_is_admin() then
    raise exception 'Acesso restrito à equipe do ateliê' using errcode = '42501';
  end if;
end $$;

-- IP real do cliente (definido pela Cloudflare; o navegador não consegue falsificar)
create or replace function flora.client_ip()
returns text language sql stable set search_path = '' as $$
  select coalesce(
    nullif(current_setting('request.headers', true), '')::jsonb ->> 'cf-connecting-ip',
    nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-real-ip',
    'local');
$$;

create or replace function flora.rate_limit(p_bucket text, p_max integer, p_window interval)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare n integer;
begin
  if random() < 0.02 then
    delete from flora.rate_hits where at < now() - interval '2 days';
  end if;
  select count(*) into n from flora.rate_hits where bucket = p_bucket and at > now() - p_window;
  if n >= p_max then
    raise exception 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.' using errcode = 'P0001';
  end if;
  insert into flora.rate_hits (bucket) values (p_bucket);
end $$;

-- código aleatório legível (sem 0/O, 1/I/L) com gerador criptográfico
create or replace function flora.new_id(p_prefix text)
returns text language plpgsql volatile set search_path = '' as $$
declare
  a text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  b bytea;
  r text;
  i integer;
begin
  loop
    b := extensions.gen_random_bytes(6);
    r := p_prefix;
    for i in 0..5 loop
      r := r || substr(a, (get_byte(b, i) % length(a)) + 1, 1);
    end loop;
    exit when not exists (select 1 from flora.orders where id = r)
          and not exists (select 1 from flora.requests where id = r);
  end loop;
  return r;
end $$;

create or replace function flora.token_hash(p_token text)
returns text language sql immutable set search_path = '' as $$
  select encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

create or replace function flora.log(p_action text, p_detail jsonb default '{}'::jsonb)
returns void language sql volatile security definer set search_path = '' as $$
  insert into flora.audit (user_id, email, action, detail)
  values (auth.uid(), auth.jwt() ->> 'email', p_action, coalesce(p_detail, '{}'::jsonb));
$$;

-- número dentro de uma faixa (ou null se inválido)
create or replace function flora.num(p text, lo numeric, hi numeric)
returns numeric language sql immutable set search_path = '' as $$
  select case when trim(coalesce(p, '')) ~ '^-?[0-9]+(\.[0-9]+)?$' then
    case when trim(p)::numeric between lo and hi then trim(p)::numeric end
  end;
$$;

-- cor hexadecimal (#abc ou #aabbcc) ou null
create or replace function flora.hex(p text)
returns text language sql immutable set search_path = '' as $$
  select case when p ~* '^#[0-9a-f]{3,8}$' then lower(p) end;
$$;

-- configurações: só chaves conhecidas, com tipo e tamanho controlados
create or replace function flora.clean_settings(p jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  t      jsonb := coalesce(p, '{}'::jsonb);
  ticker jsonb := '[]'::jsonb;
  x      text;
begin
  for x in select jsonb_array_elements_text(case when jsonb_typeof(t->'ticker') = 'array' then t->'ticker' else '[]'::jsonb end) limit 10 loop
    if length(trim(x)) > 0 then ticker := ticker || to_jsonb(left(trim(x), 80)); end if;
  end loop;
  return jsonb_build_object(
    'storeName', left(coalesce(nullif(trim(t->>'storeName'), ''), 'Flora Alma'), 60),
    'whatsapp', left(regexp_replace(coalesce(t->>'whatsapp', ''), '\D', '', 'g'), 13),
    'instagram', case when coalesce(t->>'instagram', '') ~ '^[A-Za-z0-9._]{1,30}$' then t->>'instagram' else 'floraalmaartesanal' end,
    'city', left(coalesce(t->>'city', ''), 80),
    'address', left(coalesce(t->>'address', ''), 160),
    'hours', left(coalesce(t->>'hours', ''), 120),
    'lat', flora.num(t->>'lat', -90, 90),
    'lng', flora.num(t->>'lng', -180, 180),
    'pixKey', left(trim(coalesce(t->>'pixKey', '')), 77),
    'pixName', left(trim(coalesce(t->>'pixName', '')), 25),
    'pixCity', left(trim(coalesce(t->>'pixCity', '')), 15),
    'pixDiscount', coalesce(flora.num(t->>'pixDiscount', 0, 50), 0),
    'maxInstallments', coalesce(round(flora.num(t->>'maxInstallments', 1, 12)), 1),
    'freeShippingOver', coalesce(flora.num(t->>'freeShippingOver', 0, 100000), 0),
    'localDelivery', coalesce(flora.num(t->>'localDelivery', 0, 10000), 0),
    'giftWrap', coalesce(flora.num(t->>'giftWrap', 0, 1000), 0),
    'cepFrom', case when coalesce(t->>'cepFrom', '') ~ '^[0-9]{5}$' then t->>'cepFrom' else '44000' end,
    'cepTo', case when coalesce(t->>'cepTo', '') ~ '^[0-9]{5}$' then t->>'cepTo' else '44130' end,
    'leadDays', coalesce(round(flora.num(t->>'leadDays', 1, 120)), 15),
    'minQty', coalesce(round(flora.num(t->>'minQty', 1, 5000)), 20),
    'ticker', ticker
  );
end $$;

create or replace function flora.product_json(p flora.products)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'name', p.name, 'aroma', p.aroma, 'cat', p.cat, 'sub', p.sub,
    'price', p.price, 'old_price', p.old_price, 'stock', p.stock, 'options', to_jsonb(p.options),
    'opt_label', p.opt_label, 'moods', to_jsonb(p.moods), 'notes', p.notes,
    'description', p.description, 'specs', p.specs, 'art', p.art,
    'image', p.image, 'featured', p.featured, 'is_new', p.is_new, 'active', p.active, 'sort', p.sort
  );
$$;

-- =========================================================
-- API pública (vitrine)
-- =========================================================

-- Tudo que a vitrine precisa em uma chamada
create or replace function public.flora_bootstrap()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'settings', coalesce((select s.data from flora.settings s where s.id = 1), '{}'::jsonb),
    'souvenirs', coalesce((select jsonb_agg(to_jsonb(v) order by v.sort) from flora.souvenirs v where v.active), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(flora.product_json(p) order by p.sort, p.name) from flora.products p where p.active), '[]'::jsonb)
  );
$$;

-- Valida um cupom sem expor a lista
create or replace function public.flora_check_coupon(p_code text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  perform flora.rate_limit('cupom:ip:' || flora.client_ip(), 40, interval '10 minutes');
  return (select jsonb_build_object('code', c.code, 'kind', c.kind, 'value', c.value, 'min_total', c.min_total)
          from flora.coupons c where upper(c.code) = upper(trim(left(coalesce(p_code, ''), 40))) and c.active);
end $$;

-- Fecha o pedido: recalcula preços no servidor, baixa estoque, aplica cupom/Pix/frete/presente
create or replace function public.flora_place_order(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  s        jsonb := coalesce((select data from flora.settings where id = 1), '{}'::jsonb);
  it       jsonb;
  prod     flora.products;
  qty      integer;
  items    jsonb := '[]'::jsonb;
  subtotal numeric := 0;
  disc     numeric := 0;
  cpn      flora.coupons;
  pixd     numeric := 0;
  ship     numeric := 0;
  wrap     boolean := coalesce(p->'gift'->>'wrap', '') = 'true';
  gfee     numeric := 0;
  method   text := coalesce(p->'delivery'->>'method', 'retirada');
  pay      text := coalesce(p->>'payment', 'pix');
  inst     integer := 1;
  phone    text := left(regexp_replace(coalesce(p->'customer'->>'phone', ''), '\D', '', 'g'), 13);
  cep      text := left(regexp_replace(coalesce(p->'delivery'->>'cep', ''), '\D', '', 'g'), 8);
  oid      text;
  rec      flora.orders;
begin
  if jsonb_typeof(p->'items') <> 'array' or jsonb_array_length(p->'items') = 0 then
    raise exception 'Sua sacola está vazia';
  end if;
  if jsonb_array_length(p->'items') > 30 then raise exception 'Itens demais no pedido'; end if;
  if length(trim(coalesce(p->'customer'->>'name', ''))) < 2 or length(phone) < 10 then
    raise exception 'Informe seu nome e um WhatsApp válido';
  end if;
  if pay not in ('pix','cartao','entrega') then raise exception 'Forma de pagamento inválida'; end if;
  if method not in ('retirada','local','envio') then raise exception 'Forma de entrega inválida'; end if;

  perform flora.rate_limit('pedido:ip:' || flora.client_ip(), 12, interval '1 hour');
  perform flora.rate_limit('pedido:tel:' || phone, 6, interval '1 hour');

  for it in select * from jsonb_array_elements(p->'items') loop
    qty := greatest(1, least(50, coalesce(round(flora.num(it->>'qty', 1, 1000)), 1)::integer));
    select * into prod from flora.products where id = it->>'id' and active for update;
    if not found then raise exception 'Produto indisponível: %', left(coalesce(it->>'name', it->>'id'), 80); end if;
    if prod.stock < qty then
      raise exception 'Estoque insuficiente para "%": restam %', prod.name, greatest(prod.stock, 0);
    end if;
    update flora.products set stock = stock - qty, updated_at = now() where id = prod.id;
    items := items || jsonb_build_object('id', prod.id, 'name', prod.name,
      'variant', left(coalesce(it->>'variant', ''), 80), 'price', prod.price, 'qty', qty);
    subtotal := subtotal + prod.price * qty;
  end loop;

  if coalesce(trim(p->>'coupon'), '') <> '' then
    select * into cpn from flora.coupons where upper(code) = upper(trim(left(p->>'coupon', 40))) and active;
    if found and subtotal >= cpn.min_total then
      disc := case cpn.kind when 'percent' then round(subtotal * least(cpn.value, 100) / 100, 2) else least(cpn.value, subtotal) end;
    end if;
  end if;

  if method = 'local' then
    if length(cep) <> 8 or left(cep, 5) < coalesce(s->>'cepFrom', '44000') or left(cep, 5) > coalesce(s->>'cepTo', '44130') then
      raise exception 'Entrega local disponível apenas para CEPs de Feira de Santana';
    end if;
    ship := case when subtotal - disc >= coalesce((s->>'freeShippingOver')::numeric, 0)
                 then 0 else coalesce((s->>'localDelivery')::numeric, 0) end;
  end if;

  if wrap then gfee := coalesce((s->>'giftWrap')::numeric, 0); end if;

  if pay = 'pix' then
    pixd := round((subtotal - disc) * coalesce((s->>'pixDiscount')::numeric, 0) / 100, 2);
  elsif pay = 'cartao' then
    inst := greatest(1, least(coalesce((s->>'maxInstallments')::integer, 1), coalesce(round(flora.num(p->>'installments', 1, 24)), 1)::integer));
  end if;

  oid := flora.new_id('FA');
  insert into flora.orders (id, customer, delivery, payment, installments, items, subtotal, discount, coupon,
                            pix_discount, shipping, gift, gift_fee, total, notes)
  values (
    oid,
    jsonb_build_object('name', left(trim(p->'customer'->>'name'), 120), 'phone', phone,
                       'email', left(coalesce(p->'customer'->>'email', ''), 160)),
    jsonb_build_object('method', method, 'cep', cep,
                       'street', left(coalesce(p->'delivery'->>'street', ''), 160),
                       'number', left(coalesce(p->'delivery'->>'number', ''), 20),
                       'district', left(coalesce(p->'delivery'->>'district', ''), 80),
                       'city', left(coalesce(p->'delivery'->>'city', ''), 80),
                       'uf', left(coalesce(p->'delivery'->>'uf', ''), 2),
                       'complement', left(coalesce(p->'delivery'->>'complement', ''), 120)),
    pay, inst, items, subtotal, disc, case when disc > 0 then upper(trim(left(p->>'coupon', 40))) end,
    pixd, ship,
    case when wrap then jsonb_build_object('wrap', true,
      'to', left(coalesce(p->'gift'->>'to', ''), 80),
      'message', left(coalesce(p->'gift'->>'message', ''), 240)) else '{}'::jsonb end,
    gfee, subtotal - disc - pixd + ship + gfee, left(coalesce(p->>'notes', ''), 500)
  ) returning * into rec;

  return to_jsonb(rec);
end $$;

-- Cliente consulta o status do próprio pedido (precisa do telefone usado)
create or replace function public.flora_order_status(p_id text, p_phone text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  perform flora.rate_limit('status:ip:' || flora.client_ip(), 120, interval '10 minutes');
  return (select jsonb_build_object('id', o.id, 'status', o.status, 'total', o.total, 'created_at', o.created_at)
          from flora.orders o
          where o.id = upper(trim(left(coalesce(p_id, ''), 20)))
            and length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 10
            and o.customer->>'phone' = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'));
end $$;

-- Pedido de orçamento de lembrancinhas
create or replace function public.flora_request_souvenirs(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  s       jsonb := coalesce((select data from flora.settings where id = 1), '{}'::jsonb);
  d       date;
  q       integer := coalesce(round(flora.num(p->>'qty', 0, 100000)), 0)::integer;
  phone   text := left(regexp_replace(coalesce(p->>'phone', ''), '\D', '', 'g'), 13);
  lead    integer := coalesce((s->>'leadDays')::integer, 15);
  its     jsonb := '[]'::jsonb;
  unit    numeric := 0;
  minq    integer := coalesce((s->>'minQty')::integer, 20);
  r       record;
  rid     text;
  rec     flora.requests;
begin
  if coalesce(p->>'event_date', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Escolha uma data válida'; end if;
  d := (p->>'event_date')::date;
  if d < current_date + lead or d > current_date + 540 then
    raise exception 'Escolha uma data a partir de % dias de hoje', lead;
  end if;
  if length(trim(coalesce(p->>'event', ''))) < 2 then raise exception 'Conte qual é o evento'; end if;
  if length(trim(coalesce(p->>'name', ''))) < 2 or length(phone) < 10 then
    raise exception 'Informe seu nome e um WhatsApp válido';
  end if;

  perform flora.rate_limit('lemb:ip:' || flora.client_ip(), 6, interval '1 hour');
  perform flora.rate_limit('lemb:tel:' || phone, 4, interval '1 hour');

  for r in select v.* from flora.souvenirs v
           where v.active and v.id in (select jsonb_array_elements_text(case when jsonb_typeof(p->'items') = 'array' then p->'items' else '[]'::jsonb end))
           order by v.sort loop
    its := its || jsonb_build_object('id', r.id, 'name', r.name, 'price', r.price);
    unit := unit + r.price;
    minq := greatest(minq, r.min_qty);
  end loop;
  if jsonb_array_length(its) = 0 then raise exception 'Escolha pelo menos uma lembrancinha'; end if;
  if q < minq then raise exception 'A quantidade mínima para esses itens é % unidades', minq; end if;
  if q > 2000 then raise exception 'Para mais de 2.000 unidades, fale com a gente no WhatsApp'; end if;

  rid := flora.new_id('LB');
  insert into flora.requests (id, event, event_date, qty, items, aroma, custom, name, phone, notes, estimate)
  values (rid, left(trim(p->>'event'), 60), d, q, its, left(coalesce(p->>'aroma', ''), 80),
          left(coalesce(p->>'custom', ''), 300), left(trim(p->>'name'), 120), phone,
          left(coalesce(p->>'notes', ''), 500), unit * q)
  returning * into rec;
  return to_jsonb(rec);
end $$;

-- =========================================================
-- API do painel (somente equipe)
-- =========================================================
create or replace function public.flora_admin_bootstrap()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform flora.require_admin();
  return jsonb_build_object(
    'settings',  coalesce((select data from flora.settings where id = 1), '{}'::jsonb),
    'products',  coalesce((select jsonb_agg(flora.product_json(p) order by p.sort, p.name) from flora.products p), '[]'::jsonb),
    'orders',    coalesce((select jsonb_agg(to_jsonb(o) order by o.created_at desc) from (select * from flora.orders order by created_at desc limit 500) o), '[]'::jsonb),
    'requests',  coalesce((select jsonb_agg(to_jsonb(r) order by r.event_date, r.created_at) from (select * from flora.requests order by created_at desc limit 500) r), '[]'::jsonb),
    'souvenirs', coalesce((select jsonb_agg(to_jsonb(v) order by v.sort) from flora.souvenirs v), '[]'::jsonb),
    'coupons',   coalesce((select jsonb_agg(to_jsonb(c) order by c.code) from flora.coupons c), '[]'::jsonb)
  );
end $$;

create or replace function public.flora_admin_upsert_product(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  rec   flora.products;
  old   flora.products;
  pid   text := lower(trim(coalesce(p->>'id', '')));
  art   jsonb;
  opts  text[];
  mds   text[];
  specs jsonb;
begin
  perform flora.require_admin();
  if pid !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(pid) > 60 then
    raise exception 'Código inválido: use só letras minúsculas, números e hífen';
  end if;
  if coalesce(trim(p->>'name'), '') = '' then raise exception 'Produto precisa de nome'; end if;
  if coalesce(p->>'cat', '') not in ('sabonetes','velas','kits','corpo','casa') then raise exception 'Categoria inválida'; end if;

  art := jsonb_strip_nulls(jsonb_build_object(
    'kind', case when p->'art'->>'kind' in ('soap','soapround','jar','tin','cup','box','tube','spray','bottle','diffuser','sachet') then p->'art'->>'kind' else 'soap' end,
    'deco', case when p->'art'->>'deco' in ('buds','herbs','oats','coffee','specks','petals','swirl') then p->'art'->>'deco' end,
    'color', flora.hex(p->'art'->>'color'), 'accent', flora.hex(p->'art'->>'accent'),
    'wax', flora.hex(p->'art'->>'wax'), 'bg', flora.hex(p->'art'->>'bg'),
    'label', nullif(left(regexp_replace(coalesce(p->'art'->>'label', ''), '[<>"''&]', '', 'g'), 16), '')));
  opts := coalesce((select array_agg(left(trim(x), 40) order by n) from jsonb_array_elements_text(
            case when jsonb_typeof(p->'options') = 'array' then p->'options' else '[]'::jsonb end) with ordinality as o(x, n)
          where trim(x) <> '' and n <= 12), '{}');
  mds := coalesce((select array_agg(distinct x) from jsonb_array_elements_text(
            case when jsonb_typeof(p->'moods') = 'array' then p->'moods' else '[]'::jsonb end) x
          where x in ('relaxar','energizar','aconchego','refrescar')), '{}');
  specs := coalesce((select jsonb_agg(jsonb_build_array(left(e->>0, 60), left(coalesce(e->>1, ''), 160)) order by n)
            from jsonb_array_elements(case when jsonb_typeof(p->'specs') = 'array' then p->'specs' else '[]'::jsonb end) with ordinality as s(e, n)
            where jsonb_typeof(e) = 'array' and coalesce(e->>0, '') <> '' and n <= 12), '[]'::jsonb);

  select * into old from flora.products where id = pid;

  insert into flora.products as t (id, name, aroma, cat, sub, price, old_price, stock, options, opt_label, moods, notes,
                                   description, specs, art, image, featured, is_new, active, sort)
  values (
    pid, left(trim(p->>'name'), 120), left(coalesce(p->>'aroma', ''), 60), p->>'cat',
    left(coalesce(p->>'sub', ''), 60), coalesce(flora.num(p->>'price', 0, 100000), 0), flora.num(p->>'old_price', 0, 100000),
    coalesce(round(flora.num(p->>'stock', 0, 100000)), 0)::integer, opts,
    left(coalesce(nullif(trim(p->>'opt_label'), ''), 'Aroma'), 30), mds,
    left(coalesce(p->>'notes', ''), 160), left(coalesce(p->>'description', ''), 2000), specs, art,
    case when p->>'image' ~ '^https://[^[:space:]"''<>]+$' then left(p->>'image', 500) end,
    coalesce(p->>'featured', '') = 'true', coalesce(p->>'is_new', '') = 'true', coalesce(p->>'active', 'true') = 'true',
    coalesce(round(flora.num(p->>'sort', -100000, 100000)), 0)::integer
  )
  on conflict (id) do update set
    name = excluded.name, aroma = excluded.aroma, cat = excluded.cat, sub = excluded.sub, price = excluded.price,
    old_price = excluded.old_price, stock = excluded.stock, options = excluded.options, opt_label = excluded.opt_label,
    moods = excluded.moods, notes = excluded.notes, description = excluded.description, specs = excluded.specs,
    art = excluded.art, image = excluded.image, featured = excluded.featured, is_new = excluded.is_new,
    active = excluded.active, sort = excluded.sort, updated_at = now()
  returning * into rec;

  if old.id is null then
    perform flora.log('produto_criado', jsonb_build_object('id', pid, 'nome', rec.name));
  elsif (to_jsonb(old) - 'stock' - 'updated_at' - 'created_at') = (to_jsonb(rec) - 'stock' - 'updated_at' - 'created_at') then
    perform flora.log('estoque_ajustado', jsonb_build_object('id', pid, 'de', old.stock, 'para', rec.stock));
  else
    perform flora.log('produto_editado', jsonb_build_object('id', pid, 'nome', rec.name));
  end if;
  return flora.product_json(rec);
end $$;

create or replace function public.flora_admin_delete_product(p_id text)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  perform flora.require_admin();
  delete from flora.products where id = p_id;
  if found then perform flora.log('produto_excluido', jsonb_build_object('id', p_id)); end if;
end $$;

-- Muda status; cancelar devolve o estoque, "descancelar" baixa de novo
create or replace function public.flora_admin_set_order_status(p_id text, p_status text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare o flora.orders; it jsonb; prev text;
begin
  perform flora.require_admin();
  if p_status not in ('novo','pago','preparando','enviado','entregue','cancelado') then raise exception 'Situação inválida'; end if;
  select * into o from flora.orders where id = p_id for update;
  if not found then raise exception 'Pedido não encontrado'; end if;
  prev := o.status;
  if p_status = 'cancelado' and o.status <> 'cancelado' then
    for it in select * from jsonb_array_elements(o.items) loop
      update flora.products set stock = stock + (it->>'qty')::integer where id = it->>'id';
    end loop;
  elsif p_status <> 'cancelado' and o.status = 'cancelado' then
    for it in select * from jsonb_array_elements(o.items) loop
      update flora.products set stock = stock - (it->>'qty')::integer where id = it->>'id';
    end loop;
  end if;
  update flora.orders set status = p_status where id = p_id returning * into o;
  perform flora.log('pedido_situacao', jsonb_build_object('id', p_id, 'de', prev, 'para', p_status));
  return to_jsonb(o);
end $$;

create or replace function public.flora_admin_set_request_status(p_id text, p_status text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare r flora.requests;
begin
  perform flora.require_admin();
  if p_status not in ('novo','orcado','aprovado','producao','entregue','cancelado') then raise exception 'Situação inválida'; end if;
  update flora.requests set status = p_status where id = p_id returning * into r;
  if not found then raise exception 'Pedido de lembrancinhas não encontrado'; end if;
  perform flora.log('lembrancinha_situacao', jsonb_build_object('id', p_id, 'para', p_status));
  return to_jsonb(r);
end $$;

-- LGPD: apaga os dados pessoais de um pedido (mantém valores e itens para o caixa)
create or replace function public.flora_admin_anonymize_order(p_id text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare o flora.orders;
begin
  perform flora.require_admin();
  update flora.orders set
    customer = jsonb_build_object('name', 'Dados removidos', 'phone', '', 'email', ''),
    delivery = jsonb_build_object('method', delivery->>'method', 'cep', '', 'street', '', 'number', '', 'district', '',
                                  'city', coalesce(delivery->>'city', ''), 'uf', coalesce(delivery->>'uf', ''), 'complement', ''),
    gift = case when coalesce(gift->>'wrap', '') = 'true' then jsonb_build_object('wrap', true) else '{}'::jsonb end,
    notes = null
  where id = p_id returning * into o;
  if not found then raise exception 'Pedido não encontrado'; end if;
  perform flora.log('dados_removidos', jsonb_build_object('pedido', p_id));
  return to_jsonb(o);
end $$;

create or replace function public.flora_admin_anonymize_request(p_id text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare r flora.requests;
begin
  perform flora.require_admin();
  update flora.requests set name = 'Dados removidos', phone = '', custom = '', notes = ''
  where id = p_id returning * into r;
  if not found then raise exception 'Pedido de lembrancinhas não encontrado'; end if;
  perform flora.log('dados_removidos', jsonb_build_object('lembrancinha', p_id));
  return to_jsonb(r);
end $$;

create or replace function public.flora_admin_save_settings(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare old jsonb; new jsonb;
begin
  perform flora.require_admin();
  old := coalesce((select data from flora.settings where id = 1), '{}'::jsonb);
  new := flora.clean_settings(p);
  insert into flora.settings (id, data) values (1, new)
  on conflict (id) do update set data = excluded.data;
  perform flora.log('configuracoes', jsonb_build_object('alterou',
    (select coalesce(jsonb_agg(k order by k), '[]'::jsonb) from jsonb_object_keys(new) k where old->k is distinct from new->k)));
  return new;
end $$;

create or replace function public.flora_admin_save_coupons(p jsonb)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  perform flora.require_admin();
  delete from flora.coupons where true;
  insert into flora.coupons (code, kind, value, min_total, active)
  select distinct on (c.code) c.code, c.kind, c.value, c.min_total, c.active
  from (
    select upper(left(regexp_replace(trim(coalesce(x->>'code', '')), '[^A-Za-z0-9_-]', '', 'g'), 30)) as code,
           case when x->>'kind' = 'fixed' then 'fixed' else 'percent' end as kind,
           coalesce(flora.num(x->>'value', 0, 100000), 0) as value,
           coalesce(flora.num(x->>'min_total', 0, 1000000), 0) as min_total,
           coalesce(x->>'active', 'true') = 'true' as active
    from jsonb_array_elements(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) x
  ) c
  where c.code <> '';
  perform flora.log('cupons_salvos', jsonb_build_object('total', (select count(*) from flora.coupons)));
end $$;

create or replace function public.flora_admin_save_souvenirs(p jsonb)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  perform flora.require_admin();
  delete from flora.souvenirs where true;
  insert into flora.souvenirs (id, name, description, price, min_qty, sort, active)
  select distinct on (v.id) v.id, v.name, v.description, v.price, v.min_qty, v.sort, v.active
  from (
    select left(lower(regexp_replace(coalesce(x->>'id', ''), '[^A-Za-z0-9-]', '', 'g')), 60) as id,
           left(trim(coalesce(x->>'name', '')), 80) as name,
           left(coalesce(x->>'description', ''), 200) as description,
           coalesce(flora.num(x->>'price', 0, 100000), 0) as price,
           greatest(1, coalesce(round(flora.num(x->>'min_qty', 1, 5000)), 20))::integer as min_qty,
           coalesce(round(flora.num(x->>'sort', 0, 1000)), 0)::integer as sort,
           coalesce(x->>'active', 'true') = 'true' as active
    from jsonb_array_elements(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) x
  ) v
  where v.id <> '' and v.name <> '';
  perform flora.log('lembrancinhas_salvas', jsonb_build_object('total', (select count(*) from flora.souvenirs)));
end $$;

create or replace function public.flora_admin_audit()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform flora.require_admin();
  return coalesce((select jsonb_agg(jsonb_build_object('at', a.at, 'email', a.email, 'action', a.action, 'detail', a.detail) order by a.at desc)
                   from (select * from flora.audit order by at desc limit 80) a), '[]'::jsonb);
end $$;

-- =========================================================
-- Equipe e convites (token aleatório, só o hash é salvo,
-- uso único, vale 7 dias)
-- =========================================================
create or replace function public.flora_check_invite(p_code text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  perform flora.rate_limit('convite:ip:' || flora.client_ip(), 20, interval '1 hour');
  return exists (select 1 from flora.invites i
                 where i.token_hash = flora.token_hash(left(coalesce(p_code, ''), 128))
                   and i.used_at is null and i.revoked_at is null and i.expires_at > now());
end $$;

create or replace function public.flora_redeem_invite(p_code text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare v uuid;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta primeiro'; end if;
  perform flora.rate_limit('convite:user:' || auth.uid()::text, 10, interval '1 hour');
  if exists (select 1 from flora.admins where user_id = auth.uid()) then return true; end if;
  update flora.invites set used_at = now(), used_by = auth.uid(), used_email = auth.jwt() ->> 'email'
  where token_hash = flora.token_hash(left(coalesce(p_code, ''), 128))
    and used_at is null and revoked_at is null and expires_at > now()
  returning id into v;
  if v is null then
    raise exception 'Link de convite inválido, expirado ou já usado. Peça um novo link a quem cuida do ateliê.';
  end if;
  insert into flora.admins (user_id, email) values (auth.uid(), auth.jwt() ->> 'email') on conflict (user_id) do nothing;
  perform flora.log('equipe_entrou', jsonb_build_object('email', auth.jwt() ->> 'email'));
  return true;
end $$;

create or replace function public.flora_admin_create_invite()
returns text language plpgsql volatile security definer set search_path = '' as $$
declare tok text;
begin
  perform flora.require_admin();
  perform flora.rate_limit('convite:criar:' || auth.uid()::text, 20, interval '1 day');
  tok := encode(extensions.gen_random_bytes(24), 'hex');
  insert into flora.invites (token_hash, created_by, created_email)
  values (flora.token_hash(tok), auth.uid(), auth.jwt() ->> 'email');
  perform flora.log('convite_criado', '{}'::jsonb);
  return tok;
end $$;

create or replace function public.flora_admin_invites()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform flora.require_admin();
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', i.id, 'created_at', i.created_at, 'expires_at', i.expires_at, 'created_email', i.created_email,
      'used_at', i.used_at, 'used_email', i.used_email,
      'status', case when i.used_at is not null then 'usado' when i.revoked_at is not null then 'cancelado'
                     when i.expires_at <= now() then 'expirado' else 'ativo' end) order by i.created_at desc)
    from (select * from flora.invites order by created_at desc limit 20) i), '[]'::jsonb);
end $$;

create or replace function public.flora_admin_revoke_invite(p_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  perform flora.require_admin();
  update flora.invites set revoked_at = now() where id = p_id and used_at is null and revoked_at is null;
  if found then perform flora.log('convite_cancelado', '{}'::jsonb); end if;
end $$;

create or replace function public.flora_admin_team()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform flora.require_admin();
  return coalesce((select jsonb_agg(jsonb_build_object('user_id', a.user_id, 'email', a.email,
    'created_at', a.created_at, 'me', a.user_id = auth.uid()) order by a.created_at) from flora.admins a), '[]'::jsonb);
end $$;

create or replace function public.flora_admin_remove(p_user uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare em text;
begin
  perform flora.require_admin();
  if p_user = auth.uid() then raise exception 'Você não pode remover o seu próprio acesso'; end if;
  delete from flora.admins where user_id = p_user returning email into em;
  if found then perform flora.log('equipe_removida', jsonb_build_object('email', em)); end if;
end $$;

-- ---------- Permissões das funções ----------
do $$
declare f text;
begin
  foreach f in array array[
    'flora_is_admin()', 'flora_bootstrap()', 'flora_check_coupon(text)', 'flora_place_order(jsonb)',
    'flora_order_status(text, text)', 'flora_request_souvenirs(jsonb)',
    'flora_admin_bootstrap()', 'flora_admin_upsert_product(jsonb)', 'flora_admin_delete_product(text)',
    'flora_admin_set_order_status(text, text)', 'flora_admin_set_request_status(text, text)',
    'flora_admin_anonymize_order(text)', 'flora_admin_anonymize_request(text)',
    'flora_admin_save_settings(jsonb)', 'flora_admin_save_coupons(jsonb)', 'flora_admin_save_souvenirs(jsonb)',
    'flora_admin_audit()', 'flora_check_invite(text)', 'flora_redeem_invite(text)', 'flora_admin_create_invite()',
    'flora_admin_invites()', 'flora_admin_revoke_invite(uuid)', 'flora_admin_team()', 'flora_admin_remove(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

grant execute on function public.flora_is_admin(), public.flora_bootstrap(), public.flora_check_coupon(text),
  public.flora_place_order(jsonb), public.flora_order_status(text, text), public.flora_request_souvenirs(jsonb),
  public.flora_check_invite(text) to anon, authenticated;
grant execute on function public.flora_admin_bootstrap(), public.flora_admin_upsert_product(jsonb),
  public.flora_admin_delete_product(text), public.flora_admin_set_order_status(text, text),
  public.flora_admin_set_request_status(text, text), public.flora_admin_anonymize_order(text),
  public.flora_admin_anonymize_request(text), public.flora_admin_save_settings(jsonb),
  public.flora_admin_save_coupons(jsonb), public.flora_admin_save_souvenirs(jsonb), public.flora_admin_audit(),
  public.flora_redeem_invite(text), public.flora_admin_create_invite(), public.flora_admin_invites(),
  public.flora_admin_revoke_invite(uuid), public.flora_admin_team(), public.flora_admin_remove(uuid) to authenticated;

revoke all on all functions in schema flora from public, anon, authenticated;

-- =========================================================
-- Storage: fotos dos produtos (leitura pública, escrita só equipe)
-- Só JPG/PNG/WebP (sem SVG, que poderia carregar script) e até 5 MB.
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('flora-produtos', 'flora-produtos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "flora equipe insere fotos" on storage.objects;
drop policy if exists "flora equipe altera fotos" on storage.objects;
drop policy if exists "flora equipe remove fotos" on storage.objects;
create policy "flora equipe insere fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'flora-produtos' and public.flora_is_admin());
create policy "flora equipe altera fotos" on storage.objects for update to authenticated
  using (bucket_id = 'flora-produtos' and public.flora_is_admin());
create policy "flora equipe remove fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'flora-produtos' and public.flora_is_admin());

notify pgrst, 'reload schema';
