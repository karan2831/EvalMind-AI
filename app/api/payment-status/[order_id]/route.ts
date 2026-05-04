import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ order_id: string }> }
) {
  try {
    const { order_id } = await params;
    
    // 1. Authenticate Request
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll().map((cookie) => ({
              name: cookie.name ?? "",
              value: cookie.value ?? "",
            }));
          },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
          },
        },
      }
    );

    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Init Razorpay
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    // 3. Fetch Payments for Order from Razorpay
    const payments = await razorpay.orders.fetchPayments(order_id);
    const capturedPayment = payments.items.find(p => p.status === 'captured');

    // 4. Fetch Order from Supabase
    // Note: We use the anon key here, so RLS policies should allow the user to read their own payments.
    // If not, we'll know if they own the order.
    const { data: paymentData, error: dbError } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', order_id)
      .single();

    if (dbError || !paymentData) {
      return NextResponse.json({ error: 'Order not found in database' }, { status: 404 });
    }

    if (paymentData.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized order access' }, { status: 403 });
    }

    // 5. Reconcile via Backend (Removes Service Role from Next.js)
    if (capturedPayment) {
      if (paymentData.status !== 'captured') {
        console.log(`[RECONCILIATION] Webhook missed for order ${order_id}. Delegating to backend.`);
        
        // Call FastAPI internal endpoint
        if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
          console.error("[CRITICAL] BACKEND URL NOT SET");
          return NextResponse.json({ error: "Backend URL not configured" }, { status: 500 });
        }
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const response = await fetch(`${backendUrl}/internal/reconcile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Secret': process.env.INTERNAL_API_SECRET || 'default_secret_if_not_set'
          },
          body: JSON.stringify({
            order_id,
            payment_id: capturedPayment.id,
            amount: capturedPayment.amount,
            currency: capturedPayment.currency,
            status: capturedPayment.status
          })
        });

        if (!response.ok) {
           console.error('[ERROR] Backend reconciliation failed', await response.text());
           return NextResponse.json({ error: 'Backend reconciliation failed' }, { status: 500 });
        }
        
        return NextResponse.json({ status: 'captured', reconciled: true });
      } else {
        return NextResponse.json({ status: 'captured', reconciled: false });
      }
    } else {
      return NextResponse.json({ status: paymentData.status, reconciled: false });
    }
  } catch (error: any) {
    console.error('[ERROR] Reconciliation failed:', error);
    return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 });
  }
}
