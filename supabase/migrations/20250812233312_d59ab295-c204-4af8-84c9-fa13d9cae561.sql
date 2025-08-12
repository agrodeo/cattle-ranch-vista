
-- 1) Categorías de finanzas
create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null, -- 'ingreso' | 'egreso'
  "cabaña_id" uuid references public."cabañas"(id) on delete cascade,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- trigger updated_at
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_finance_categories_updated_at'
  ) then
    create trigger trg_finance_categories_updated_at
    before update on public.finance_categories
    for each row execute function public.update_updated_at_column();
  end if;
end$$;

alter table public.finance_categories enable row level security;

-- Políticas de RLS para finance_categories
drop policy if exists "Users can view finance categories (system or own cabana)" on public.finance_categories;
create policy "Users can view finance categories (system or own cabana)"
  on public.finance_categories
  for select
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and (
          finance_categories."cabaña_id" is null
          or u."cabaña_id" = finance_categories."cabaña_id"
        )
    )
  );

drop policy if exists "Users can insert finance categories for their cabana" on public.finance_categories;
create policy "Users can insert finance categories for their cabana"
  on public.finance_categories
  for insert
  with check (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u."cabaña_id" = finance_categories."cabaña_id"
    )
    and is_system = false
  );

drop policy if exists "Users can update finance categories for their cabana" on public.finance_categories;
create policy "Users can update finance categories for their cabana"
  on public.finance_categories
  for update
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u."cabaña_id" = finance_categories."cabaña_id"
    )
    and is_system = false
  )
  with check (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u."cabaña_id" = finance_categories."cabaña_id"
    )
    and is_system = false
  );

drop policy if exists "Users can delete finance categories for their cabana" on public.finance_categories;
create policy "Users can delete finance categories for their cabana"
  on public.finance_categories
  for delete
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u."cabaña_id" = finance_categories."cabaña_id"
    )
    and is_system = false
  );

create index if not exists idx_finance_categories_cabana_type on public.finance_categories("cabaña_id", type);
create index if not exists idx_finance_categories_name on public.finance_categories(name);

-- 2) Extensiones a finances
alter table public.finances
  add column if not exists category_id uuid references public.finance_categories(id) on delete set null,
  add column if not exists buyer_name text,
  add column if not exists buyer_document text,
  add column if not exists buyer_destination text;

create index if not exists idx_finances_category_id on public.finances(category_id);

-- 3) Tabla de detalle de ventas de animales vinculada a movimientos
create table if not exists public.finances_animal_sales (
  id uuid primary key default gen_random_uuid(),
  finance_id uuid not null references public.finances(id) on delete cascade,
  animal_id uuid not null references public.animals(id) on delete restrict,
  unit_price numeric
);

create index if not exists idx_finances_animal_sales_finance on public.finances_animal_sales(finance_id);
create index if not exists idx_finances_animal_sales_animal on public.finances_animal_sales(animal_id);

-- RLS opcional para detalle (acceso por pertenecer a la misma cabaña del movimiento)
alter table public.finances_animal_sales enable row level security;

drop policy if exists "Users can view finance animal sales for their cabana" on public.finances_animal_sales;
create policy "Users can view finance animal sales for their cabana"
  on public.finances_animal_sales
  for select
  using (
    exists (
      select 1
      from public.finances f
      join public.users u on u.id = auth.uid()
      where f.id = finances_animal_sales.finance_id
        and f."cabaña_id" = u."cabaña_id"
    )
  );

-- 4) Función para crear venta de animales y marcar vendidos
create or replace function public.create_animal_sale(
  _cabana_id uuid,
  _date date,
  _amount numeric,
  _description text,
  _buyer_name text,
  _buyer_document text,
  _buyer_destination text,
  _animal_ids uuid[],
  _unit_prices numeric[],
  _category_id uuid
) returns uuid
language plpgsql
security definER
set search_path = ''
as $func$
declare
  finance_id uuid;
  i int;
  price numeric;
  allowed boolean;
begin
  -- Verificación de permisos: admin o employee de la misma cabaña
  select exists(
    select 1
    from public.users u
    join public.user_roles ur on ur.user_id = u.id
    where u.id = auth.uid()
      and u."cabaña_id" = _cabana_id
      and ur.role in ('admin','employee')
  ) into allowed;

  if not allowed then
    raise exception 'Not authorized';
  end if;

  insert into public.finances ("cabaña_id", date, type, amount, description, category_id, buyer_name, buyer_document, buyer_destination)
  values (_cabana_id, _date, 'ingreso', _amount, _description, _category_id, _buyer_name, _buyer_document, _buyer_destination)
  returning id into finance_id;

  if _animal_ids is not null then
    for i in 1..array_length(_animal_ids, 1) loop
      price := null;
      if _unit_prices is not null and array_length(_unit_prices, 1) >= i then
        price := _unit_prices[i];
      end if;
      insert into public.finances_animal_sales (finance_id, animal_id, unit_price)
      values (finance_id, _animal_ids[i], price);
    end loop;

    update public.animals
      set status = 'vendido'
      where id = any(_animal_ids)
        and "cabaña_id" = _cabana_id;
  end if;

  return finance_id;
end;
$func$;

-- 5) Recurrentes
create table if not exists public.finance_recurring (
  id uuid primary key default gen_random_uuid(),
  "cabaña_id" uuid not null references public."cabañas"(id) on delete cascade,
  name text not null,
  type text not null, -- 'ingreso' | 'egreso'
  amount numeric not null default 0,
  category_id uuid references public.finance_categories(id) on delete set null,
  description text,
  frequency text not null, -- 'monthly' | 'weekly' | 'quarterly' | 'yearly' | 'custom'
  start_date date default now(),
  end_date date,
  next_run_date date,
  last_run_date date,
  day_of_month int,
  day_of_week int,
  interval_days int,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_finance_recurring_updated_at'
  ) then
    create trigger trg_finance_recurring_updated_at
    before update on public.finance_recurring
    for each row execute function public.update_updated_at_column();
  end if;
end$$;

alter table public.finance_recurring enable row level security;

drop policy if exists "Users can view recurring for their cabana" on public.finance_recurring;
create policy "Users can view recurring for their cabana"
  on public.finance_recurring
  for select
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u."cabaña_id" = finance_recurring."cabaña_id"
    )
  );

drop policy if exists "Users can insert recurring for their cabana" on public.finance_recurring;
create policy "Users can insert recurring for their cabana"
  on public.finance_recurring
  for insert
  with check (
    exists (
      select 1
      from public.users u
      join public.user_roles ur on ur.user_id = u.id
      where u.id = auth.uid()
        and u."cabaña_id" = finance_recurring."cabaña_id"
        and ur.role in ('admin','employee')
    )
  );

drop policy if exists "Users can update recurring for their cabana" on public.finance_recurring;
create policy "Users can update recurring for their cabana"
  on public.finance_recurring
  for update
  using (
    exists (
      select 1
      from public.users u
      join public.user_roles ur on ur.user_id = u.id
      where u.id = auth.uid()
        and u."cabaña_id" = finance_recurring."cabaña_id"
        and ur.role in ('admin','employee')
    )
  )
  with check (
    exists (
      select 1
      from public.users u
      join public.user_roles ur on ur.user_id = u.id
      where u.id = auth.uid()
        and u."cabaña_id" = finance_recurring."cabaña_id"
        and ur.role in ('admin','employee')
    )
  );

drop policy if exists "Users can delete recurring for their cabana" on public.finance_recurring;
create policy "Users can delete recurring for their cabana"
  on public.finance_recurring
  for delete
  using (
    exists (
      select 1
      from public.users u
      join public.user_roles ur on ur.user_id = u.id
      where u.id = auth.uid()
        and u."cabaña_id" = finance_recurring."cabaña_id"
        and ur.role in ('admin','employee')
    )
  );

create index if not exists idx_finance_recurring_cabana on public.finance_recurring("cabaña_id");
create index if not exists idx_finance_recurring_next_run on public.finance_recurring(next_run_date);
