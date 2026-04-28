'use client';

import { useState } from 'react';
import Script from 'next/script';

export default function RazorpayButton({ amountInPaise = 50000 }: { amountInPaise?: number }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const initializeRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    try {
      setIsLoading(true);
      setMessage(null);

      const res = await initializeRazorpay();

      if (!res) {
        setMessage({ type: 'error', text: 'Razorpay SDK failed to load. Are you online?' });
        return;
      }

      // 1. Create order on the backend
      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountInPaise,
        }),
        credentials: 'include',
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const orderData = await orderResponse.json();

      // 2. Open Razorpay modal
      console.log("[DEBUG] Razorpay Key:", process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
      
      if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.startsWith("rzp_live_")) {
        console.error("[ERROR] Razorpay running in TEST mode");
      } else {
        console.log("[SUCCESS] Razorpay running in LIVE mode");
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Enter the Key ID generated from the Dashboard
        amount: orderData.amount, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
        currency: orderData.currency,
        name: 'EvalMind AI',
        description: 'Premium Plan Upgrade',
        order_id: orderData.id, //This is a sample Order ID. Pass the `id` obtained in the response of Step 1
        handler: async function (response: any) {
          // 3. Verify payment signature on the backend
          try {
            const verifyResponse = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
              credentials: 'include',
            });

            if (!verifyResponse.ok) {
              const errorData = await verifyResponse.json();
              throw new Error(errorData.error || 'Failed to verify payment');
            }

            const verifyData = await verifyResponse.json();
            if (verifyData.success) {
              setMessage({ type: 'success', text: 'Payment successful!' });
            } else {
              setMessage({ type: 'error', text: 'Payment verification failed.' });
            }
          } catch (err: any) {
            console.error('Verification error:', err);
            setMessage({ type: 'error', text: err.message || 'Payment verification failed' });
          }
        },
        prefill: {
          name: 'John Doe',
          email: 'johndoe@example.com',
          contact: '9999999999',
        },
        theme: {
          color: '#3399cc',
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      
      paymentObject.on('payment.failed', function (response: any) {
        console.error('Payment failed', response.error);
        setMessage({ type: 'error', text: `Payment failed: ${response.error.description}` });
      });

      paymentObject.open();
    } catch (error: any) {
      console.error('Payment error:', error);
      setMessage({ type: 'error', text: error.message || 'An error occurred during payment processing.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 border rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold">Premium Upgrade</h3>
      <p className="text-sm text-gray-600">Secure Payment via Razorpay</p>
      
      <button
        onClick={handlePayment}
        disabled={isLoading}
        className="px-6 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Processing...' : `Pay ₹${amountInPaise / 100}`}
      </button>

      {message && (
        <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
