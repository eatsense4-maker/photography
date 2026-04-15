import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import type { ReactNode } from 'react';

const paypalOptions = {
  clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test',
  currency: 'EUR',
  intent: 'capture' as const,
};

export default function PayPalProvider({ children }: { children: ReactNode }) {
  return (
    <PayPalScriptProvider options={paypalOptions}>
      {children}
    </PayPalScriptProvider>
  );
}
