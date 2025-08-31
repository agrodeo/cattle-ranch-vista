import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LanguageSwitcherProps {
  variant?: 'full' | 'compact' | 'icon';
  className?: string;
}

const languageOptions = {
  es: {
    label: 'Español (ES)',
    flag: '🇪🇸',
    short: 'ES'
  },
  en: {
    label: 'English (EN)',
    flag: '🇬🇧',
    short: 'EN'
  },
  pt: {
    label: 'Português (PT-BR)',
    flag: '🇧🇷',
    short: 'PT'
  }
};

export function LanguageSwitcher({ variant = 'full', className = '' }: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const { lang, setLang, isLoading } = useLanguage();

  const currentOption = languageOptions[lang as keyof typeof languageOptions] || languageOptions.es;

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${className}`}
        disabled={isLoading}
        title={t('common.language.switch')}
      >
        <Globe className="h-4 w-4" />
      </Button>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Globe className="h-4 w-4 text-muted-foreground" />
        <Badge variant="outline" className="font-mono">
          {currentOption.short}
        </Badge>
        <Select 
          value={lang} 
          onValueChange={setLang}
          disabled={isLoading}
        >
          <SelectTrigger className="w-auto border-none bg-transparent p-0 h-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[200px] bg-background border shadow-md z-50">
            {Object.entries(languageOptions).map(([code, option]) => (
              <SelectItem key={code} value={code}>
                <div className="flex items-center gap-2">
                  <span>{option.flag}</span>
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select 
        value={lang} 
        onValueChange={setLang}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[200px] bg-background">
          <SelectValue>
            <div className="flex items-center gap-2">
              <span>{currentOption.flag}</span>
              <span>{currentOption.label}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-background border shadow-md z-50">
          {Object.entries(languageOptions).map(([code, option]) => (
            <SelectItem key={code} value={code}>
              <div className="flex items-center gap-2">
                <span>{option.flag}</span>
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}