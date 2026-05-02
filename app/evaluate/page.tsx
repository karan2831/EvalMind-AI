'use client';

import NavBar from '@/app/components/NavBar';
import { supabase } from '@/lib/supabaseClient';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Footer from '@/app/components/Footer';
import { PageSkeleton } from '@/app/components/skeletons/PageSkeleton';
import { Upload, Lock } from "lucide-react";

const PREDEFINED_QUESTIONS = [
  "Explain the process of photosynthesis in plants.",
  "Explain the concept of inheritance in object-oriented programming.",
  "What are the differences between SQL and NoSQL databases?",
  "How does a neural network learn?"
];

const MARK_OPTIONS = [2, 5, 10];

const INPUT_MODES = [
  { id: 'manual', label: 'Manual Entry', icon: 'edit_note' },
  { id: 'pdf', label: 'PDF Upload', icon: 'description' }
];

export default function EvaluatePage() {
  const router = useRouter();
  const [inputMode, setInputMode] = useState('manual');
  const [selectedQuestion, setSelectedQuestion] = useState(PREDEFINED_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [marks, setMarks] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [prevScore, setPrevScore] = useState<number | null>(null);
  const [reevaluateMsg, setReevaluateMsg] = useState<string | null>(null);
  const [evaluations, setEvaluations] = useState<any[] | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState<string>("Processing...");
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // New states for decoupled AI
  const [isImproving, setIsImproving] = useState(false);
  const [hasImproved, setHasImproved] = useState(false);

  // Access Control States
  const [usageCount, setUsageCount] = useState(0);
  const [userPlan, setUserPlan] = useState<'free' | 'premium'>('free');
  const [pdfType, setPdfType] = useState<'answer_sheet' | 'combined'>('answer_sheet');
  const [language, setLanguage] = useState("en");

  // Auto-detect browser language
  useEffect(() => {
    const browserLang = navigator.language;
    if (browserLang.includes("hi")) setLanguage("hi");
    else if (browserLang.includes("bn")) setLanguage("bn");
    else setLanguage("en");
  }, []);

  const isLoggedIn = !!user;
  const isPremium = userPlan === 'premium';
  const isLimitReached = usageCount >= 20;

  const canUseAdvanced = isLoggedIn && (isPremium || !isLimitReached);

  useEffect(() => {
    const checkInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser) {
          // Fetch Profile for Plan
          const { data: profile } = await supabase
            .from('profiles')
            .select('plan')
            .eq('id', currentUser.id)
            .single();
          
          if (profile) {
            setUserPlan(profile.plan || 'free');
            console.log("USER PLAN:", profile.plan || 'free');
          }
        }
      } catch (err: any) {
        console.error("Initial session check failed:", err);
        if (err.message?.includes("Refresh Token") || err.status === 400) {
          await supabase.auth.signOut();
          window.location.href = "/login";
        }
      }
    };
    checkInitialSession();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError("Only PDF files are allowed.");
      setSelectedFile(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File is too large. Max 10MB allowed.");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setError(null);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleEvaluate = async (isReevaluate = false) => {
    try {
      setError(null);
      setLoadingMsg("Processing...");
      const finalQuestion = isCustom ? customQuestion : selectedQuestion;

      if (inputMode === 'manual') {
        if (!finalQuestion || finalQuestion.trim().length < 5) throw new Error("Question must be at least 5 characters.");
        if (!userAnswer || userAnswer.trim().length < 5) throw new Error("Answer must be at least 5 characters.");
      } else if (!selectedFile) {
        throw new Error("Please upload a PDF file.");
      }

      setLoading(true);
      if (!isReevaluate) {
        setResult(null);
        setEvaluations(null);
        setSummary(null);
        setHasImproved(false);
      } else {
        setPrevScore(result?.score);
      }

      if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
        throw new Error("Backend URL not configured");
      }
      const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

      // Check session for advanced features or token passing
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const userId = session?.user?.id;

      // GUARD: Only manual mode is public
      if (inputMode !== 'manual' && !session) {
        alert("Please login to use Answer Sheet or Combined PDF evaluation.");
        return;
      }
      
      if (inputMode === 'manual') {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${apiUrl}/evaluate`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            "Authorization": `Bearer ${session?.access_token}` 
          },
          body: JSON.stringify({ 
            question: finalQuestion.trim(), 
            answer: userAnswer.trim(), 
            marks, 
            language,
            eval_type: "manual"
          })
        });
        await processResponse(res, isReevaluate, finalQuestion.trim(), userAnswer.trim());
      } else {
        // PDF mode requires session (guarded above)
        const formData = new FormData();
        formData.append('file', selectedFile!);
        formData.append('marks', marks.toString());
        formData.append('mode', pdfType);
        formData.append('language', language);
        if (pdfType === 'answer_sheet') {
          formData.append('question', finalQuestion.trim());
        }

        const res = await fetch(`${apiUrl}/evaluate-pdf`, { 
          method: "POST", 
          body: formData,
          headers: { ...(token && { "Authorization": `Bearer ${token}` }) }
        });
        await processResponse(res, isReevaluate);
      }
      setActiveTab('overview');
    } catch (err: any) {
      setError(err.message || "Evaluation failed.");
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  };

  const processResponse = async (res: Response, isReevaluate: boolean, q?: string, a?: string) => {
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || "Server error");
    }
    const data = await res.json();
    if (data.evaluations) {
      setEvaluations(data.evaluations);
      setSummary({ total_score: data.total_score, total_max_score: data.total_max_score, count: data.count, preview: data.extracted_text_preview });
      setResult(data.evaluations[0].result);
    } else {
      setResult(data);
      setSummary({ preview: data.extracted_text_preview });
    }
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 5000);
  };

  const fetchImprovement = async () => {
    if (!result || hasImproved || isImproving) return;
    setIsImproving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
        throw new Error("Backend URL not configured");
      }
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/ai`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` })
        },
        body: JSON.stringify({
          question: isCustom ? customQuestion : selectedQuestion,
          answer: userAnswer || result.extracted_text_preview || "",
          mode: "improve",
          language: language
        }),
      });
      const data = await response.json();
      setResult((prev: any) => ({ ...prev, improved_answer: data.improved_answer }));
      setHasImproved(true);
    } catch (error) {
      console.error("Improvement fetch failed:", error);
    } finally {
      setIsImproving(false);
    }
  };

  return (
    <div className="font-body text-[#1d1d1f] antialiased min-h-screen">
      <NavBar />
      <main className="max-w-4xl mx-auto px-6 pt-32 pb-24 space-y-12 z-10 relative">
        <section className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-4xl font-semibold tracking-tight text-gray-900">Evaluation Dashboard</h1>
            {isPremium && (
              <span className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md shadow-yellow-400/40 animate-pulse shadow-[0_0_12px_rgba(250,204,21,0.6)]">
                Premium
              </span>
            )}
            {!isPremium && isLoggedIn && (
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-gray-200">
                Free
              </span>
            )}
          </div>
          <p className="text-gray-500 font-medium">Precision-engineered academic assessment engine</p>
          
          {/* Language Selector */}
          <div className="flex justify-center mt-4">
            <div className="relative inline-block">
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer shadow-sm appearance-none pr-8"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="bn">Bengali</option>
              </select>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">▼</span>
            </div>
          </div>
        </section>

        <div className="flex justify-center">
          <div className="bg-gray-100 p-1.5 rounded-2xl flex gap-1.5 border border-gray-200 shadow-sm overflow-x-auto scrollbar-hide">
            {INPUT_MODES.map((mode) => {
              const isRestricted = mode.id !== 'manual';
              const isDisabled = isRestricted && !canUseAdvanced;
              
              return (
                <button 
                  key={mode.id} 
                  onClick={() => {
                    if (isRestricted) {
                      if (!isLoggedIn) {
                        alert("Please login to use this feature");
                        return;
                      }
                      if (!isPremium && isLimitReached) {
                        alert("Monthly limit reached. Upgrade to Premium");
                        return;
                      }
                    }
                    setInputMode(mode.id);
                  }} 
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap relative ${
                    inputMode === mode.id 
                      ? 'bg-white text-blue-600 shadow-md ring-1 ring-black/5' 
                      : isDisabled 
                        ? 'text-gray-400 cursor-not-allowed opacity-80' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {mode.icon}
                  </span>
                  {mode.label}
                  
                  {isRestricted && (
                    <div className="flex flex-col items-start ml-2 min-w-[40px]">
                      {/* TEXT */}
                      {!isLoggedIn ? (
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Login</span>
                      ) : isPremium ? (
                        null
                      ) : (
                        <span className="text-[10px] text-gray-500 font-bold tabular-nums">
                          {usageCount}/20
                        </span>
                      )}

                      {/* MICRO BAR */}
                      {isLoggedIn && !isPremium && (
                        <div className="w-10 h-[2px] bg-gray-200 rounded-full mt-0.5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${isLimitReached ? 'bg-red-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min((usageCount / 20) * 100, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <section className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 space-y-8">
          <div className="space-y-6">
            {(inputMode === 'manual' || (inputMode === 'pdf' && pdfType === 'answer_sheet')) && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Question</label>
                {isCustom ? (
                  <input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" value={customQuestion} onChange={(e) => setCustomQuestion(e.target.value)} placeholder="Enter custom question..." />
                ) : (
                  <div className="relative">
                    <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm appearance-none pr-10 bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" value={selectedQuestion} onChange={(e) => setSelectedQuestion(e.target.value)}>
                      {PREDEFINED_QUESTIONS.map((q, i) => <option key={i} value={q}>{q}</option>)}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">▼</span>
                  </div>
                )}
                <button onClick={() => setIsCustom(!isCustom)} className="text-[10px] font-bold text-blue-600 uppercase tracking-tight hover:text-blue-700 transition-colors">
                  {isCustom ? "Select Predefined" : "Enter questions manually"}
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              {inputMode === 'pdf' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    PDF Type
                  </label>
                  <div className="relative">
                    <select
                      value={pdfType}
                      onChange={(e) => setPdfType(e.target.value as 'answer_sheet' | 'combined')}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm appearance-none pr-10 bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                    >
                      <option value="answer_sheet">Answer Sheet Only</option>
                      <option value="combined">Combined PDF</option>
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">▼</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Marks</label>
                <div className="relative">
                  <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm appearance-none pr-10 bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" value={marks} onChange={(e) => setMarks(Number(e.target.value))}>
                    {MARK_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} Marks</option>)}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">▼</span>
                </div>
              </div>
            </div>

            {inputMode === 'pdf' && (
              <p className="text-xs text-gray-400 font-medium italic -mt-4">
                {pdfType === 'answer_sheet'
                  ? "Upload answer sheet and provide question manually"
                  : "Upload question + answer combined PDF"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Answer</label>
            {inputMode === 'manual' ? (
              <textarea className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm h-40 resize-none" value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="Write your answer here..." />
            ) : (
              <label 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300'}`}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className={`p-3 rounded-full mb-3 ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-400 shadow-sm'}`}>
                    <Upload className="w-8 h-8" />
                  </div>
                  <p className="mb-2 text-sm text-gray-700 font-semibold">
                    {selectedFile ? "File Selected" : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-xs text-gray-500 font-medium">
                    {selectedFile ? selectedFile.name : "High quality PDF (MAX. 10MB)"}
                  </p>
                </div>
                <input 
                  type="file" 
                  accept="application/pdf" 
                  className="hidden" 
                  onChange={handleFileChange} 
                />
              </label>
            )}
          </div>

          <div className="flex justify-end">
            <button onClick={() => handleEvaluate()} disabled={loading} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Analyzing..." : "Evaluate Now"}
            </button>
          </div>
        </section>

        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>}

        {loading && (
          <div className="transition-opacity duration-300 opacity-100">
            <PageSkeleton type="evaluate" />
          </div>
        )}

        {result && !loading && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center shadow-lg">
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Final Score</span>
                <div className="flex items-baseline gap-1 text-5xl font-black text-blue-600">
                  {result.score} <span className="text-xl text-gray-300">/ {result.max_score || marks}</span>
                </div>
                <span className="text-sm font-bold uppercase text-gray-500 tracking-widest">{result.result_label}</span>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-md">
              <div className="flex bg-gray-50 border-b border-gray-100">
                {['overview', 'personalized fix', 'missing'].map((tab) => (
                  <button 
                    key={tab} 
                    onClick={() => { setActiveTab(tab); if (tab === 'personalized fix') fetchImprovement(); }} 
                    className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest ${activeTab === tab ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="p-10">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <p className="text-lg font-medium text-gray-800 leading-relaxed italic">"{result.summary}"</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{result.feedback_simple || result.feedback}</p>
                  </div>
                )}
                {activeTab === 'personalized fix' && (
                  <div className="space-y-6">
                    <h5 className="text-sm font-bold text-gray-900 uppercase">Your Personalized Fix</h5>
                    {isImproving ? (
                      <div className="p-8 flex flex-col items-center gap-4 text-orange-600">
                        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs font-bold animate-pulse">Refining your answer...</p>
                      </div>
                    ) : (
                      <div className="p-8 bg-orange-50/20 rounded-xl text-base text-gray-700 leading-loose border border-orange-100 whitespace-pre-wrap">
                        {result.improved_answer || "No refinement generated yet."}
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'missing' && (
                  <div className="space-y-6">
                    <h5 className="text-sm font-bold text-gray-900 uppercase">Critical Gaps</h5>
                    <div className="grid gap-4">
                      {result.missing_points?.map((m: string, i: number) => (
                        <div key={i} className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-semibold border border-red-100 flex items-center gap-3">
                          <span className="material-symbols-outlined text-red-400">error</span> {m}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
