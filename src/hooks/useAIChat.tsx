import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  image?: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string>('Nueva conversación');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('ai_chat_conversations')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }, []);

  // Load a specific conversation
  const loadConversation = useCallback(async (convId: string) => {
    try {
      setIsLoading(true);

      // Load conversation details
      const { data: conv, error: convError } = await supabase
        .from('ai_chat_conversations')
        .select('*')
        .eq('id', convId)
        .single();

      if (convError) throw convError;

      // Load messages
      const { data: msgs, error: msgsError } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('timestamp', { ascending: true });

      if (msgsError) throw msgsError;

      // Convert to ChatMessage format
      const chatMessages: ChatMessage[] = (msgs || []).map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        image: msg.image_url || undefined
      }));

      setConversationId(convId);
      setConversationTitle(conv.title);
      setMessages(chatMessages);
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la conversación',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new conversation
  const createNewConversation = useCallback(async (firstMessage: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Get user's cabaña - using 'cabana_id' column name
      const { data: userCabana } = await supabase
        .rpc('get_user_cabana_info', { user_uuid: user.id })
        .single();

      if (!userCabana?.cabana_id) throw new Error('No cabaña found');
      const cabanaId = userCabana.cabana_id;

      // Generate title from first message (max 50 chars)
      const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');

      const { data, error } = await supabase
        .from('ai_chat_conversations')
        .insert({
          user_id: user.id,
          'cabaña_id': cabanaId,
          title
        })
        .select()
        .single();

      if (error) throw error;

      setConversationId(data.id);
      setConversationTitle(data.title);
      await loadConversations();
      
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }, [loadConversations]);

  // Save a message to database
  const saveMessage = useCallback(async (message: ChatMessage, convId: string) => {
    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('ai_chat_messages')
        .insert({
          conversation_id: convId,
          role: message.role,
          content: message.content,
          image_url: message.image || null,
          timestamp: message.timestamp.toISOString()
        });

      if (error) throw error;

      // Update conversation's updated_at
      await supabase
        .from('ai_chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', convId);

      await loadConversations();
    } catch (error) {
      console.error('Error saving message:', error);
    } finally {
      setIsSaving(false);
    }
  }, [loadConversations]);

  // Upload image to storage
  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('ai-chat-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('ai-chat-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback(async (convId: string) => {
    try {
      const { error } = await supabase
        .from('ai_chat_conversations')
        .delete()
        .eq('id', convId);

      if (error) throw error;

      if (conversationId === convId) {
        setConversationId(null);
        setConversationTitle('Nueva conversación');
        setMessages([]);
      }

      await loadConversations();
      
      toast({
        title: 'Conversación eliminada',
        description: 'La conversación se eliminó correctamente'
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la conversación',
        variant: 'destructive'
      });
    }
  }, [conversationId, loadConversations]);

  const sendMessage = useCallback(async (
    content: string, 
    image?: File,
    includeContext: boolean = true
  ) => {
    // Create new conversation if this is the first message
    let currentConvId = conversationId;
    if (!currentConvId && messages.length === 0) {
      currentConvId = await createNewConversation(content);
    }

    // Upload image if provided
    let imageUrl: string | undefined;
    if (image) {
      const uploadedUrl = await uploadImage(image);
      imageUrl = uploadedUrl || URL.createObjectURL(image);
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
      image: imageUrl,
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Save user message to database
    if (currentConvId) {
      await saveMessage(userMessage, currentConvId);
    }

    setIsLoading(true);

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      // Convert new image to base64 if provided (for sending to OpenAI)
      let newImageBase64: string | null = null;
      if (image) {
        newImageBase64 = await fileToBase64(image);
      }

      // Prepare messages for AI - always use base64 for current image
      let aiMessages = messages.map(msg => {
        // For old messages with images (stored URLs), we still need to handle them
        // But OpenAI may not be able to download from Storage, so we skip image for old messages
        return {
          role: msg.role,
          content: msg.content
        };
      });

      // Add current user message with base64 image if provided
      if (newImageBase64) {
        aiMessages.push({
          role: 'user',
          content: [
            { type: "text", text: content },
            { 
              type: "image_url", 
              image_url: { 
                url: newImageBase64,
                detail: "high"
              } 
            }
          ] as any
        });
      } else {
        aiMessages.push({
          role: 'user',
          content: content
        });
      }

      // Use Supabase function invoke for streaming
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlqenhiandld3p5aGpxdWhyZnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwODUxNDUsImV4cCI6MjA2NzY2MTE0NX0.q78732rZWj61LtlkEBOYj259ML4cHkRTTy60nhlsBH8',
      };

      // Only add Authorization header if we have a valid session
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch(`https://yjzxbjwewzyhjquhrfzv.supabase.co/functions/v1/ai-chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: aiMessages,
          includeContext
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to get AI response`);
      }
      
      if (!response.body) {
        throw new Error('No response body received from AI service');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      let buffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }
          
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantMessage.content += content;
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === assistantMessage.id 
                    ? { ...msg, content: assistantMessage.content }
                    : msg
                )
              );
            }
          } catch (error) {
            // Incomplete JSON, put it back in buffer
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Save assistant message to database
      if (currentConvId) {
        await saveMessage(assistantMessage, currentConvId);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('AI chat error:', error);
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
        
        if (currentConvId) {
          await saveMessage(errorMessage, currentConvId);
        }
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, conversationId, createNewConversation, saveMessage, uploadImage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setConversationTitle('Nueva conversación');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    conversationId,
    conversationTitle,
    conversations,
    loadConversations,
    loadConversation,
    deleteConversation,
    isSaving
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}