import { useState } from 'react';
import { MessageCircle, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { AIChatDialog } from './AIChatDialog';
import { useAIChatLimit } from '@/hooks/useAIChatLimit';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function AIChatButton() {
  const { t } = useTranslation('subscription');
  const [isOpen, setIsOpen] = useState(false);
  const { hasAccess, isUnlimited, messagesRemaining, limitReached, loading } = useAIChatLimit();

  if (loading) {
    return null;
  }

  // Free users see locked button
  if (!hasAccess) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="fixed bottom-24 right-6 z-50 h-14 w-14 rounded-full bg-muted hover:bg-muted shadow-lg lg:bottom-6 cursor-not-allowed"
              size="icon"
              disabled
            >
              <Lock className="h-6 w-6 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="font-medium">{t('aiChat.upgradeRequired')}</p>
            <p className="text-sm text-muted-foreground">{t('aiChat.upgradeMessage')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <>
      <div className="fixed bottom-24 right-6 z-50 lg:bottom-6 flex flex-col items-end gap-1">
        {limitReached && (
          <Badge variant="destructive" className="text-xs">
            {t('aiChat.limitReached')}
          </Badge>
        )}

        <Button
          onClick={() => setIsOpen(true)}
          className={`h-14 w-14 rounded-full shadow-lg ${
            limitReached 
              ? 'bg-muted hover:bg-muted cursor-not-allowed' 
              : 'bg-primary hover:bg-primary/90'
          }`}
          size="icon"
          disabled={limitReached}
        >
          {limitReached ? (
            <Lock className="h-6 w-6 text-muted-foreground" />
          ) : (
            <MessageCircle className="h-6 w-6 text-primary-foreground" />
          )}
        </Button>
      </div>

      <AIChatDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
