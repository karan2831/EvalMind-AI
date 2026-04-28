'use client';

import NavBar from '@/app/components/NavBar';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Footer from '@/app/components/Footer';
import { PageSkeleton } from '@/app/components/skeletons/PageSkeleton';
import ProfileForm from '@/app/components/profile/ProfileForm';
import SupportForm from '@/app/components/support/SupportForm';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'support'>('profile');
  const router = useRouter();

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
        setProfile(data);
        return data;
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setProfileLoading(false);
    }
    return null;
  };

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        if (session) {
          setUser(session.user);
          setLoading(false);
          fetchProfile(session.user.id);
        } else {
          router.push('/login');
        }
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        router.push('/login');
        return;
      }

      if (session) {
        setUser(session.user);
        setLoading(false);
        fetchProfile(session.user.id);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
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

  if (loading && !user) return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <NavBar />
      <PageSkeleton type="profile" />
    </div>
  );

  return (
    <div className="font-body text-[#1d1d1f] antialiased min-h-screen transition-opacity duration-300 opacity-100">
      <NavBar />
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24 space-y-12 z-10 relative">
        {/* Profile Header */}
        <section className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className={`w-24 h-24 rounded-full overflow-hidden border-2 border-white shadow-md bg-white flex items-center justify-center ${profileLoading ? 'animate-pulse' : ''}`}>
              {profileLoading ? (
                <div className="w-full h-full bg-gray-200" />
              ) : profile?.avatar && ['smile', 'cat', 'dog', 'octopus', 'lion', 'bot', 'ghost', 'sparkles'].includes(profile.avatar) ? (
                <span className="text-5xl select-none">
                  {profile.avatar === 'smile' ? '😀' : 
                   profile.avatar === 'cat' ? '😺' : 
                   profile.avatar === 'dog' ? '🐶' : 
                   profile.avatar === 'octopus' ? '🐙' : 
                   profile.avatar === 'lion' ? '🦁' : 
                   profile.avatar === 'bot' ? '🤖' : 
                   profile.avatar === 'ghost' ? '👻' : '✨'}
                </span>
              ) : (
                <img 
                  alt="User Avatar" 
                  className="w-full h-full object-cover" 
                  src={profile?.avatar && profile.avatar.startsWith('avatar')
                    ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.avatar === 'avatar1' ? 'Felix' : profile.avatar === 'avatar2' ? 'Aneka' : profile.avatar === 'avatar3' ? 'Buddy' : profile.avatar === 'avatar4' ? 'Cookie' : profile.avatar === 'avatar5' ? 'Daisy' : 'Elvis'}`
                    : `https://ui-avatars.com/api/?name=${profile?.full_name || user.user_metadata?.full_name || 'User'}&background=007aff&color=fff&size=150`
                  } 
                />
              )}
            </div>
          </div>
          <div>
            {profileLoading ? (
              <div className="space-y-2 flex flex-col items-center">
                <div className="h-7 w-48 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-4 w-64 bg-gray-100 rounded-lg animate-pulse" />
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">{profile?.full_name || user.user_metadata?.full_name || 'User'}</h1>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <p className="text-[#86868b] text-sm">{user.email}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${profile?.tier === 'premium' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                    {profile?.tier || 'Free'} Plan
                  </span>
                </div>
              </>
            )}
            
            {profile?.tier !== 'premium' && !profileLoading && (
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

        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-2xl gap-1">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Personal Info
          </button>
          <button 
            onClick={() => setActiveTab('support')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'support' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Support
          </button>
        </div>

        {/* Dynamic Section */}
        <section className="space-y-6">
          {activeTab === 'profile' && <ProfileForm />}
          {activeTab === 'support' && <SupportForm />}

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
