
-- 1) Categorías
create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  "cabaña_id" uuid null,
  name text not null,
  type text not null check (type in ('ingreso','egreso')),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique ("cabaña_id", name, type)
);

alter table public.finance_categories enable row level security;

-- Leer categorías del sistema (cabaña_id IS NULL) y de la propia cabaña
create policy if not exists "Usuarios pueden ver categorias de su cabaña y del sistema"
on public.finance_categories
for select
to authenticated
using (
  "cabaña_id" is null
  or exists (
    select 1 from public.users u
    where u.id = auth.uid() and u."cabaña_id" = finance_categories."cabaña_id"
  )
);

-- Crear/editar/borrar solo categorías de la propia cabaña
create policy if not exists "Admins/empleados pueden crear categorias en su cabaña"
on public.finance_categories
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users u
    join public.user_roles ur on ur.user_id = u.id
    where u.id = auth.uid()
      and u."cabaña_id" = finance_categories."cabaña_id"
      and ur.role in ('admin','employee')
  ) and finance_categories."cabaña_id" is not null
);

create policy if not exists "Admins/empleados pueden actualizar categorias en su cabaña"
on public.finance_categories
for update
to authenticated
using (
  exists (
    select 1
    from public.users u
    join public.user_roles ur on ur.user_id = u.id
    where u.id = auth.uid()
      and u."cabaña_id" = finance_categories."cabaña_id"
      and ur.role in ('admin','employee')
  ) and finance_categories."cabaña_id" is not null
)
with check (
  exists (
    select 1
    from public.users u
    join public.user_roles ur on ur.user_id = u.id
    where u.id = auth.uid()
      and u."cabaña_id" = finance_categories."cabaña_id"
      and ur.role in ('admin','employee')
  ) and finance_categories."cabaña_id" is not null
);

create policy if not exists "Admins/empleados pueden borrar categorias en su cabaña"
on public.finance_categories
for delete
to authenticated
using (
  exists (
    select 1
    from public.users u
    join public.user_roles ur on ur.user_id = u.id
    where u.id = auth.uid()
      and u."cabaña_id" = finance_categories."cabaña_id"
      and ur.role in ('admin','employee')
  ) and finance_categories."cabaña_id" is not null
);

-- Semilla de categorías del sistema (solo si no existen)
do $$
declare
  cat record;
begin
  for cat in
    select unnest(array[
      -- Egresos
      row('Sueldos y cargas sociales','egreso'),
      row('Alquiler de campo','egreso'),
      row('Veterinaria','egreso'),
      row('Alimentos y suplementos','egreso'),
      row('Combustible y transporte','egreso'),
      row('Mantenimiento e insumos','egreso'),
      row('Infraestructura y mejoras','egreso'),
      row('Servicios','egreso'),
      row('Reproducción','egreso'),
      row('Compra de animales','egreso'),
      row('Impuestos y tasas','egreso'),
      row('Seguros','egreso'),
      row('Otros egresos','egreso'),
      -- Ingresos
      row('Venta de animales','ingreso'),
      row('Venta de subproductos','ingreso'),
      row('Subsidios/ayudas','ingreso'),
      row('Servicios a terceros','ingreso'),
      row('Otros ingresos','ingreso')
    ]) as t(name text, type text)
  loop
    insert into public.finance_categories ("cabaña_id", name, type, is_system)
    values (null, cat.t.name, cat.t.type, true)
    on conflict ("cabaña_id", name, type) do nothing;
  end loop;
end$$;

-- 2) Extender finances con categoría y datos de comprador/destino
alter table public.finances
  add column if not exists category_id uuid null references public.finance_categories(id) on delete set null,
  add column if not exists buyer_name text null,
  add column if not exists buyer_document text null,
  add column if not exists buyer_destination text null;

create index if not exists idx_finances_cabana_category on public.finances("cabaña_id", category_id);

-- 3) Ventas de animales: tabla puente
create table if not exists public.finances_animal_sales (
  id uuid primary key default gen_random_uuid(),
  finance_id uuid not null references public.finances(id) on delete cascade,
  animal_id uuid not null references public.animals(id) on delete restrict,
  unit_price numeric null,
  created_at timestamptz not null default now(),
  unique(finance_id, animal_id)
);

alter table public.finances_animal_sales enable row level security;

-- RLS: ver y gestionar solo ventas relacionadas a finanzas de su cabaña
create policy if not exists "Usuarios pueden ver ventas de su cabaña"
on public.finances_animal_sales
for select
to authenticated
using (
  exists (
    select 1
    from public.finances f
    join public.users u on u.id = auth.uid()
    where f.id = finances_animal_sales.finance_id
      and f."cabaña_id" = u."cabaña_id"
  )
);

create policy if not exists "Admins/empleados pueden gestionar ventas de su cabaña"
on public.finances_animal_sales
for all
to authenticated
using (
  exists (
    select 1
    from public.finances f
    join public.users u on u.id = auth.uid()
    join public.user_roles ur on ur.user_id = u.id
    where f.id = finances_animal_sales.finance_id
      and f."cabaña_id" = u."cabaña_id"
      and ur.role in ('admin','employee')
  )
)
with check (
  exists (
    select 1
    from public.finances f
    join public.users u on u.id = auth.uid()
    join public.user_roles ur on ur.user_id = u.id
    where f.id = finances_animal_sales.finance_id
      and f."cabaña_id" = u."cabaña_id"
      and ur.role in ('admin','employee')
  )
);

create index if not exists idx_fas_finance on public.finances_animal_sales(finance_id);
create index if not exists idx_fas_animal on public.finances_animal_sales(animal_id);

-- 4) Recurrentes
do $$ begin
  create type public.recurrence_frequency as enum ('monthly','weekly','yearly','quarterly','custom');
exception when duplicate_object then null; end $$;

create table if not exists public.finance_recurring (
  id uuid primary key default gen_random_uuid(),
  "cabaña_id" uuid not null,
  name text not null,
  type text not null check (type in ('ingreso','egreso')),
  amount numeric not null,
  category_id uuid null references public.finance_categories(id) on delete set null,
  description text null,
  frequency public.recurrence_frequency not null default 'monthly',
  start_date date not null default (now()::date),
  end_date date null,
  next_run_date date not null default (now()::date),
  last_run_date date null,
  day_of_month int null check (day_of_month between 1 and 31),
  day_of_week int null check (day_of_week between 0 and 6),
  interval_days int null check (interval_days > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.finance_recurring enable row level security;

create policy if not exists "Usuarios pueden ver recurrentes de su cabaña"
on public.finance_recurring
for select
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid() and u."cabaña_id" = finance_recurring."cabaña_id"
  )
);

create policy if not exists "Admins/empleados pueden gestionar recurrentes de su cabaña"
on public.finance_recurring
for all
to authenticated
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

create index if not exists idx_recurring_cabana_next on public.finance_recurring("cabaña_id", next_run_date);

-- 5) Función para crear venta de animales de forma atómica
create or replace function public.create_animal_sale(
  _cabana_id uuid,
  _date date,
  _amount numeric,
  _description text,
  _buyer_name text,
  _buyer_document text,
  _buyer_destination text,
  _animal_ids uuid[],
  _unit_prices numeric[] default null,
  _category_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role_ok boolean;
  v_finance_id uuid;
  v_cat_id uuid;
  i int;
begin
  -- Verificar rol y cabaña del usuario
  select exists (
    select 1
    from public.users u
    join public.user_roles ur on ur.user_id = u.id
    where u.id = v_user_id
      and u."cabaña_id" = _cabana_id
      and ur.role in ('admin','employee')
  ) into v_role_ok;

  if not v_role_ok then
    raise exception 'No autorizado';
  end if;

  -- Resolver categoría: si no viene, buscar "Venta de animales" del sistema
  if _category_id is null then
    select id into v_cat_id
    from public.finance_categories
    where name = 'Venta de animales' and type = 'ingreso'
    order by case when "cabaña_id" = _cabana_id then 0 else 1 end
    limit 1;
  else
    v_cat_id := _category_id;
  end if;

  -- Insertar movimiento
  insert into public.finances ("cabaña_id", date, type, amount, description, category_id, buyer_name, buyer_document, buyer_destination)
  values (_cabana_id, _date, 'ingreso', _amount, _description, v_cat_id, _buyer_name, _buyer_document, _buyer_destination)
  returning id into v_finance_id;

  -- Insertar animales y actualizar estado
  if array_length(_animal_ids,1) is null then
    raise exception 'Se requiere al menos un animal';
  end if;

  i := 1;
  while i <= array_length(_animal_ids,1) loop
    insert into public.finances_animal_sales (finance_id, animal_id, unit_price)
    values (v_finance_id, _animal_ids[i], case when _unit_prices is null then null else _unit_prices[i] end);

    update public.animals
    set status = 'vendido'
    where id = _animal_ids[i]
      and "cabaña_id" = _cabana_id;

    i := i + 1;
  end loop;

  return v_finance_id;
end;
$$;

-- 6) Refuerzos de performance
create index if not exists idx_finances_cabana_date on public.finances("cabaña_id", "date");
