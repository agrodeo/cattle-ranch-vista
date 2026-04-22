import { useState } from 'react';
import { MessageCircle, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { AIChatDialog } from './AIChatDialog';
import { useAIChatLimit } from '@/hooks/useAIChatLimit';
import { Badge } from '@/components/ui/badge';

export function AIChatButton() {
  const { t } = useTranslation('subscription');
  const [isOpen, setIsOpen] = useState(false);
  const { hasAccess, isUnlimited, messagesRemaining, messagesUsed, monthlyLimit, limitReached, loading } = useAIChatLimit();

  if (loading) {
    return null;
  }

  return (
    <>
      <div
        className="fixed right-4 z-50 lg:bottom-6 lg:right-6 flex flex-col items-end gap-1"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }}
      >
        {/* Usage counter badge for limited plans */}
        {!isUnlimited && !limitReached && (
          <Badge variant="secondary" className="text-xs shadow-sm">
            {messagesUsed}/{monthlyLimit}
          </Badge>
        )}

        {limitReached && (
          <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">
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
