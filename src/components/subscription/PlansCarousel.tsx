import React from 'react';
import { PlanCard } from './PlanCard';
import { Plan, BillingCycle } from '@/pages/Plans';

interface PlansCarouselProps {
  plans: Plan[];
  billingCycle: BillingCycle;
  selectedPlan: Plan | null;
  onPlanSelect: (plan: Plan) => void;
  loading?: boolean;
}

export function PlansCarousel({ 
  plans, 
  billingCycle, 
  selectedPlan, 
  onPlanSelect, 
  loading 
}: PlansCarouselProps) {
  return (
    <div className="overflow-x-auto scrollbar-none">
      <div className="flex gap-4 px-4 pb-2" style={{ width: 'max-content' }}>
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            billingCycle={billingCycle}
            isSelected={selectedPlan?.id === plan.id}
            onSelect={() => onPlanSelect(plan)}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
}