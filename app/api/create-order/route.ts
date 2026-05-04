import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
  return NextResponse.json({ test: "working" });
}

export async function POST(request: Request) {

  if (!process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live_")) {
    // Not using LIVE Razorpay key
    return NextResponse.json(
      { error: "Payment system not in LIVE mode" },
      { status: 500 }
    );
  }
  

  try {
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
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore in server environment
            }
          },
        },
      }
    );


    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      // Unauthorized access attempt
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


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

    
    // Step 1: Create Razorpay order safely
    let order;

    try {
      order = await razorpay.orders.create({
        amount: amount.toString(),
        currency,
        receipt
      });


      if (!order || !order.id) {
        throw new Error("Invalid Razorpay order");
      }

    } catch (err) {
      // Razorpay failed
      return NextResponse.json(
        { error: "Razorpay order failed" },
        { status: 500 }
      );
    }

    if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
      // BACKEND URL NOT SET
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


      if (!backendRes.ok) {
        const text = await backendRes.text();
        // Backend failed
      }
    } catch (err) {
      // Backend sync failed
    }

    // Step 3: ALWAYS return order
    return NextResponse.json(order);
  } catch (error: any) {
    // Create order exception
    console.error('[ERROR] [CREATE_ORDER] Exception');
    return NextResponse.json(
      { error: error.message || 'Something went wrong while creating the order' },
      { status: 500 }
    );
  }
}
