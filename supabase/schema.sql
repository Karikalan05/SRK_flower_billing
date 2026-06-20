-- ============================================================================
-- SRK Flowers — database schema + security
-- Paste this whole file into Supabase -> SQL Editor -> Run.
-- Safe to re-run (uses "if not exists" / "create or replace").
-- ============================================================================

-- ---------- helper: who is the current user, and are they admin? ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  role        text not null default 'staff' check (role in ('admin', 'staff')),
  created_at  timestamptz not null default now()
);

-- a security-definer function so policies can check "is this user an admin?"
-- without recursive RLS on the profiles table.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- new auth users automatically get a profile row (first user becomes admin).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_count int;
begin
  select count(*) into user_count from public.profiles;
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when user_count = 0 then 'admin' else 'staff' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- shop settings (single editable row) ----------
create table if not exists public.shop_settings (
  id           int primary key default 1 check (id = 1),
  shop_name    text not null default 'SRK Flowers',
  owner_name   text not null default 'Deepa Karunakaran',
  phone        text not null default '6382880514',
  email        text not null default 'deepasrk4020@gmail.com',
  address      text not null default 'Pilliyar Kovil Street, Thirasu Palayam, Thattampalayam Post, Panruti',
  website      text not null default '',
  map_link     text not null default '',
  footer_quote text not null default 'Flowers speak the language of love. Thank you for your business! 🌸',
  updated_at   timestamptz not null default now()
);
insert into public.shop_settings (id) values (1) on conflict (id) do nothing;

-- ---------- places (towns we deliver to) ----------
create table if not exists public.places (
  id         uuid primary key default gen_random_uuid(),
  name_en    text not null,
  name_ta    text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- merchants (wholesale buyers inside a place) ----------
create table if not exists public.merchants (
  id         uuid primary key default gen_random_uuid(),
  place_id   uuid not null references public.places (id) on delete cascade,
  name       text not null,
  phone      text not null default '',
  email      text not null default '',
  notes      text not null default '',
  balance    numeric(12, 2) not null default 0,  -- current outstanding
  created_at timestamptz not null default now()
);
create index if not exists merchants_place_idx on public.merchants (place_id);

-- ---------- flower categories ----------
create table if not exists public.flower_categories (
  id         uuid primary key default gen_random_uuid(),
  name_en    text not null,
  name_ta    text not null default '',
  color      text not null default '#e91e63',
  sort_order int not null default 0
);

-- ---------- flowers (with stock) ----------
create table if not exists public.flowers (
  id                  uuid primary key default gen_random_uuid(),
  category_id         uuid references public.flower_categories (id) on delete set null,
  name_en             text not null,
  name_ta             text not null default '',
  stock_kg            numeric(12, 2) not null default 0,
  low_stock_threshold numeric(12, 2) not null default 0,
  default_rate        numeric(12, 2) not null default 0,
  active              boolean not null default true,
  created_at          timestamptz not null default now()
);

-- ---------- bills ----------
create table if not exists public.bills (
  id          uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  bill_date   date not null default current_date,
  luggage     numeric(12, 2) not null default 0,
  old_balance numeric(12, 2) not null default 0,  -- snapshot before this bill
  items_total numeric(12, 2) not null default 0,
  grand_total numeric(12, 2) not null default 0,  -- items + luggage + old_balance
  paid_amount numeric(12, 2) not null default 0,
  status      text not null default 'unpaid' check (status in ('unpaid', 'partial', 'paid')),
  created_by  uuid references auth.users (id),
  created_at  timestamptz not null default now()
);
create index if not exists bills_merchant_idx on public.bills (merchant_id);
create index if not exists bills_date_idx on public.bills (bill_date);

-- ---------- bill line items (flower name snapshotted so old bills never change) ----------
create table if not exists public.bill_items (
  id             uuid primary key default gen_random_uuid(),
  bill_id        uuid not null references public.bills (id) on delete cascade,
  flower_id      uuid references public.flowers (id) on delete set null,
  flower_name_en text not null default '',
  flower_name_ta text not null default '',
  kilo           numeric(12, 2) not null default 0,
  rate           numeric(12, 2) not null default 0,
  amount         numeric(12, 2) not null default 0
);
create index if not exists bill_items_bill_idx on public.bill_items (bill_id);

-- ---------- payments ----------
create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  amount      numeric(12, 2) not null default 0,
  paid_on     date not null default current_date,
  method      text not null default 'cash',
  note        text not null default '',
  created_by  uuid references auth.users (id),
  created_at  timestamptz not null default now()
);
create index if not exists payments_merchant_idx on public.payments (merchant_id);

-- ============================================================================
-- Atomic operations via RPC (security definer so they can touch many tables
-- safely while still requiring a logged-in user).
-- ============================================================================

-- create a bill: inserts bill + items, deducts stock, rolls old balance in,
-- updates the merchant's outstanding balance. items is a jsonb array of:
--   { flower_id, flower_name_en, flower_name_ta, kilo, rate }
create or replace function public.create_bill(
  p_merchant_id uuid,
  p_bill_date   date,
  p_luggage     numeric,
  p_items       jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_balance numeric(12,2);
  v_items_total numeric(12,2) := 0;
  v_grand_total numeric(12,2);
  v_bill_id     uuid;
  v_item        jsonb;
  v_amount      numeric(12,2);
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select balance into v_old_balance from public.merchants
    where id = p_merchant_id for update;
  if v_old_balance is null then
    raise exception 'Merchant not found';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_items_total := v_items_total
      + round((coalesce((v_item->>'kilo')::numeric,0) * coalesce((v_item->>'rate')::numeric,0)), 2);
  end loop;

  v_grand_total := v_items_total + coalesce(p_luggage,0) + v_old_balance;

  insert into public.bills (merchant_id, bill_date, luggage, old_balance,
                            items_total, grand_total, created_by)
  values (p_merchant_id, coalesce(p_bill_date, current_date), coalesce(p_luggage,0),
          v_old_balance, v_items_total, v_grand_total, auth.uid())
  returning id into v_bill_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_amount := round((coalesce((v_item->>'kilo')::numeric,0) * coalesce((v_item->>'rate')::numeric,0)), 2);
    insert into public.bill_items (bill_id, flower_id, flower_name_en, flower_name_ta, kilo, rate, amount)
    values (
      v_bill_id,
      nullif(v_item->>'flower_id','')::uuid,
      coalesce(v_item->>'flower_name_en',''),
      coalesce(v_item->>'flower_name_ta',''),
      coalesce((v_item->>'kilo')::numeric,0),
      coalesce((v_item->>'rate')::numeric,0),
      v_amount
    );
    -- deduct stock when the line is linked to a known flower
    if nullif(v_item->>'flower_id','') is not null then
      update public.flowers
        set stock_kg = stock_kg - coalesce((v_item->>'kilo')::numeric,0)
        where id = (v_item->>'flower_id')::uuid;
    end if;
  end loop;

  -- the grand total (including old balance) becomes the new outstanding
  update public.merchants set balance = v_grand_total where id = p_merchant_id;

  return v_bill_id;
end;
$$;

-- record a payment: reduces the merchant's outstanding balance.
create or replace function public.record_payment(
  p_merchant_id uuid,
  p_amount      numeric,
  p_paid_on     date,
  p_method      text,
  p_note        text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.payments (merchant_id, amount, paid_on, method, note, created_by)
  values (p_merchant_id, coalesce(p_amount,0), coalesce(p_paid_on, current_date),
          coalesce(p_method,'cash'), coalesce(p_note,''), auth.uid());

  update public.merchants
    set balance = greatest(balance - coalesce(p_amount,0), 0)
    where id = p_merchant_id;
end;
$$;

-- ============================================================================
-- Row Level Security
--   * everyone logged in can READ everything and DO daily billing
--   * only admins can add/edit/delete places, merchants, flowers, settings, users
-- ============================================================================
alter table public.profiles         enable row level security;
alter table public.shop_settings    enable row level security;
alter table public.places           enable row level security;
alter table public.merchants        enable row level security;
alter table public.flower_categories enable row level security;
alter table public.flowers          enable row level security;
alter table public.bills            enable row level security;
alter table public.bill_items       enable row level security;
alter table public.payments         enable row level security;

-- profiles: you can read all profiles; you can edit your own name; admins manage roles
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (true);
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- a reusable pattern: read for all authenticated, write for admins only
do $$
declare
  tbl text;
begin
  foreach tbl in array array['shop_settings','places','merchants','flower_categories','flowers']
  loop
    execute format('drop policy if exists %1$s_read on public.%1$s;', tbl);
    execute format('create policy %1$s_read on public.%1$s for select to authenticated using (true);', tbl);
    execute format('drop policy if exists %1$s_admin_write on public.%1$s;', tbl);
    execute format('create policy %1$s_admin_write on public.%1$s for all to authenticated using (public.is_admin()) with check (public.is_admin());', tbl);
  end loop;
end $$;

-- bills / bill_items / payments: any logged-in user can read & create (daily work),
-- only admins can delete.
do $$
declare
  tbl text;
begin
  foreach tbl in array array['bills','bill_items','payments']
  loop
    execute format('drop policy if exists %1$s_read on public.%1$s;', tbl);
    execute format('create policy %1$s_read on public.%1$s for select to authenticated using (true);', tbl);
    execute format('drop policy if exists %1$s_insert on public.%1$s;', tbl);
    execute format('create policy %1$s_insert on public.%1$s for insert to authenticated with check (true);', tbl);
    execute format('drop policy if exists %1$s_admin_delete on public.%1$s;', tbl);
    execute format('create policy %1$s_admin_delete on public.%1$s for delete to authenticated using (public.is_admin());', tbl);
  end loop;
end $$;

-- ============================================================================
-- Handy read-only views for reports
-- ============================================================================
create or replace view public.v_low_stock as
  select f.*, c.name_en as category_en, c.name_ta as category_ta
  from public.flowers f
  left join public.flower_categories c on c.id = f.category_id
  where f.active and f.stock_kg <= f.low_stock_threshold;

create or replace view public.v_pending_merchants as
  select m.*, p.name_en as place_en, p.name_ta as place_ta
  from public.merchants m
  join public.places p on p.id = m.place_id
  where m.balance > 0
  order by m.balance desc;
