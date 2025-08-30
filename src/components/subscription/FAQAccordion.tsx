import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const FAQ_DATA = [
  {
    question: '¿Puedo cancelar cuando quiera?',
    answer: 'Sí, podés cancelar tu suscripción en cualquier momento desde tu cuenta. No hay compromisos a largo plazo ni penalidades por cancelación. Tu plan seguirá activo hasta el final del período de facturación actual.'
  },
  {
    question: '¿Cómo funciona la prueba gratis?',
    answer: 'Tenés 7 días para probar cualquier plan sin costo. Durante la prueba, tenés acceso completo a todas las funciones del plan elegido. Si decidís no continuar, simplemente cancelá antes de que termine la prueba y no se te cobrará nada.'
  },
  {
    question: '¿Cómo cambio de plan?',
    answer: 'Podés cambiar tu plan en cualquier momento desde la configuración de tu cuenta. Si cambiás a un plan superior, el cambio es inmediato. Si cambiás a un plan inferior, el cambio se aplicará en tu próximo período de facturación.'
  },
  {
    question: '¿Cómo pido factura A?',
    answer: 'Para obtener facturas tipo A, contactanos a ayuda@agrodeo.farm con tus datos fiscales (CUIT, razón social, domicilio fiscal). Configuraremos tu cuenta para emitir las facturas correspondientes a partir de tu próximo período de facturación.'
  }
];

export function FAQAccordion() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        Preguntas frecuentes
      </h2>
      
      <Accordion type="single" collapsible className="space-y-2">
        {FAQ_DATA.map((faq, index) => (
          <AccordionItem 
            key={index} 
            value={`item-${index}`}
            className="border rounded-lg px-4"
          >
            <AccordionTrigger className="text-left text-sm font-medium">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}