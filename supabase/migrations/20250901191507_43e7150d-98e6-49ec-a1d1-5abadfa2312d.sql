-- Create herd_settings table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'herd_settings') THEN
    CREATE TABLE public.herd_settings (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      cabaña_id uuid NOT NULL,
      country text DEFAULT 'Argentina',
      region text,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    );

    -- Enable RLS on herd_settings
    ALTER TABLE public.herd_settings ENABLE ROW LEVEL SECURITY;

    -- Create policies for herd_settings
    CREATE POLICY "Users can manage herd settings for their cabaña" ON public.herd_settings
    FOR ALL USING (cabaña_id = get_current_user_cabana_id())
    WITH CHECK (cabaña_id = get_current_user_cabana_id());
  END IF;
END $$;

-- Create custom_vaccines table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'custom_vaccines') THEN
    CREATE TABLE public.custom_vaccines (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      cabaña_id uuid NOT NULL,
      name text NOT NULL,
      description text,
      created_by uuid NOT NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL,
      UNIQUE(cabaña_id, name)
    );

    -- Enable RLS on custom_vaccines
    ALTER TABLE public.custom_vaccines ENABLE ROW LEVEL SECURITY;

    -- Create policies for custom_vaccines
    CREATE POLICY "Users can manage custom vaccines for their cabaña" ON public.custom_vaccines
    FOR ALL USING (cabaña_id = get_current_user_cabana_id())
    WITH CHECK (cabaña_id = get_current_user_cabana_id());
  END IF;
END $$;