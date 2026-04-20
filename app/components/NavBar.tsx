'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { usePathname } from 'next/navigation';

export default function NavBar() {
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-6 h-16 w-full max-w-7xl mx-auto">
          {/* Left: Logo & Branding */}
          <Link href="/" className="flex items-center gap-2 md:gap-3 transition-all duration-200 active:scale-95 group">
            <div className="flex items-center justify-center p-1 md:p-1.5 bg-white border border-gray-100 rounded-lg shadow-sm transition-transform duration-300 group-hover:scale-105 shrink-0">
              <div className="relative w-7 h-7 md:w-8 md:h-8">
                <Image 
                  src="/logo.jpeg" 
                  alt="EvalMind AI Logo" 
                  fill
                  className="object-cover rounded-md"
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
            {user && (
              <>
                <Link href="/history" className={`px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 ${isActive('/history') ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>
                  History
                </Link>
                <Link href="/profile" className={`px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 ${isActive('/profile') ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>
                  Profile
                </Link>
              </>
            )}
          </nav>
          
          {/* Right: Auth / Profile */}
          <div className="flex items-center">
            {user ? (
              <Link href="/profile" className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 hover:shadow-md transition-all duration-200 active:scale-90 hover:border-blue-200">
                <img alt="User Profile" className="w-full h-full object-cover" src={`https://ui-avatars.com/api/?name=${user.user_metadata?.full_name || 'User'}&background=2563eb&color=fff`} />
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
        {user && (
          <>
            <Link href="/history" className={`flex flex-col items-center justify-center ${isActive('/history') ? 'text-[#007aff]' : 'text-gray-600 hover:text-[#1d1d1f]'} px-5 py-1.5 tap-highlight-none active:scale-90 duration-200`}>
              <span className="material-symbols-outlined" style={isActive('/history') ? { fontVariationSettings: "'FILL' 1" } : {}}>history</span>
              <span className="text-[10px] font-medium mt-1">History</span>
            </Link>
            <Link href="/profile" className={`flex flex-col items-center justify-center ${isActive('/profile') ? 'text-[#007aff]' : 'text-gray-600 hover:text-[#1d1d1f]'} px-5 py-1.5 tap-highlight-none active:scale-90 duration-200`}>
              <span className="material-symbols-outlined" style={isActive('/profile') ? { fontVariationSettings: "'FILL' 1" } : {}}>person</span>
              <span className="text-[10px] font-medium mt-1">Profile</span>
            </Link>
          </>
        )}
      </nav>
    </>
  );
}
