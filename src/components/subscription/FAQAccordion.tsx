import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export function FAQAccordion() {
  const { t } = useTranslation(['subscription']);

  const faqItems = [
    { q: t('plansPage.faq.q1'), a: t('plansPage.faq.a1') },
    { q: t('plansPage.faq.q2'), a: t('plansPage.faq.a2') },
    { q: t('plansPage.faq.q3'), a: t('plansPage.faq.a3') },
    { q: t('plansPage.faq.q4'), a: t('plansPage.faq.a4') },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        {t('plansPage.faq.title')}
      </h2>
      
      <Accordion type="single" collapsible className="space-y-2">
        {faqItems.map((faq, index) => (
          <AccordionItem 
            key={index} 
            value={`item-${index}`}
            className="border rounded-lg px-4"
          >
            <AccordionTrigger className="text-left text-sm font-medium">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
