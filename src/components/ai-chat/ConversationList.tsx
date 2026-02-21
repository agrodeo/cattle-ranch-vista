import { useTranslation } from 'react-i18next';
import { MessageSquare, Trash2, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Conversation } from '@/hooks/useAIChat';

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  searchQuery: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ConversationList({ conversations, activeId, searchQuery, onSelect, onDelete }: ConversationListProps) {
  const { t } = useTranslation('common');

  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupByDate = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups: { key: string; label: string; items: Conversation[] }[] = [
      { key: 'today', label: t('aiChat.today'), items: filtered.filter(c => new Date(c.updated_at) >= today) },
      { key: 'yesterday', label: t('aiChat.yesterday'), items: filtered.filter(c => { const d = new Date(c.updated_at); return d >= yesterday && d < today; }) },
      { key: 'thisWeek', label: t('aiChat.thisWeek'), items: filtered.filter(c => { const d = new Date(c.updated_at); return d >= lastWeek && d < yesterday; }) },
      { key: 'older', label: t('aiChat.older'), items: filtered.filter(c => new Date(c.updated_at) < lastWeek) },
    ];

    return groups.filter(g => g.items.length > 0);
  };

  const groups = groupByDate();

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <Inbox className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          {t('aiChat.noConversations', 'Tus conversaciones aparecerán aquí')}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-4">
        {groups.map(group => (
          <div key={group.key}>
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">{group.label}</div>
            {group.items.map(conv => (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-accent ${
                  activeId === conv.id ? 'bg-accent' : ''
                }`}
                onClick={() => onSelect(conv.id)}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm truncate flex-1">{conv.title}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
