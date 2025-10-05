-- Create enum for message roles
CREATE TYPE public.chat_message_role AS ENUM ('user', 'assistant');

-- Create ai_chat_conversations table
CREATE TABLE public.ai_chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabaña_id UUID NOT NULL REFERENCES public.cabañas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ai_chat_messages table
CREATE TABLE public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_chat_conversations(id) ON DELETE CASCADE,
  role chat_message_role NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.ai_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_chat_conversations
CREATE POLICY "Users can view their own conversations"
  ON public.ai_chat_conversations
  FOR SELECT
  USING (user_id = auth.uid() AND cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can insert their own conversations"
  ON public.ai_chat_conversations
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can update their own conversations"
  ON public.ai_chat_conversations
  FOR UPDATE
  USING (user_id = auth.uid() AND cabaña_id = get_current_user_cabana_id());

CREATE POLICY "Users can delete their own conversations"
  ON public.ai_chat_conversations
  FOR DELETE
  USING (user_id = auth.uid() AND cabaña_id = get_current_user_cabana_id());

-- RLS policies for ai_chat_messages
CREATE POLICY "Users can view their own messages"
  ON public.ai_chat_messages
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ai_chat_conversations
    WHERE id = conversation_id 
    AND user_id = auth.uid()
    AND cabaña_id = get_current_user_cabana_id()
  ));

CREATE POLICY "Users can insert their own messages"
  ON public.ai_chat_messages
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_chat_conversations
    WHERE id = conversation_id 
    AND user_id = auth.uid()
    AND cabaña_id = get_current_user_cabana_id()
  ));

CREATE POLICY "Users can delete their own messages"
  ON public.ai_chat_messages
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.ai_chat_conversations
    WHERE id = conversation_id 
    AND user_id = auth.uid()
    AND cabaña_id = get_current_user_cabana_id()
  ));

-- Create indexes for better performance
CREATE INDEX idx_conversations_user_cabana ON public.ai_chat_conversations(user_id, cabaña_id);
CREATE INDEX idx_conversations_updated ON public.ai_chat_conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation ON public.ai_chat_messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON public.ai_chat_messages(timestamp);

-- Create storage bucket for AI chat images
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-chat-images', 'ai-chat-images', false);

-- Storage policies for ai-chat-images bucket
CREATE POLICY "Users can upload their own chat images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'ai-chat-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own chat images"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'ai-chat-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own chat images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'ai-chat-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_ai_chat_conversations_updated_at
  BEFORE UPDATE ON public.ai_chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();