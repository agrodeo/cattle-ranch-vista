-- Add explicit deny-all policy for password_reset_tokens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'password_reset_tokens' AND policyname = 'No direct access'
  ) THEN
    CREATE POLICY "No direct access" ON public.password_reset_tokens
      FOR ALL TO authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END $$;