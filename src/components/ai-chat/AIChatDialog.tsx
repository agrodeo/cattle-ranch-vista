import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Send, Image as ImageIcon, RotateCcw, Sparkles, MessageSquare, Search,
  Loader2, AlertCircle, Scale, Heart, BarChart3, Stethoscope, TrendingUp,
  History, X, ArrowUpCircle, ChevronDown,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIChat } from '@/hooks/useAIChat';
import { useAIChatLimit } from '@/hooks/useAIChatLimit';
import { AIChatMessage } from './AIChatMessage';
import { ConversationList } from './ConversationList';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer';
import { useNavigate } from 'react-router-dom';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';

interface AIChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_ACTION_ICONS = [Scale, Stethoscope, Heart, BarChart3, ImageIcon, TrendingUp];

export function AIChatDialog({ open, onOpenChange }: AIChatDialogProps) {
  const { t } = useTranslation(['common', 'subscription']);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { isUnlimited, messagesRemaining, messagesUsed, monthlyLimit, limitReached, incrementUsage } = useAIChatLimit();

  const quickActions = [
    t('aiChat.quickActions.mortality'),
    t('aiChat.quickActions.vaccinations'),
    t('aiChat.quickActions.reproductive'),
    t('aiChat.quickActions.corrals'),
    t('aiChat.quickActions.analyzeImage'),
    t('aiChat.quickActions.improvements'),
  ];

  const {
    messages, isLoading, sendMessage, clearMessages,
    conversations, loadConversations, loadConversation, deleteConversation,
    conversationId, conversationTitle, isSaving,
  } = useAIChat();

  useEffect(() => {
    if (open) loadConversations();
  }, [open, loadConversations]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }, []);

  const clearImage = useCallback(() => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedImage(null);
    setImagePreview(null);
  }, [imagePreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !selectedImage) return;
    if (limitReached) return;

    await sendMessage(input || 'Analiza esta imagen', selectedImage || undefined);
    incrementUsage();
    setInput('');
    clearImage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleQuickAction = (action: string) => {
    if (limitReached) return;
    sendMessage(action);
    incrementUsage();
  };

  const handleDeleteConversation = async (convId: string) => {
    if (confirm(t('aiChat.deleteConfirm'))) {
      await deleteConversation(convId);
    }
  };

  // --- Shared render pieces ---

  const usageIndicator = !isUnlimited && (
    <span className="text-xs text-muted-foreground">
      {messagesUsed}/{monthlyLimit} {t('subscription:aiChat.messagesLabel', 'mensajes')}
    </span>
  );

  const welcomeScreen = (
    <div className="text-center py-6 px-3">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3">
        <Sparkles className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-base font-semibold mb-1">{t('aiChat.welcomeTitle')}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto leading-relaxed">
        {t('aiChat.welcomeMessage')}
      </p>
      {usageIndicator && <div className="mb-4">{usageIndicator}</div>}

      <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
        {quickActions.map((action, i) => {
          const Icon = QUICK_ACTION_ICONS[i] || Sparkles;
          return (
            <Button
              key={i}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction(action)}
              className="text-left justify-start gap-2 h-auto py-2 px-2.5 whitespace-normal"
            >
              <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="text-xs leading-tight line-clamp-2">{action}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );

  const loadingDots = (() => {
    if (!isLoading) return null;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'assistant' && lastMsg.content.length > 0) return null;
    return (
      <div className="flex justify-start">
        <div className="bg-muted rounded-lg p-3 max-w-[80%]">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        </div>
      </div>
    );
  })();

  const inputArea = (
    <div className={`flex-shrink-0 ${isMobile ? 'px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]' : 'px-4 pb-4'} pt-3 border-t space-y-2 bg-background`}>
      {!isUnlimited && !limitReached && messagesRemaining <= 5 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{t('subscription:aiChat.messagesRemaining', { count: messagesRemaining })}</span>
        </div>
      )}

      {limitReached && (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{t('subscription:aiChat.limitMessage')}</span>
          </div>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-primary flex-shrink-0"
            onClick={() => { onOpenChange(false); navigate('/plans'); }}
          >
            <ArrowUpCircle className="h-3.5 w-3.5 mr-1" />
            {t('subscription:aiChat.upgrade', 'Mejorar plan')}
          </Button>
        </div>
      )}

      {selectedImage && imagePreview && (
        <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
          <img src={imagePreview} alt="Preview" className="h-10 w-10 rounded object-cover flex-shrink-0" />
          <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">{selectedImage.name}</span>
          <Button size="icon" variant="ghost" onClick={clearImage} className="h-6 w-6 flex-shrink-0">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <div className="flex-1 relative min-w-0">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('common:aiChat.inputPlaceholder')}
            disabled={isLoading || limitReached}
            className="min-h-[52px] max-h-[120px] resize-none pr-10 py-2.5 text-sm placeholder:leading-tight"
            rows={isMobile ? 2 : 1}
          />
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || limitReached}
            className="absolute right-1 bottom-1 h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
        </div>
        <Button
          type="submit"
          size="icon"
          className="h-[52px] w-[44px] flex-shrink-0"
          disabled={isLoading || limitReached || (!input.trim() && !selectedImage)}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {messages.length > 0 && !isMobile && (
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={clearMessages} className="text-muted-foreground text-xs">
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            {t('aiChat.newConversation')}
          </Button>
        </div>
      )}
    </div>
  );

  const chatContent = (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <ScrollArea ref={scrollRef} className={`flex-1 ${isMobile ? 'px-3' : 'px-4'}`}>
        <div className="space-y-4 py-3 overflow-hidden">
          {messages.length === 0 && welcomeScreen}
          {messages.map((message) => (
            <AIChatMessage key={message.id} message={message} />
          ))}
          {loadingDots}
        </div>
      </ScrollArea>
      {inputArea}
    </div>
  );

  // --- Mobile history drawer ---
  const mobileHistoryDrawer = (
    <Drawer open={historyOpen} onOpenChange={setHistoryOpen}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('aiChat.history', 'Historial')}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('aiChat.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="max-h-[50vh] overflow-auto">
          <ConversationList
            conversations={conversations}
            activeId={conversationId}
            searchQuery={searchQuery}
            onSelect={(id) => { loadConversation(id); setHistoryOpen(false); }}
            onDelete={handleDeleteConversation}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );

  // ===================== MOBILE: use Drawer (bottom sheet, no X overlap) =====================
  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="h-[92dvh] max-h-[92dvh] flex flex-col overflow-hidden">
            {/* Clean mobile header */}
            <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm font-semibold truncate">{conversationTitle}</span>
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground flex-shrink-0" />}
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Button onClick={() => setHistoryOpen(true)} variant="ghost" size="icon" className="h-8 w-8">
                  <History className="h-4 w-4" />
                </Button>
                <Button onClick={clearMessages} variant="ghost" size="icon" className="h-8 w-8">
                  <MessageSquare className="h-4 w-4" />
                </Button>
                <Button onClick={() => onOpenChange(false)} variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {chatContent}
          </DrawerContent>
        </Drawer>
        {mobileHistoryDrawer}
      </>
    );
  }

  // ===================== DESKTOP: use Dialog =====================
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          {/* Desktop sidebar */}
          <div className="w-64 border-r flex flex-col">
            <div className="p-4 border-b">
              <Button onClick={clearMessages} className="w-full" variant="default">
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
            <ConversationList
              conversations={conversations}
              activeId={conversationId}
              searchQuery={searchQuery}
              onSelect={loadConversation}
              onDelete={handleDeleteConversation}
            />
          </div>

          {/* Main chat area */}
          <div className="flex-1 flex flex-col min-h-0">
            <DialogHeader className="flex-shrink-0 p-4 border-b">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <DialogTitle className="font-semibold">{conversationTitle}</DialogTitle>
                {isSaving && (
                  <Badge variant="outline" className="text-xs">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    {t('aiChat.saving')}
                  </Badge>
                )}
                {usageIndicator && <div className="ml-auto">{usageIndicator}</div>}
              </div>
            </DialogHeader>
            {chatContent}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
