import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import type { ReactNode } from 'react';

const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;

if (!clientId && import.meta.env.PROD) {
  // Surface misconfiguration loudly in production instead of loading PayPal with 'test'
  console.error('[PayPal] VITE_PAYPAL_CLIENT_ID is not set. Payment buttons will not work.');
}

const paypalOptions = {
  clientId: clientId || 'test',
  currency: 'EUR',
  intent: 'capture' as const,
  components: 'buttons',
  'enable-funding': 'card',
  'disable-funding': 'credit,paylater',
};

export default function PayPalProvider({ children }: { children: ReactNode }) {
  return (
    <PayPalScriptProvider options={paypalOptions}>
      {children}
    </PayPalScriptProvider>
  );
}
