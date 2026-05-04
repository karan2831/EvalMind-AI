'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { usePathname, useRouter } from 'next/navigation';

export default function NavBar() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const loadInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (mounted) {
          setUser(session?.user || null);
          setLoading(false);
        }
      } catch (err: any) {
        // Session load failed
        if (err.message?.includes("Refresh Token") || err.status === 400) {
          await supabase.auth.signOut();
          router.push("/login");
        }
        if (mounted) setLoading(false);
      }
    };

    loadInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' && !user) {
        setShowWelcome(true);
        setTimeout(() => mounted && setShowWelcome(false), 4000);
      }
      setUser(session?.user || null);
      setLoading(false);
    });

    const handlePaymentSuccess = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (mounted) {
          setUser(session?.user || null);
        }
      } catch (err) {
        // Payment refresh failed
      }
    };

    window.addEventListener('payment-success', handlePaymentSuccess);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('payment-success', handlePaymentSuccess);
    };
  }, []);

  useEffect(() => {
    const fetchNavProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (data) setProfile(data);
    };

    fetchNavProfile();

    window.addEventListener("profile-updated", fetchNavProfile);
    return () => window.removeEventListener("profile-updated", fetchNavProfile);
  }, []);

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 h-auto min-h-[4rem] py-2 sm:py-0 w-full max-w-7xl mx-auto gap-4">
          {/* Left: Logo & Branding */}
          <Link href="/" className="flex items-center gap-2 md:gap-3 transition-all duration-200 active:scale-95 group">
            <div className="flex items-center justify-center p-1 md:p-1.5 bg-white border border-gray-100 rounded-lg shadow-sm transition-transform duration-300 group-hover:scale-105 shrink-0">
              <div className="relative flex items-center justify-center w-7 h-7 md:w-8 md:h-8">
                <Image 
                  src="/logo.jpeg" 
                  alt="EvalMind AI Logo" 
                  width={32}
                  height={32}
                  className="object-cover rounded-md w-auto h-auto"
                  priority
                />
              </div>
            </div>
            <span className="text-lg md:text-xl font-bold tracking-tight text-gray-900 font-headline whitespace-nowrap">
              EvalMind <span className="text-blue-600 hidden xs:inline">AI</span>
            </span>
          </Link>
          
          {/* Center: Nav Tabs */}
          <nav className="hidden md:flex gap-1 bg-gray-100 p-1 rounded-full border border-gray-200/50">
            <Link href="/evaluate" className={`px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 ${isActive('/evaluate') ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>
              Evaluate
            </Link>
            {!loading && user && (
              <>
                <Link href="/profile" className={`px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 ${isActive('/profile') ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>
                  Profile
                </Link>
              </>
            )}
          </nav>
          
          {/* Right: Auth / Profile */}
          <div className="flex items-center">
            {loading ? (
              <div className="w-10 h-10 rounded-full bg-gray-50 animate-pulse border border-gray-100"></div>
            ) : user ? (
              <Link href="/profile" className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 hover:shadow-md transition-all duration-200 active:scale-90 hover:border-blue-200 flex items-center justify-center bg-white">
                {profile?.avatar && ['smile', 'cat', 'dog', 'octopus', 'lion', 'bot', 'ghost', 'sparkles'].includes(profile.avatar) ? (
                  <span className="text-xl select-none">
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
                    alt="User Profile" 
                    className="w-full h-full object-cover" 
                    src={profile?.avatar && profile.avatar.startsWith('avatar')
                      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.avatar === 'avatar1' ? 'Felix' : profile.avatar === 'avatar2' ? 'Aneka' : profile.avatar === 'avatar3' ? 'Buddy' : profile.avatar === 'avatar4' ? 'Cookie' : profile.avatar === 'avatar5' ? 'Daisy' : 'Elvis'}`
                      : `https://ui-avatars.com/api/?name=${profile?.full_name || user.user_metadata?.full_name || 'User'}&background=2563eb&color=fff`
                    } 
                  />
                )}
              </Link>
            ) : (
              <Link href="/login" className="text-xs font-bold uppercase tracking-widest text-gray-700 bg-white border border-gray-200 px-6 py-2.5 rounded-xl shadow-sm hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-200 active:scale-[0.98]">
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 py-3 pb-safe glass-nav z-50 rounded-t-3xl border-t border-[#d2d2d7]">
        <Link href="/evaluate" className={`flex flex-col items-center justify-center ${isActive('/evaluate') ? 'text-[#007aff]' : 'text-gray-600 hover:text-[#1d1d1f]'} px-5 py-1.5 tap-highlight-none active:scale-90 duration-200`}>
          <span className="material-symbols-outlined" style={isActive('/evaluate') ? { fontVariationSettings: "'FILL' 1" } : {}}>analytics</span>
          <span className="text-[10px] font-medium mt-1">Evaluate</span>
        </Link>
        {!loading && user && (
          <>
            <Link href="/profile" className={`flex flex-col items-center justify-center ${isActive('/profile') ? 'text-[#007aff]' : 'text-gray-600 hover:text-[#1d1d1f]'} px-5 py-1.5 tap-highlight-none active:scale-90 duration-200`}>
              <span className="material-symbols-outlined" style={isActive('/profile') ? { fontVariationSettings: "'FILL' 1" } : {}}>person</span>
              <span className="text-[10px] font-medium mt-1">Profile</span>
            </Link>
          </>
        )}
      </nav>

      {/* Welcome Toast */}
      {showWelcome && user && (
        <div className="fixed top-20 right-6 z-[60] animate-in slide-in-from-right-10 fade-in duration-500">
          <div className="bg-white border border-blue-100 shadow-2xl shadow-blue-600/10 rounded-2xl p-4 flex items-center gap-4 pr-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="material-symbols-outlined text-white">waving_hand</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Welcome back!</p>
              <p className="text-xs text-gray-500 font-medium">Ready for another precision evaluation?</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
