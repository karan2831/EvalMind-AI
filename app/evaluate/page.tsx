'use client';

import NavBar from '@/app/components/NavBar';
import { supabase } from '@/lib/supabaseClient';
import { useState, useEffect } from 'react';

const PREDEFINED_QUESTIONS = [
  "Explain the process of photosynthesis in plants.",
  "Explain the concept of inheritance in object-oriented programming.",
  "What are the differences between SQL and NoSQL databases?",
  "How does a neural network learn?"
];

const MARK_OPTIONS = [2, 5, 10];

const INPUT_MODES = [
  { id: 'manual', label: 'Manual Entry', icon: 'edit_note' },
  { id: 'answer_sheet', label: 'Upload Answer Sheet', icon: 'description' },
  { id: 'combined', label: 'Upload Combined PDF', icon: 'file_copy' }
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
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Security: Frontend File Validation
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

  const handleEvaluate = async (isReevaluate = false) => {
    try {
      setError(null);
      
      const finalQuestion = isCustom ? customQuestion : selectedQuestion;

      // Security: Frontend Validation
      if (inputMode === 'manual') {
        if (!finalQuestion || finalQuestion.trim().length < 5) throw new Error("Question must be at least 5 characters.");
        if (!userAnswer || userAnswer.trim().length < 5) throw new Error("Answer must be at least 5 characters.");
      } else {
        if (!selectedFile) throw new Error("Please upload a PDF file.");
      }

      setLoading(true);
      if (!isReevaluate) {
        setResult(null);
        setEvaluations(null);
        setSummary(null);
        setPrevScore(null);
        setReevaluateMsg(null);
      } else {
        setPrevScore(result.score);
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error("API configuration missing.");

      if (inputMode === 'manual') {
        const res = await fetch(`${apiUrl}/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: finalQuestion.trim(), answer: userAnswer.trim(), marks })
        });
        await processResponse(res, isReevaluate, finalQuestion.trim(), userAnswer.trim());
      } else {
        const formData = new FormData();
        formData.append('file', selectedFile!);
        formData.append('marks', marks.toString());
        formData.append('mode', inputMode);
        if (inputMode === 'answer_sheet') formData.append('question', finalQuestion.trim());

        const res = await fetch(`${apiUrl}/evaluate-pdf`, { method: "POST", body: formData });
        await processResponse(res, isReevaluate);
      }
      
      setActiveTab('overview');
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const processResponse = async (res: Response, isReevaluate: boolean, q?: string, a?: string) => {
    const text = await res.text();
    if (!res.ok) {
      let msg = "An error occurred.";
      try { msg = JSON.parse(text).detail; } catch(e) {}
      throw new Error(msg);
    }

    const data = JSON.parse(text);
    if (data.evaluations) {
      setEvaluations(data.evaluations);
      setSummary({ total_score: data.total_score, total_max_score: data.total_max_score, count: data.count, preview: data.extracted_text_preview });
      setResult(data.evaluations[0].result);
    } else {
      setResult(data);
      setSummary({ preview: data.extracted_text_preview });
      if (isReevaluate) {
        setReevaluateMsg(data.score === prevScore ? "Result is consistent" : "Update detected");
      }
      if (q && a) saveHistory(q, a, data);
    }
  };

  const saveHistory = async (q: string, a: string, data: any) => {
    if (user) {
      await supabase.from('evaluation_history').insert({
        user_id: user.id, question: q, answer: a,
        score: data.score, max_score: data.max_score, feedback: data.feedback
      });
    }
  };

  const getConfidenceLevel = (score: number) => {
    if (score < 0.5) return "Low";
    if (score < 0.75) return "Medium";
    return "High";
  };

  return (
    <div className="font-body text-[#1d1d1f] antialiased min-h-screen">
      <NavBar />
      <main className="max-w-4xl mx-auto px-6 pt-32 pb-24 space-y-10 z-10 relative">
        <section className="text-center space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">EvalMind Assessment</h2>
          <p className="text-[#86868b] font-medium text-sm">Engineered for Fair Evaluation</p>
        </section>

        <div className="flex justify-center">
          <div className="bg-[#f5f5f7] p-1 rounded-2xl flex gap-1 border border-[#e5e5ea]">
            {INPUT_MODES.map((mode) => (
              <button key={mode.id} disabled={loading} onClick={() => { setInputMode(mode.id); setResult(null); setEvaluations(null); setError(null); setSummary(null); }} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${inputMode === mode.id ? 'bg-white text-[#007aff] shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}>
                <span className="material-symbols-outlined text-[18px]">{mode.icon}</span>{mode.label}
              </button>
            ))}
          </div>
        </div>

        <section className="apple-card p-8 md:p-10 space-y-8">
          {inputMode !== 'combined' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3"><span className="text-xs font-bold uppercase tracking-wider text-[#007aff]">Question Prompt</span><button disabled={loading} onClick={() => setIsCustom(!isCustom)} className={`text-[10px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded-full border ${isCustom ? 'bg-[#007aff] text-white' : 'bg-white text-[#86868b]'}`}>{isCustom ? "✓ Custom" : "+ Custom"}</button></div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#86868b] md:mr-32">Marks</span>
              </div>
              <div className="flex flex-col md:flex-row items-start gap-4">
                <div className="flex-1 w-full">{isCustom ? <input disabled={loading} type="text" className="apple-input w-full font-bold" placeholder="Enter question..." value={customQuestion} onChange={(e) => setCustomQuestion(e.target.value)} /> : <select disabled={loading} className="apple-input w-full font-bold cursor-pointer" value={selectedQuestion} onChange={(e) => setSelectedQuestion(e.target.value)}>{PREDEFINED_QUESTIONS.map((q, i) => <option key={i} value={q}>{q}</option>)}</select>}</div>
                <div className="w-full md:w-40"><select disabled={loading} className="apple-input w-full font-bold bg-[#f5f5f7]" value={marks} onChange={(e) => setMarks(Number(e.target.value))}>{MARK_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} Marks</option>)}</select></div>
              </div>
            </div>
          )}
          <div className="space-y-4">
            {inputMode === 'manual' ? <textarea disabled={loading} className="apple-input w-full h-44 resize-none" placeholder={`Write your response for ${marks} marks...`} value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} /> : <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-[#d2d2d7] rounded-3xl bg-[#fbfbfd] relative cursor-pointer group"><input disabled={loading} type="file" accept=".pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} /><div className="flex flex-col items-center gap-4 text-center"><div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${selectedFile ? 'bg-[#34c759] text-white' : 'bg-[#007aff] bg-opacity-5 text-[#007aff]'}`}><span className="material-symbols-outlined text-4xl">{selectedFile ? 'task' : 'picture_as_pdf'}</span></div><div><p className="font-bold">{selectedFile ? selectedFile.name : 'Upload PDF'}</p><p className="text-[10px] text-[#86868b] mt-1">Max 10MB • PDF Only</p></div></div></div>}
          </div>
          {error && <div className="text-sm text-[#ff3b30] font-bold text-center px-4 py-2 bg-[#ff3b30] bg-opacity-5 rounded-xl border border-[#ff3b30] border-opacity-10">{error}</div>}
          <div className="flex justify-end">
            <button onClick={() => handleEvaluate(false)} disabled={loading} className="primary-gradient px-12 py-4 rounded-full font-bold flex items-center gap-3 disabled:opacity-50 active:scale-95 transition-all shadow-lg">
              {loading ? <><span className="material-symbols-outlined animate-spin">sync</span>Processing...</> : <><span className="text-sm">Evaluate</span><span className="material-symbols-outlined text-xl">auto_awesome</span></>}
            </button>
          </div>
        </section>

        {result && !loading && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="apple-card p-8 text-center space-y-4 relative border-2 border-[#f5f5f7]">
              {reevaluateMsg && <div className="absolute top-4 right-4 text-[10px] font-bold text-[#007aff] bg-[#007aff] bg-opacity-5 px-3 py-1 rounded-full">{reevaluateMsg}</div>}
              <div className="flex flex-col items-center gap-1">
                <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${result.score / result.max_score >= 0.85 ? 'text-[#34c759]' : result.score / result.max_score >= 0.5 ? 'text-[#ffcc00]' : 'text-[#ff3b30]'}`}>{result.result_label}</span>
                <p className="text-2xl font-bold text-[#1d1d1f]">"{result.summary}"</p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <p className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Evaluated instantly via secure AI engine</p>
                <button onClick={() => handleEvaluate(true)} className="text-[10px] font-bold text-[#007aff] hover:underline flex items-center gap-1"><span className="material-symbols-outlined text-sm">refresh</span> Re-evaluate</button>
              </div>
            </div>

            {(summary?.preview || result?.extracted_text_preview) && (
              <div className="apple-card overflow-hidden">
                <button onClick={() => setShowPreview(!showPreview)} className="w-full flex items-center justify-between p-4 bg-[#fbfbfd] border-b border-[#e5e5ea] text-[10px] font-bold uppercase tracking-widest text-[#86868b] hover:text-[#1d1d1f] transition-all"><span className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">visibility</span>Extraction Preview</span><span className="material-symbols-outlined transition-transform duration-300" style={{ transform: showPreview ? 'rotate(180deg)' : 'none' }}>expand_more</span></button>
                {showPreview && <div className="space-y-4"><div className="p-6 bg-white text-xs text-[#1d1d1f] font-mono leading-relaxed">{summary?.preview || result?.extracted_text_preview}</div><div className="px-6 pb-4 flex items-center gap-2 text-[10px] font-bold text-[#ff9500] uppercase tracking-wider"><span className="material-symbols-outlined text-sm">security</span>Security Note: Content processed in a sandboxed environment.</div></div>}
              </div>
            )}

            <div className="apple-card overflow-hidden">
              <div className="flex border-b border-[#e5e5ea] bg-[#fbfbfd]">{['overview', 'improve', 'missing', 'model answer', 'feedback'].map((tab) => (<button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === tab ? 'text-[#007aff] border-[#007aff] bg-white' : 'text-[#86868b] border-transparent hover:text-[#1d1d1f]'}`}>{tab === 'improve' ? 'Learning Plan' : tab}</button>))}</div>
              <div className="p-8 md:p-12">
                {activeTab === 'overview' && (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="relative flex items-center justify-center w-40 h-40">
                      <svg className="w-full h-full transform -rotate-90"><circle className="text-[#f5f5f7]" cx="80" cy="80" fill="transparent" r="74" stroke="currentColor" strokeWidth="12" /><circle className="text-[#007aff] transition-all duration-1000" cx="80" cy="80" fill="transparent" r="74" stroke="currentColor" strokeDasharray="464.9" strokeDashoffset={464.9 - (464.9 * (result.score / result.max_score))} strokeLinecap="round" strokeWidth="12" /></svg>
                      <div className="absolute flex flex-col items-center"><span className="text-5xl font-black">{result.score}</span><span className="text-[10px] font-bold text-[#86868b] uppercase tracking-widest">/ {result.max_score}</span></div>
                    </div>
                    <div className="flex-1 space-y-4 text-center md:text-left">
                      <div className="flex flex-wrap justify-center md:justify-start gap-2"><span className="px-3 py-1 bg-[#007aff] bg-opacity-5 text-[#007aff] rounded-full text-[10px] font-bold uppercase tracking-wider">{result.detected_level}</span><span className="px-3 py-1 bg-[#34c759] bg-opacity-5 text-[#34c759] rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">verified</span>Confidence: {getConfidenceLevel(result.confidence)} ({Math.round(result.confidence * 100)}%)</span></div>
                      <h4 className="text-xl font-bold text-[#1d1d1f] line-clamp-2">{result.question}</h4>
                    </div>
                  </div>
                )}
                {/* ... other tabs remain same ... */}
                {activeTab === 'improve' && <div className="space-y-4"><h5 className="text-[10px] font-bold text-[#1d1d1f] uppercase tracking-widest">Your Learning Plan</h5><p className="text-sm font-medium leading-relaxed p-6 bg-[#f5f5f7] rounded-2xl border border-[#e5e5ea]">{result.improvement_plan}</p></div>}
                {activeTab === 'missing' && <div className="space-y-4"><h5 className="text-[10px] font-bold text-[#1d1d1f] uppercase tracking-widest">Key Gaps</h5>{result.missing_points.map((m: string, i: number) => (<div key={i} className="p-4 bg-[#ff3b30] bg-opacity-5 text-[#ff3b30] rounded-xl text-sm font-bold border border-[#ff3b30] border-opacity-10">{m}</div>))}</div>}
                {activeTab === 'model answer' && <div className="space-y-4"><h5 className="text-[10px] font-bold text-[#1d1d1f] uppercase tracking-widest">Model Reference</h5><p className="p-6 bg-[#f5f5f7] rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-wrap">{result.ideal_answer}</p></div>}
                {activeTab === 'feedback' && <div className="space-y-4"><h5 className="text-[10px] font-bold text-[#1d1d1f] uppercase tracking-widest">Detailed Insights</h5><p className="p-6 bg-[#f5f5f7] rounded-2xl text-lg font-bold leading-relaxed italic">"{result.feedback_simple}"</p></div>}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
