'use client';

import NavBar from '@/app/components/NavBar';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Footer from '@/app/components/Footer';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) {
      setProfile(data);
      return data;
    }
    return null;
  };

  useEffect(() => {
    let mounted = true;

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (!session) {
        setLoading(false);
        router.push('/login');
      } else {
        setUser(session.user);
        await fetchProfile(session.user.id);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    const handler = () => {
      if (user) {
        fetchProfile(user.id);
      } else {
        window.location.reload();
      }
    };

    window.addEventListener('payment-success', handler);
    return () => window.removeEventListener('payment-success', handler);
  }, [user]);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) return resolve(true);

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async () => {
    try {
      await loadRazorpay();

      if (!user) {
        alert('You must be logged in to upgrade.');
        router.push('/login');
        return;
      }

      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 9900 }),
      });

      // 🔍 Debug raw response
      console.log("[DEBUG] RAW RESPONSE:", res);

      // Read raw text first
      const text = await res.text();
      console.log("[DEBUG] RAW TEXT:", text);

      // Safe JSON parse
      let order;
      try {
        order = JSON.parse(text);
      } catch (e) {
        console.error("[ERROR] JSON parse failed:", e);
        throw new Error("Invalid JSON response from server");
      }

      console.log("[DEBUG] PARSED ORDER:", order);

      // Handle API errors properly
      if (!res.ok) {
        throw new Error(order?.error || "Order API failed");
      }

      // Strict validation
      if (!order || !order.id) {
        console.error("[ERROR] Order creation failed:", order);
        throw new Error("Order creation failed - invalid response");
      }

      console.log("[DEBUG] Opening Razorpay with order:", order.id);
      
      console.log("[DEBUG] Razorpay Key:", process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);

      if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.startsWith("rzp_live_")) {
        console.error("[ERROR] Razorpay running in TEST mode");
      } else {
        console.log("[SUCCESS] Razorpay running in LIVE mode");
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'EvalMind AI',
        description: 'Upgrade to Pro',
        order_id: order.id,

        handler: async function (response: any) {
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
            credentials: 'include',
          });

          const data = await verifyRes.json();

          if (data.success) {
            console.log("[SUCCESS] Payment verified & UI updated (reactive)");
            alert("🎉 Payment successful! You are now a Pro user.");
            
            // 🔁 Refresh user data
            if (user) {
              await fetchProfile(user.id);
            }
            window.dispatchEvent(new Event('payment-success'));

            // 🟡 fallback safety (important): only reload if reactivity fails
            setTimeout(async () => {
              try {
                const refreshed = await fetchProfile(user.id);

                if (refreshed?.tier !== "premium") {
                  console.warn("[FALLBACK] UI not updated, forcing reload");
                  window.location.reload();
                }
              } catch (err) {
                console.error("[FALLBACK ERROR]", err);
                window.location.reload();
              }
            }, 2000);
          } else {
            alert('Verification failed: ' + (data.error || 'Unknown error'));
          }
        },
        theme: {
          color: '#2563eb',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error(err);
      alert('Payment failed');
    }
  };

  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (err) {
      console.warn("[WARNING] SignOut lock issue (safe):", err);
      router.push('/');
    } finally {
      setIsSigningOut(false);
    }
  };

  if (loading || !user) return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
      <span className="material-symbols-outlined animate-spin text-[#007aff] text-4xl">sync</span>
    </div>
  );

  return (
    <div className="font-body text-[#1d1d1f] antialiased min-h-screen">
      <NavBar />
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24 space-y-12 z-10 relative">
        {/* Profile Header */}
        <section className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white shadow-md bg-white">
              <img alt="User Avatar" className="w-full h-full object-cover" src={`https://ui-avatars.com/api/?name=${user.user_metadata?.full_name || 'User'}&background=007aff&color=fff&size=150`} />
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-white border border-[#d2d2d7] rounded-full shadow-sm flex items-center justify-center text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors">
              <span className="material-symbols-outlined text-[16px]">edit</span>
            </button>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">{user.user_metadata?.full_name || 'User'}</h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <p className="text-[#86868b] text-sm">{user.email}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${profile?.tier === 'premium' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                {profile?.tier || 'Free'} Plan
              </span>
            </div>
            
            {profile?.tier !== 'premium' && (
              <button
                onClick={handleUpgrade}
                className="mt-6 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20 flex items-center gap-2 mx-auto"
              >
                <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                Upgrade to Pro (₹99)
              </button>
            )}
          </div>
        </section>

        {/* Profile Sections */}
        <section className="space-y-6">
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">person</span>
                </div>
                <span className="font-semibold text-sm">Personal Info</span>
              </div>
              <span className="material-symbols-outlined text-gray-400 text-sm">arrow_forward_ios</span>
            </div>
            
            <div className="p-4 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">security</span>
                </div>
                <span className="font-semibold text-sm">Security & Password</span>
              </div>
              <span className="material-symbols-outlined text-gray-400 text-sm">arrow_forward_ios</span>
            </div>
            
            <div className="p-4 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">settings</span>
                </div>
                <span className="font-semibold text-sm">Preferences</span>
              </div>
              <span className="material-symbols-outlined text-gray-400 text-sm">arrow_forward_ios</span>
            </div>

            <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">help</span>
                </div>
                <span className="font-semibold text-sm">Support</span>
              </div>
              <span className="material-symbols-outlined text-gray-400 text-sm">arrow_forward_ios</span>
            </div>
          </div>

          <div className="pt-6">
            <button 
              onClick={handleSignOut}
              className="w-full bg-white border border-gray-200 text-gray-900 hover:bg-red-50 hover:border-red-400 py-3.5 rounded-xl font-semibold text-base transition-all duration-200 cursor-pointer active:scale-[0.98]"
            >
              Sign Out
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
