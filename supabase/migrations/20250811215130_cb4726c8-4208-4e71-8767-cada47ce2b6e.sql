-- Create password reset tokens table for SimpleAuth flow
-- Using service-role edge functions to manage tokens; clients will not have RLS access

-- 1) Table
create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token text not null unique,
  expires_at timestamp with time zone not null,
  used_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  created_by uuid null,
  constraint password_reset_tokens_user_fk foreign key (user_id)
    references public.users(id) on delete cascade
);

-- 2) Indexes
create index if not exists idx_password_reset_tokens_user_id on public.password_reset_tokens(user_id);
create index if not exists idx_password_reset_tokens_expires_at on public.password_reset_tokens(expires_at);
create index if not exists idx_password_reset_tokens_used_at on public.password_reset_tokens(used_at);

-- 3) Enable RLS and deny by default (no permissive policies created for clients)
alter table public.password_reset_tokens enable row level security;

-- For observability/auditing, optionally allow admins to view tokens if needed in future.
-- Not adding policies now to avoid any risk; service role bypasses RLS.

-- 4) Optional helper function to validate tokens server-side (can be used by RPC later if needed)
create or replace function public.is_valid_password_reset_token(_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.password_reset_tokens t
    where t.token = _token
      and t.used_at is null
      and t.expires_at > now()
  );
$$;