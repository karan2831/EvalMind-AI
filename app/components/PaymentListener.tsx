'use client';

import { useEffect } from 'react';

export default function PaymentListener() {
  useEffect(() => {
    const handler = () => {
      console.log("[PAYMENT_LISTENER] Payment success event captured globally");
    };

    window.addEventListener('payment-success', handler);
    return () => window.removeEventListener('payment-success', handler);
  }, []);

  return null;
}
