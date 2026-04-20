'use client';

import NavBar from '@/app/components/NavBar';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
      }
      setLoading(false);
    }
    fetchUser();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
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
            <p className="text-[#86868b] text-sm mt-1">{user.email}</p>
          </div>
        </section>

        {/* Profile Sections */}
        <section className="space-y-6">
          <div className="apple-card overflow-hidden">
            <div className="p-4 border-b border-[#e5e5ea] flex items-center justify-between cursor-pointer hover:bg-[#f5f5f7] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#007aff] bg-opacity-10 text-[#007aff] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">person</span>
                </div>
                <span className="font-semibold text-sm">Personal Info</span>
              </div>
              <span className="material-symbols-outlined text-[#86868b] text-sm">arrow_forward_ios</span>
            </div>
            
            <div className="p-4 border-b border-[#e5e5ea] flex items-center justify-between cursor-pointer hover:bg-[#f5f5f7] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#34c759] bg-opacity-10 text-[#34c759] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">security</span>
                </div>
                <span className="font-semibold text-sm">Security & Password</span>
              </div>
              <span className="material-symbols-outlined text-[#86868b] text-sm">arrow_forward_ios</span>
            </div>
            
            <div className="p-4 border-b border-[#e5e5ea] flex items-center justify-between cursor-pointer hover:bg-[#f5f5f7] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#ff9500] bg-opacity-10 text-[#ff9500] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">settings</span>
                </div>
                <span className="font-semibold text-sm">Preferences</span>
              </div>
              <span className="material-symbols-outlined text-[#86868b] text-sm">arrow_forward_ios</span>
            </div>

            <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#f5f5f7] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#5856d6] bg-opacity-10 text-[#5856d6] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">help</span>
                </div>
                <span className="font-semibold text-sm">Support</span>
              </div>
              <span className="material-symbols-outlined text-[#86868b] text-sm">arrow_forward_ios</span>
            </div>
          </div>

          <div className="pt-6">
            <button 
              onClick={handleSignOut}
              className="w-full bg-white border border-[#ff3b30] text-[#ff3b30] hover:bg-[#ff3b30] hover:bg-opacity-10 py-3.5 rounded-xl font-semibold text-base transition-colors"
            >
              Sign Out
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
