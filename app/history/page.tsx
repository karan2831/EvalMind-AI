'use client';

import NavBar from '@/app/components/NavBar';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Footer from '@/app/components/Footer';

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchHistory() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLoading(false);
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
  }, [router]);

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
          <div className="bg-white border border-gray-100 rounded-[2rem] p-16 text-center shadow-sm animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 mx-auto text-gray-300">
              <span className="material-symbols-outlined text-4xl">history_toggle_off</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Your history is waiting</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-8 font-medium">Complete your first evaluation to start tracking your academic progress and growth insights.</p>
            <Link href="/evaluate" className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20 inline-block">
              Start Evaluation
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
            {history.map((item, index) => {
              const date = new Date(item.created_at);
              const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const percentage = Math.round((item.score / item.max_score) * 100);

              // Use full width card for the latest history
              if (index === 0) {
                return (
                  <div key={item.id} className="lg:col-span-12 group animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white border border-gray-100 p-10 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-gray-200/40 hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 rounded-full text-blue-600 bg-blue-50 text-[10px] font-bold uppercase tracking-widest border border-blue-100">Latest Achievement</span>
                            <span className="text-gray-400 text-xs font-bold uppercase tracking-wide">{dateStr}</span>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-2 leading-tight tracking-tight">{item.question}</h3>
                          <p className="text-gray-500 text-base line-clamp-2 leading-relaxed font-medium">{item.answer}</p>
                        </div>
                        <div className="flex items-center gap-10 md:pl-10 md:border-l border-gray-100 shrink-0">
                          <div className="text-center space-y-1">
                            <div className="flex items-baseline gap-1">
                              <span className={`text-5xl font-black tracking-tighter ${percentage >= 80 ? 'text-green-600' : percentage >= 50 ? 'text-blue-600' : 'text-red-600'}`}>
                                {item.score}
                              </span>
                              <span className="text-xl font-bold text-gray-300">/ {item.max_score}</span>
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${percentage >= 80 ? 'text-green-600' : percentage >= 50 ? 'text-blue-600' : 'text-red-600'}`}>
                              {percentage >= 80 ? 'Excellent' : percentage >= 50 ? 'Proficient' : 'Improving'}
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
                <div key={item.id} className="lg:col-span-6 animate-in slide-in-from-bottom-4 duration-500 delay-100">
                  <div className="bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm hover:shadow-lg hover:shadow-gray-200/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{dateStr}</span>
                        <div className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm ${percentage >= 80 ? 'bg-green-500 text-white' : percentage >= 50 ? 'bg-blue-600 text-white' : 'bg-red-500 text-white'}`}>
                          {item.score}/{item.max_score}
                        </div>
                      </div>
                      <h4 className="font-bold text-lg text-gray-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">{item.question}</h4>
                      <p className="text-gray-500 text-sm line-clamp-2 font-medium leading-relaxed">{item.answer}</p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center">
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">History Item #{history.length - index}</span>
                       <span className="material-symbols-outlined text-gray-300 text-xl group-hover:text-blue-500 group-hover:translate-x-1 transition-all">arrow_forward</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
