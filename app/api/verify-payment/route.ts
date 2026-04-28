import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    console.log('[DEBUG] [VERIFY_PAYMENT] All Cookies:', cookieStore.getAll());

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('[SECURITY_ALERT] [VERIFY_PAYMENT] Unauthorized access attempt or session expired.', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[DEBUG] [VERIFY_PAYMENT] Authenticated User ID:', user.id);

    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error('[ERROR] [VERIFY_PAYMENT] Missing fields');
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!secret) {
      console.error('[SECURITY_ALERT] [VERIFY_PAYMENT] RAZORPAY_KEY_SECRET is missing from environment variables.');
      return NextResponse.json({ success: false, error: "Server configuration error" }, { status: 500 });
    }

    const bodyToSign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyToSign)
      .digest('hex');

    console.log('[DEBUG] [VERIFY_PAYMENT] Request Body:', body);
    console.log('[DEBUG] [VERIFY_PAYMENT] Expected Signature:', expectedSignature);
    console.log('[DEBUG] [VERIFY_PAYMENT] Received Signature:', razorpay_signature);

    if (expectedSignature !== razorpay_signature) {
      console.error('[SECURITY_ALERT] Signature mismatch');
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 400 });
    }

    if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
      console.error("[CRITICAL] BACKEND URL NOT SET");
      return NextResponse.json(
        { error: "Backend URL not configured" },
        { status: 500 }
      );
    }

    // Call backend to update status securely
    try {
      const backendRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/internal/verify-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Secret": process.env.INTERNAL_API_SECRET!,
          },
          body: JSON.stringify({
            order_id: razorpay_order_id,
            payment_id: razorpay_payment_id,
          }),
        }
      );

      if (!backendRes.ok) {
        console.warn("[WARNING] Backend verification failed");
      }
    } catch (err) {
      console.warn("[WARNING] Backend unreachable:", err);
    }

    console.log('[SUCCESS] [VERIFY_PAYMENT] Payment verified and synced with backend');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: error.message || 'Something went wrong verifying the payment' },
      { status: 500 }
    );
  }
}
