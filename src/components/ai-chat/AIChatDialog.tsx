import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Image as ImageIcon, RotateCcw, Sparkles, Trash2, MessageSquare, Search, Loader2, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIChat, type ChatMessage } from '@/hooks/useAIChat';
import { useAIChatLimit } from '@/hooks/useAIChatLimit';
import { AIChatMessage } from './AIChatMessage';
import { useIsMobile } from '@/hooks/use-mobile';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AIChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIChatDialog({ open, onOpenChange }: AIChatDialogProps) {
  const { t } = useTranslation(['common', 'subscription']);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { isUnlimited, messagesRemaining, limitReached, incrementUsage } = useAIChatLimit();

  const quickActions = [
    t('aiChat.quickActions.mortality'),
    t('aiChat.quickActions.vaccinations'),
    t('aiChat.quickActions.reproductive'),
    t('aiChat.quickActions.corrals'),
    t('aiChat.quickActions.analyzeImage'),
    t('aiChat.quickActions.improvements'),
  ];
  
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    clearMessages,
    conversations,
    loadConversations,
    loadConversation,
    deleteConversation,
    conversationId,
    conversationTitle,
    isSaving
  } = useAIChat();

  // Load conversations when dialog opens
  useEffect(() => {
    if (open) {
      loadConversations();
    }
  }, [open, loadConversations]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !selectedImage) return;
    if (limitReached) return;

    await sendMessage(input || "Analiza esta imagen", selectedImage || undefined);
    incrementUsage();
    setInput('');
    setSelectedImage(null);
  };

  const handleQuickAction = (action: string) => {
    if (limitReached) return;
    sendMessage(action);
    incrementUsage();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    if (confirm(t('aiChat.deleteConfirm'))) {
      await deleteConversation(convId);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupConversationsByDate = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    return {
      today: filteredConversations.filter(c => new Date(c.updated_at) >= today),
      yesterday: filteredConversations.filter(c => {
        const date = new Date(c.updated_at);
        return date >= yesterday && date < today;
      }),
      thisWeek: filteredConversations.filter(c => {
        const date = new Date(c.updated_at);
        return date >= lastWeek && date < yesterday;
      }),
      older: filteredConversations.filter(c => new Date(c.updated_at) < lastWeek)
    };
  };

  const groupedConvs = groupConversationsByDate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'h-[85vh] max-w-[95vw]' : 'max-w-4xl h-[85vh]'} flex flex-col p-0`}>
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar con conversaciones (solo desktop) */}
          {!isMobile && (
            <div className="w-64 border-r flex flex-col">
              <div className="p-4 border-b">
                <Button 
                  onClick={clearMessages} 
                  className="w-full"
                  variant="default"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {t('aiChat.newConversation')}
                </Button>
                
                <div className="mt-3 relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('aiChat.search')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-2 space-y-4">
                  {groupedConvs.today.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground">{t('aiChat.today')}</div>
                      {groupedConvs.today.map(conv => (
                        <div
                          key={conv.id}
                          className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-accent ${
                            conversationId === conv.id ? 'bg-accent' : ''
                          }`}
                          onClick={() => loadConversation(conv.id)}
                        >
                          <MessageSquare className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm truncate flex-1">{conv.title}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteConversation(conv.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {groupedConvs.yesterday.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground">{t('aiChat.yesterday')}</div>
                      {groupedConvs.yesterday.map(conv => (
                        <div
                          key={conv.id}
                          className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-accent ${
                            conversationId === conv.id ? 'bg-accent' : ''
                          }`}
                          onClick={() => loadConversation(conv.id)}
                        >
                          <MessageSquare className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm truncate flex-1">{conv.title}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteConversation(conv.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {groupedConvs.thisWeek.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground">{t('aiChat.thisWeek')}</div>
                      {groupedConvs.thisWeek.map(conv => (
                        <div
                          key={conv.id}
                          className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-accent ${
                            conversationId === conv.id ? 'bg-accent' : ''
                          }`}
                          onClick={() => loadConversation(conv.id)}
                        >
                          <MessageSquare className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm truncate flex-1">{conv.title}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteConversation(conv.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {groupedConvs.older.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground">{t('aiChat.older')}</div>
                      {groupedConvs.older.map(conv => (
                        <div
                          key={conv.id}
                          className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-accent ${
                            conversationId === conv.id ? 'bg-accent' : ''
                          }`}
                          onClick={() => loadConversation(conv.id)}
                        >
                          <MessageSquare className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm truncate flex-1">{conv.title}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteConversation(conv.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Área principal del chat */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-shrink-0 p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">{conversationTitle}</h2>
                  {isSaving && (
                    <Badge variant="outline" className="text-xs">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      {t('aiChat.saving')}
                    </Badge>
                  )}
                </div>
                {isMobile && (
                  <Button onClick={clearMessages} variant="outline" size="sm">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              {/* Messages Area */}
              <ScrollArea ref={scrollRef} className="flex-1 pr-4 px-4">
                <div className="space-y-4 pb-4">
                  {messages.length === 0 && (
                    <div className="text-center py-8">
                      <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">{t('aiChat.welcomeTitle')}</h3>
                      <p className="text-muted-foreground mb-4">
                        {t('aiChat.welcomeMessage')}
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
              <div className="flex-shrink-0 pt-4 px-4 border-t">
                {/* Limit warning for Personal plan */}
                {!isUnlimited && !limitReached && messagesRemaining <= 5 && (
                  <Alert className="mb-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t('subscription:aiChat.messagesRemaining', { count: messagesRemaining })}
                    </AlertDescription>
                  </Alert>
                )}

                {limitReached && (
                  <Alert variant="destructive" className="mb-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t('subscription:aiChat.limitMessage')}
                    </AlertDescription>
                  </Alert>
                )}

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
                      placeholder={t('common:aiChat.inputPlaceholder')}
                      disabled={isLoading || limitReached}
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
                      disabled={isLoading || limitReached}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button 
                    type="submit" 
                    size="icon"
                    disabled={isLoading || limitReached || (!input.trim() && !selectedImage)}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>

                {messages.length > 0 && !isMobile && (
                  <div className="flex justify-center mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearMessages}
                      className="text-muted-foreground"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      {t('aiChat.newConversation')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}