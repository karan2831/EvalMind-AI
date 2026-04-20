'use client';

import NavBar from '@/app/components/NavBar';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="font-body text-[#1d1d1f] antialiased overflow-x-hidden min-h-screen">
      <NavBar />
      
      <main className="pt-32 pb-24 px-6 max-w-5xl mx-auto z-10 relative">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center space-y-8 py-16 md:py-24">
          <div className="space-y-6 flex flex-col items-center">
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-xl border border-[#e5e5ea] animate-fade-in">
              <Image 
                src="/logo.jpeg" 
                alt="EvalMind AI Official Logo" 
                fill
                className="object-cover"
              />
            </div>
            <h1 className="font-headline text-5xl md:text-7xl font-bold tracking-tight text-[#1d1d1f] max-w-4xl">
              EvalMind AI
            </h1>
            <h2 className="font-headline text-2xl md:text-3xl font-medium text-[#86868b] max-w-2xl mx-auto">
              Engineered for Fair Evaluation
            </h2>
          </div>
          <p className="text-lg md:text-xl text-[#1d1d1f] font-normal max-w-2xl leading-relaxed">
            Evaluate subjective answers with structured, examiner-level scoring. Our proprietary AI understands context beyond keywords to deliver academic precision.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-6">
            <button 
              onClick={() => router.push('/evaluate')}
              className="primary-gradient px-8 py-3.5 rounded-full text-lg font-semibold flex items-center gap-2"
            >
              Try Demo Instantly
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
            <button 
              onClick={() => router.push('/login')}
              className="bg-[#e5e5ea] text-[#1d1d1f] px-8 py-3.5 rounded-full text-lg font-semibold hover:bg-[#d1d1d6] transition-colors"
            >
              Login to Save History
            </button>
          </div>
        </section>

        {/* Feature Cards Section */}
        <section className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="apple-card p-10 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-500">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
                </div>
                <h3 className="font-headline text-xl font-bold text-[#1d1d1f]">Concept-based scoring</h3>
                <p className="text-[#86868b] text-base leading-relaxed">
                  Breaks down complex rubrics into semantic nodes, ensuring that true understanding is rewarded.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="apple-card p-10 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-500">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>feedback</span>
                </div>
                <h3 className="font-headline text-xl font-bold text-[#1d1d1f]">Detailed feedback</h3>
                <p className="text-[#86868b] text-base leading-relaxed">
                  Granular analysis of student performance with specific, actionable improvement suggestions.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="apple-card p-10 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-500">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>search_check</span>
                </div>
                <h3 className="font-headline text-xl font-bold text-[#1d1d1f]">Missing concepts detection</h3>
                <p className="text-[#86868b] text-base leading-relaxed">
                  Automatically identifies which core curriculum elements were omitted in the response.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
