'use client';

import NavBar from '@/app/components/NavBar';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Footer from '@/app/components/Footer';

export default function LandingPage() {
  const router = useRouter();

  const features = [
    {
      title: "Concept-based scoring",
      desc: "Breaks down complex rubrics into semantic nodes, rewarding true understanding.",
      icon: "analytics",
      color: "blue"
    },
    {
      title: "Detailed feedback",
      desc: "Granular analysis with specific, actionable suggestions for improvement.",
      icon: "forum",
      color: "green"
    },
    {
      title: "Knowledge Gaps",
      desc: "Automatically identifies missing core curriculum elements in responses.",
      icon: "search_check",
      color: "red"
    }
  ];

  const steps = [
    { id: 1, title: "Input Answer", desc: "Type manually or upload a PDF sheet." },
    { id: 2, title: "AI Analysis", desc: "Instant evaluation against core rubrics." },
    { id: 3, title: "Improvement", desc: "Get feedback and master the concept." }
  ];

  return (
    <div className="font-body text-gray-900 antialiased min-h-screen bg-white">
      <NavBar />
      
      {/* Hero Section */}
      <header className="pt-40 pb-20 px-6">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
          <div className="mb-6 flex flex-col items-center">
            <div className="p-4 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center">
              <div className="relative w-[clamp(100px,10vw,140px)] aspect-square">
                <Image 
                  src="/logo.jpeg" 
                  alt="EvalMind AI" 
                  fill
                  className="object-cover rounded-xl"
                  priority
                />
              </div>
            </div>
            <span className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mt-4 font-bold">EvalMind AI</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 leading-[1.1]">
            Engineering the Future of <br className="hidden md:block" />
            <span className="text-blue-600">Fair Evaluation</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-gray-500 max-w-2xl font-medium leading-relaxed">
            Improve your answers, not just your marks. <br className="hidden md:block" />
            Evaluate subjective answers instantly with AI-powered feedback and structured scoring.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => router.push('/evaluate')}
              className="bg-blue-600 text-white rounded-xl px-8 py-4 font-bold hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20"
            >
              Try Evaluation
            </button>
            <button 
              onClick={() => router.push('/login')}
              className="border border-gray-200 text-gray-700 rounded-xl px-8 py-4 font-bold hover:bg-gray-50 transition-all active:scale-[0.98]"
            >
              View Demo
            </button>
          </div>

          {/* Value Strip */}
          <div className="mt-16 pt-8 border-t border-gray-50 flex flex-wrap justify-center gap-x-12 gap-y-6">
            {['Instant Evaluation', 'Marks-aware Feedback', 'PDF Analysis', 'Learning Insights'].map((point, i) => (
              <div key={i} className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-wider">
                <span className="material-symbols-outlined text-blue-500 text-lg">check_circle</span>
                {point}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Product Preview */}
      <section className="py-20 px-6 bg-gray-50/50 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">Live Dashboard</span>
            <h2 className="mt-4 text-3xl font-bold text-gray-900">Professional Grade Interface</h2>
          </div>
          
          <div className="relative mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-200/50 overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-1000">
            {/* Mock Dashboard Header */}
            <div className="h-12 border-b border-gray-100 bg-gray-50/50 flex items-center px-6 gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="ml-4 h-6 w-64 bg-white border border-gray-100 rounded-md"></div>
            </div>
            {/* Mock Dashboard Content */}
            <div className="p-8 grid grid-cols-3 gap-8">
              <div className="col-span-2 space-y-6">
                <div className="h-48 bg-gray-50 rounded-xl border border-gray-100 p-6 flex flex-col justify-center gap-4">
                  <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-gray-100 rounded"></div>
                    <div className="h-3 w-full bg-gray-100 rounded"></div>
                    <div className="h-3 w-2/3 bg-gray-100 rounded"></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="h-32 bg-blue-50/30 rounded-xl border border-blue-100 p-6">
                    <div className="h-3 w-1/2 bg-blue-100 rounded mb-4"></div>
                    <div className="h-8 w-1/3 bg-blue-600/20 rounded"></div>
                  </div>
                  <div className="h-32 bg-green-50/30 rounded-xl border border-green-100 p-6">
                    <div className="h-3 w-1/2 bg-green-100 rounded mb-4"></div>
                    <div className="h-8 w-1/3 bg-green-600/20 rounded"></div>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="h-full bg-gray-50 rounded-xl border border-gray-100 p-6 flex flex-col gap-6">
                  <div className="h-4 w-full bg-gray-200 rounded"></div>
                  {[1,2,3,4].map(i => (
                    <div key={i} className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 shrink-0"></div>
                      <div className="space-y-1.5 flex-1 pt-1">
                        <div className="h-2 w-full bg-gray-100 rounded"></div>
                        <div className="h-2 w-2/3 bg-gray-100 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent pointer-events-none"></div>
          </div>
          <p className="mt-8 text-center text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-lg">verified</span>
            Real-time evaluation dashboard
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Everything you need to master answers</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Powerful tools designed for students who value precision and growth.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className="group bg-white border border-gray-100 shadow-sm rounded-2xl p-8 hover:shadow-xl hover:shadow-gray-200/50 hover:border-gray-200 hover:-translate-y-1 transition-all duration-300">
                <div className={`w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 mb-8`}>
                  <span className={`material-symbols-outlined text-2xl ${f.color === 'blue' ? 'text-blue-600' : f.color === 'green' ? 'text-green-600' : 'text-red-600'}`} style={{ fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-loose font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-6 bg-gray-50/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Three steps to perfection</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-12 left-24 right-24 h-px bg-gray-200 z-0"></div>
            
            {steps.map((s) => (
              <div key={s.id} className="relative z-10 flex flex-col items-center text-center space-y-4">
                <div className="w-24 h-24 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-xl font-black text-blue-600">
                  {s.id}
                </div>
                <h4 className="text-lg font-bold text-gray-900">{s.title}</h4>
                <p className="text-sm text-gray-500 font-medium px-4">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto bg-gray-900 rounded-[2.5rem] p-12 md:p-20 text-center space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-50%] left-[-20%] w-[100%] h-[100%] bg-blue-600 rounded-full blur-[120px]"></div>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight relative z-10">Start improving your <br /> answers today</h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto relative z-10">Join students using EvalMind to turn assessment into achievement.</p>
          
          <div className="pt-6 relative z-10">
            <button 
              onClick={() => router.push('/signup')}
              className="bg-blue-600 text-white rounded-xl px-12 py-4.5 font-bold hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-600/40"
            >
              Get Started for Free
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
