import { Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DensityToggleProps {
  density: 'compact' | 'comfortable';
  onChange: (density: 'compact' | 'comfortable') => void;
}

export function DensityToggle({ density, onChange }: DensityToggleProps) {
  return (
    <div className="flex items-center gap-1 border rounded-lg p-1">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-8 px-3 gap-2',
          density === 'compact' && 'bg-muted'
        )}
        onClick={() => onChange('compact')}
      >
        <Smartphone className="h-4 w-4" />
        <span className="hidden sm:inline">Compacta</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-8 px-3 gap-2',
          density === 'comfortable' && 'bg-muted'
        )}
        onClick={() => onChange('comfortable')}
      >
        <Monitor className="h-4 w-4" />
        <span className="hidden sm:inline">Cómoda</span>
      </Button>
    </div>
  );
}