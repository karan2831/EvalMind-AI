'use client';

import NavBar from '@/app/components/NavBar';
import { supabase } from '@/lib/supabaseClient';
import { useState, useEffect } from 'react';
import Footer from '@/app/components/Footer';

const PREDEFINED_QUESTIONS = [
  "Explain the process of photosynthesis in plants.",
  "Explain the concept of inheritance in object-oriented programming.",
  "What are the differences between SQL and NoSQL databases?",
  "How does a neural network learn?"
];

const MARK_OPTIONS = [2, 5, 10];

const INPUT_MODES = [
  { id: 'manual', label: 'Manual Entry', icon: 'edit_note' },
  { id: 'answer_sheet', label: 'Answer Sheet', icon: 'description' },
  { id: 'combined', label: 'Combined PDF', icon: 'file_copy' }
];

export default function EvaluatePage() {
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
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

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (inputMode === 'manual') {
        const res = await fetch(`${apiUrl}/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token && { "Authorization": `Bearer ${token}` }) },
          body: JSON.stringify({ question: finalQuestion.trim(), answer: userAnswer.trim(), marks })
        });
        await processResponse(res, isReevaluate, finalQuestion.trim(), userAnswer.trim());
      } else {
        const formData = new FormData();
        formData.append('file', selectedFile!);
        formData.append('marks', marks.toString());
        formData.append('mode', inputMode);
        if (inputMode === 'answer_sheet') formData.append('question', finalQuestion.trim());

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
      setLoading(false);
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: isCustom ? customQuestion : selectedQuestion,
          answer: userAnswer || result.extracted_text_preview || "",
          mode: "improve"
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
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900">Evaluation Dashboard</h1>
          <p className="text-gray-500 font-medium">Precision-engineered academic assessment engine</p>
        </section>

        <div className="flex justify-center">
          <div className="bg-gray-100 p-1 rounded-2xl flex gap-1 border border-gray-200 shadow-sm">
            {INPUT_MODES.map((mode) => (
              <button 
                key={mode.id} 
                onClick={() => setInputMode(mode.id)} 
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${inputMode === mode.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <section className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-3 space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Question</label>
              {isCustom ? (
                <input type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" value={customQuestion} onChange={(e) => setCustomQuestion(e.target.value)} placeholder="Enter custom question..." />
              ) : (
                <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" value={selectedQuestion} onChange={(e) => setSelectedQuestion(e.target.value)}>
                  {PREDEFINED_QUESTIONS.map((q, i) => <option key={i} value={q}>{q}</option>)}
                </select>
              )}
              <button onClick={() => setIsCustom(!isCustom)} className="text-[10px] font-bold text-blue-600 uppercase">Toggle Custom</button>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Marks</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" value={marks} onChange={(e) => setMarks(Number(e.target.value))}>
                {MARK_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} Marks</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Answer</label>
            {inputMode === 'manual' ? (
              <textarea className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm h-40 resize-none" value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="Write your answer here..." />
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center bg-gray-50">
                <input type="file" accept=".pdf" onChange={handleFileChange} className="mb-2" />
                <p className="text-xs text-gray-500">{selectedFile ? selectedFile.name : "Select a PDF file"}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button onClick={() => handleEvaluate()} disabled={loading} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Analyzing..." : "Evaluate Now"}
            </button>
          </div>
        </section>

        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>}

        {result && (
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
                {['overview', 'personalized fix', 'model answer', 'missing'].map((tab) => (
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
                {activeTab === 'model answer' && (
                  <div className="space-y-6">
                    <h5 className="text-sm font-bold text-gray-900 uppercase">Ideal Reference Answer</h5>
                    <div className="p-8 bg-blue-50/20 rounded-xl text-base text-gray-700 leading-loose border border-blue-100 whitespace-pre-wrap">
                      {result.ideal_answer || result.model_answer}
                    </div>
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
