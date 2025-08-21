-- Add location columns to cabañas table
alter table public.cabañas
  add column if not exists country_code text,
  add column if not exists province_code text,
  add column if not exists location_updated_at timestamptz;

-- Create profiles table if it doesn't exist
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cabaña_id uuid references public.cabañas(id) on delete set null,
  country_code text,
  province_code text,
  full_name text,
  email text,
  username text,
  employee_code text,
  position text,
  department text,
  hire_date date,
  last_login timestamptz,
  is_active boolean default true,
  is_internal_profile boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Create location touch trigger function
create or replace function public.touch_location_updated_at()
returns trigger language plpgsql as $$
begin
  new.location_updated_at := now();
  return new;
end$$;

-- Create trigger for location updates
drop trigger if exists trg_touch_location on public.cabañas;
create trigger trg_touch_location
before update on public.cabañas
for each row 
when (OLD.country_code is distinct from NEW.country_code or OLD.province_code is distinct from NEW.province_code)
execute function public.touch_location_updated_at();

-- RLS policies for profiles
drop policy if exists "Users can create their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can view their own profile and same cabaña users" on public.profiles;
drop policy if exists "Users can delete their own profile" on public.profiles;

create policy "Users can create their own profile" 
on public.profiles for insert 
with check (auth.uid() = user_id);

create policy "Users can update their own profile" 
on public.profiles for update 
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can view their own profile and same cabaña users" 
on public.profiles for select 
using (
  auth.uid() = user_id 
  or cabaña_id = (select cabaña_id from public.profiles where user_id = auth.uid())
);

create policy "Users can delete their own profile" 
on public.profiles for delete 
using (auth.uid() = user_id);