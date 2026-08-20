import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import type { ReactNode } from 'react';

const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;

if (!clientId && import.meta.env.PROD) {
  // Surface misconfiguration loudly in production instead of loading PayPal with 'test'
  console.error('[PayPal] VITE_PAYPAL_CLIENT_ID is not set. Payment buttons will not work.');
}

export const paypalOptions = {
  clientId: clientId || 'test',
  currency: 'EUR',
  intent: 'capture' as const,
  components: 'buttons',
  'enable-funding': 'card',
  'disable-funding': 'credit,paylater',
  // deferLoading: the script is loaded eagerly at the app level so it is
  // always ready when the payment step is reached, eliminating the
  // mount/unmount race that caused intermittent blank buttons for some users.
};

/**
 * Top-level provider — mount ONCE in App.tsx, not inside modals/pages.
 * Mounting PayPalScriptProvider inside a component that unmounts (e.g. a
 * modal) leaves the SDK script tag in the DOM but destroys the React
 * context, causing the buttons to hang indefinitely on the next open.
 */
export default function PayPalProvider({ children }: { children: ReactNode }) {
  return (
    <PayPalScriptProvider options={paypalOptions}>
      {children}
    </PayPalScriptProvider>
  );
}
