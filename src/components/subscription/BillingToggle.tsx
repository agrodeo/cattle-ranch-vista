import React from 'react';
import { Button } from '@/components/ui/button';
import { BillingCycle } from '@/pages/Plans';

interface BillingToggleProps {
  billingCycle: BillingCycle;
  onToggle: (cycle: BillingCycle) => void;
}

export function BillingToggle({ billingCycle, onToggle }: BillingToggleProps) {
  return (
    <div className="flex items-center justify-center">
      <div className="bg-muted rounded-lg p-1 flex">
        <Button
          variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onToggle('monthly')}
          className="rounded-md px-4 py-2 text-sm font-medium transition-all"
        >
          Mensual
        </Button>
        <Button
          variant={billingCycle === 'annual' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onToggle('annual')}
          className="rounded-md px-4 py-2 text-sm font-medium transition-all relative"
        >
          Anual
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
            -20%
          </span>
        </Button>
      </div>
    </div>
  );
}