-- Enable real-time for eventos table
ALTER TABLE public.eventos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.eventos;