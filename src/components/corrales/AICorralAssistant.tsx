import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AICorralAssistantProps {
  corralesData: any[];
  currentRisks: number;
  cabanaId: string;
}

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function AICorralAssistant({ corralesData, currentRisks, cabanaId }: AICorralAssistantProps) {
  const { t } = useTranslation(['common', 'corrals']);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-corral-recommendations', {
        body: {
          requestType: 'chat',
          message: userMessage,
          context: {
            corralesData,
            currentRisks,
            cabanaId
          }
        }
      });

      if (error) throw error;

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.recommendation 
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(t('common:error.failed'));
      setMessages(prev => prev.slice(0, -1)); // Remove user message on error
    } finally {
      setLoading(false);
    }
  };

  const getAIRecommendations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-corral-recommendations', {
        body: {
          requestType: 'optimization',
          corralesData,
          currentRisks,
          objectives: 'Optimizar distribución y reducir riesgos de consanguinidad',
          productionGoals: 'Maximizar eficiencia productiva y reproductiva'
        }
      });

      if (error) throw error;

      const rec = data.recommendation;
      let responseText = '';

      if (typeof rec === 'object') {
        responseText = `**Análisis:**\n${rec.analysis}\n\n`;
        if (rec.priorities) {
          responseText += `**Prioridades:**\n${rec.priorities.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}\n\n`;
        }
        if (rec.shortTermActions) {
          responseText += `**Acciones inmediatas:**\n${rec.shortTermActions.map((a: string, i: number) => `• ${a}`).join('\n')}`;
        }
      } else {
        responseText = rec;
      }

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: responseText 
      }]);
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
      toast.error('Error al obtener recomendaciones de IA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50/50 to-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <span>Asistente IA de Corrales</span>
          </div>
          <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
            Inteligencia Artificial
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pregúntame sobre estrategias de distribución, manejo estacional, objetivos productivos, 
              o solicita recomendaciones personalizadas basadas en tus datos.
            </p>
            
            <div className="grid grid-cols-1 gap-2">
              <Button
                onClick={getAIRecommendations}
                variant="outline"
                size="sm"
                disabled={loading}
                className="justify-start text-left h-auto py-3"
              >
                <Sparkles className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="text-xs">¿Cómo puedo optimizar mis corrales?</span>
              </Button>
              
              <Button
                onClick={() => {
                  setInput('¿Cuáles son las mejores prácticas para evitar consanguinidad?');
                }}
                variant="outline"
                size="sm"
                className="justify-start text-left h-auto py-3"
              >
                <Sparkles className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="text-xs">Mejores prácticas para evitar consanguinidad</span>
              </Button>
              
              <Button
                onClick={() => {
                  setInput('¿Cómo debo distribuir animales según edad y categoría?');
                }}
                variant="outline"
                size="sm"
                className="justify-start text-left h-auto py-3"
              >
                <Sparkles className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="text-xs">Distribución por edad y categoría</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-100 ml-8'
                    : 'bg-white border mr-8'
                }`}
              >
                <div className="text-xs font-medium mb-1 text-muted-foreground">
                  {msg.role === 'user' ? 'Tú' : 'Asistente IA'}
                </div>
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Pensando...
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta algo sobre manejo de corrales..."
            className="min-h-[80px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            size="icon"
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
