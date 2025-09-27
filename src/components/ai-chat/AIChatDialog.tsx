import { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, RotateCcw, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIChat, type ChatMessage } from '@/hooks/useAIChat';
import { AIChatMessage } from './AIChatMessage';
import { useIsMobile } from '@/hooks/use-mobile';

interface AIChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const quickActions = [
  "¿Cómo está mi ganado hoy?",
  "¿Qué vacunas necesito aplicar?",
  "Muéstrame un resumen financiero",
  "¿Hay alertas reproductivas?",
];

export function AIChatDialog({ open, onOpenChange }: AIChatDialogProps) {
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  const { messages, isLoading, sendMessage, clearMessages } = useAIChat();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !selectedImage) return;

    await sendMessage(input || "Analiza esta imagen", selectedImage || undefined);
    setInput('');
    setSelectedImage(null);
  };

  const handleQuickAction = (action: string) => {
    sendMessage(action);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'h-[85vh] max-w-[95vw]' : 'max-w-2xl h-[80vh]'} flex flex-col`}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Asistente Ganadero IA
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages Area */}
          <ScrollArea ref={scrollRef} className="flex-1 pr-4">
            <div className="space-y-4 pb-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">¡Hola! Soy tu asistente ganadero</h3>
                  <p className="text-muted-foreground mb-4">
                    Puedo ayudarte con información sobre tu cabaña, analizar imágenes de animales, 
                    y responder preguntas sobre ganadería.
                  </p>
                  
                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 gap-2 max-w-md mx-auto">
                    {quickActions.map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction(action)}
                        className="text-left justify-start"
                      >
                        {action}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <AIChatMessage key={message.id} message={message} />
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="flex-shrink-0 pt-4 border-t">
            {selectedImage && (
              <div className="mb-3 p-2 bg-muted rounded-lg flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                <span className="text-sm">{selectedImage.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedImage(null)}
                  className="ml-auto h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="flex-1 flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe tu pregunta o sube una imagen..."
                  disabled={isLoading}
                />
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </div>

              <Button 
                type="submit" 
                size="icon"
                disabled={isLoading || (!input.trim() && !selectedImage)}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>

            {messages.length > 0 && (
              <div className="flex justify-center mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearMessages}
                  className="text-muted-foreground"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Nueva conversación
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}