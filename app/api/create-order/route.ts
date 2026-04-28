import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createServerClient } from '@supabase/ssr';

export async function GET() {
  return NextResponse.json({ test: "working" });
}

export async function POST(request: Request) {
  console.log("[CREATE_ORDER] POST HIT");
  
  console.log("[DEBUG] Backend Razorpay Key:", process.env.RAZORPAY_KEY_ID);

  if (!process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live_")) {
    console.error("[CRITICAL] Not using LIVE Razorpay key. [ERROR] Razorpay running in TEST mode");
    return NextResponse.json(
      { error: "Payment system not in LIVE mode" },
      { status: 500 }
    );
  }
  
  console.log("[SUCCESS] Razorpay running in LIVE mode");

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                request.cookies.set(name, value, options)
              );
            } catch {
              // Ignore in server environment
            }
          },
        },
      }
    );

    console.log('[DEBUG] [CREATE_ORDER] All Cookies:', request.cookies.getAll());

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('[SECURITY_ALERT] [CREATE_ORDER] Unauthorized access attempt or session expired.', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[DEBUG] [CREATE_ORDER] Authenticated User ID:', user.id);

    const body = await request.json();
    const { amount, currency = 'INR', receipt = 'receipt_' + Date.now() } = body;

    if (!amount || amount < 100) {
      return NextResponse.json(
        { error: 'Amount must be at least 100 paise' },
        { status: 400 }
      );
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    console.log(`[CREATE_ORDER] Initializing order for user: ${user.id}, amount: ${amount}`);
    
    // Step 1: Create Razorpay order safely
    let order;

    try {
      order = await razorpay.orders.create({
        amount: amount.toString(),
        currency,
        receipt
      });

      console.log("[DEBUG] Razorpay Order:", order);

      if (!order || !order.id) {
        throw new Error("Invalid Razorpay order");
      }

    } catch (err) {
      console.error("[CRITICAL] Razorpay failed:", err);
      return NextResponse.json(
        { error: "Razorpay order failed" },
        { status: 500 }
      );
    }

    if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
      console.error("[CRITICAL] BACKEND URL NOT SET");
      return NextResponse.json(
        { error: "Backend URL not configured" },
        { status: 500 }
      );
    }

    // Step 2: Backend sync (NON-BLOCKING)
    try {
      const backendRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/internal/create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Secret": process.env.INTERNAL_API_SECRET!,
          },
          body: JSON.stringify({
            order_id: order.id,
            user_id: user.id,
            amount: order.amount,
            currency: order.currency,
          }),
        }
      );

      console.log("[DEBUG] Backend status:", backendRes.status);

      if (!backendRes.ok) {
        const text = await backendRes.text();
        console.error("[ERROR] Backend failed:", text);
      }
    } catch (err) {
      console.error("[WARNING] Backend sync failed:", err);
    }

    // Step 3: ALWAYS return order
    console.log("[SUCCESS] Order sent to frontend:", order.id);
    return NextResponse.json(order);
  } catch (error: any) {
    console.error('[ERROR] [CREATE_ORDER] Exception:', error);
    return NextResponse.json(
      { error: error.message || 'Something went wrong while creating the order' },
      { status: 500 }
    );
  }
}
