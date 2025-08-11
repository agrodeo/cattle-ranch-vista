-- Add explicit deny-all policy to satisfy linter while keeping the table inaccessible to clients
create policy if not exists "No direct access" on public.password_reset_tokens
for all to authenticated using (false) with check (false);