'use client';

import NavBar from '@/app/components/NavBar';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchHistory() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setSessionUser(session.user);

      const { data, error } = await supabase
        .from('evaluation_history')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (data) setHistory(data);
      setLoading(false);
    }
    fetchHistory();
  }, []);

  return (
    <div className="font-body text-[#1d1d1f] antialiased min-h-screen">
      <NavBar />

      <main className="pt-32 pb-32 px-6 max-w-5xl mx-auto z-10 relative">
        {/* Header Section */}
        <div className="mb-10">
          <h2 className="font-headline text-3xl font-bold tracking-tight text-[#1d1d1f] mb-2">Past Evaluations</h2>
          <p className="text-[#86868b] font-medium text-sm">Review your past academic assessments and progress metrics.</p>
        </div>

        {/* Filter Tabs */}
        {sessionUser && history.length > 0 && (
          <div className="flex gap-2 mb-8 border-b border-[#e5e5ea] pb-4 overflow-x-auto scrollbar-hide">
            <button className="px-5 py-2 rounded-full bg-[#1d1d1f] text-white font-semibold text-sm whitespace-nowrap">All Time</button>
            <button className="px-5 py-2 rounded-full bg-white border border-[#d2d2d7] text-[#1d1d1f] font-semibold text-sm hover:bg-[#f5f5f7] transition-all whitespace-nowrap">High Scores</button>
            <button className="px-5 py-2 rounded-full bg-white border border-[#d2d2d7] text-[#1d1d1f] font-semibold text-sm hover:bg-[#f5f5f7] transition-all whitespace-nowrap">Pending Review</button>
          </div>
        )}

        {loading ? (
          <div className="text-center text-[#86868b] py-20 font-semibold">Loading your history...</div>
        ) : !sessionUser ? (
          <div className="apple-card p-12 text-center flex flex-col items-center max-w-2xl mx-auto mt-10">
            <div className="w-16 h-16 bg-[#e5e5ea] rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[#1d1d1f] text-3xl">lock</span>
            </div>
            <h3 className="font-bold text-xl mb-2">Login to save your evaluation history</h3>
            <p className="text-[#86868b] mb-6">Create an account or login to keep track of all your past evaluation results securely.</p>
            <a href="/login" className="primary-gradient px-6 py-3 rounded-full font-semibold">Sign In</a>
          </div>
        ) : history.length === 0 ? (
          <div className="apple-card p-12 text-center text-[#86868b]">
            <span className="material-symbols-outlined text-5xl mb-4 text-[#d2d2d7]">history_toggle_off</span>
            <p className="font-semibold text-lg text-[#1d1d1f]">No evaluation history found.</p>
            <p className="text-sm mt-1">Evaluations you submit will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
            {history.map((item, index) => {
              const date = new Date(item.created_at);
              const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const percentage = Math.round((item.score / item.max_score) * 100);

              // Use full width card for the latest history
              if (index === 0) {
                return (
                  <div key={item.id} className="lg:col-span-12 group">
                    <div className="apple-card p-8 hover:-translate-y-1 transition-transform cursor-pointer">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="px-2 py-0.5 rounded text-[#007aff] bg-[#007aff] bg-opacity-10 text-xs font-bold uppercase tracking-wider">Latest</span>
                            <span className="text-[#86868b] text-xs font-semibold">{dateStr}</span>
                          </div>
                          <h3 className="font-headline text-xl font-bold text-[#1d1d1f] mb-2 leading-tight">{item.question}</h3>
                          <p className="text-[#86868b] text-sm line-clamp-2 pr-4">{item.answer}</p>
                        </div>
                        <div className="flex items-center gap-6 md:pl-6 md:border-l border-[#e5e5ea]">
                          <div className="text-center">
                            <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${percentage >= 80 ? 'bg-[#34c759] text-white' : percentage >= 50 ? 'bg-[#ff9500] text-white' : 'bg-[#ff3b30] text-white'}`}>
                              {item.score}/{item.max_score} Score
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // Normal cards
              return (
                <div key={item.id} className="lg:col-span-6">
                  <div className="apple-card p-6 hover:-translate-y-1 transition-transform cursor-pointer h-full flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[#86868b] text-xs font-semibold">{dateStr}</span>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${percentage >= 80 ? 'bg-[#34c759] text-white' : percentage >= 50 ? 'bg-[#ff9500] text-white' : 'bg-[#ff3b30] text-white'}`}>
                        {item.score}/{item.max_score}
                      </span>
                    </div>
                    <h4 className="font-headline font-bold text-base text-[#1d1d1f] mb-2 line-clamp-2">{item.question}</h4>
                    <p className="text-[#86868b] text-sm line-clamp-2 flex-grow">{item.answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
