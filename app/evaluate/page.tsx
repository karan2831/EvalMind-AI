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
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError("Only PDF files are allowed.");
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleEvaluate = async (isReevaluate = false) => {
    try {
      setError(null);
      setLoadingMsg("Processing...");
      
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

      const fetchWithRetry = async (url: string, options: RequestInit, retries = 2): Promise<Response> => {
        try {
          const res = await fetch(url, options);
          if (!res.ok && res.status === 503 && retries > 0) {
            setLoadingMsg("Server waking up (first request may take 15–30 seconds)");
            await new Promise(resolve => setTimeout(resolve, 2000));
            return fetchWithRetry(url, options, retries - 1);
          }
          return res;
        } catch (err: any) {
          if (retries > 0) {
            setLoadingMsg("Server waking up (first request may take 15–30 seconds)");
            await new Promise(resolve => setTimeout(resolve, 2000));
            return fetchWithRetry(url, options, retries - 1);
          }
          throw new Error("Unable to connect to server. Please try again.");
        }
      };

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (inputMode === 'manual') {
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        console.log("API URL:", `${apiUrl}/evaluate`);
        const res = await fetchWithRetry(`${apiUrl}/evaluate`, {
          method: "POST",
          headers,
          body: JSON.stringify({ question: finalQuestion.trim(), answer: userAnswer.trim(), marks })
        });
        await processResponse(res, isReevaluate, finalQuestion.trim(), userAnswer.trim());
      } else {
        const headers: HeadersInit = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        console.log("API URL:", `${apiUrl}/evaluate-pdf`);
        const formData = new FormData();
        formData.append('file', selectedFile!);
        formData.append('marks', marks.toString());
        formData.append('mode', inputMode);
        if (inputMode === 'answer_sheet') formData.append('question', finalQuestion.trim());

        const res = await fetchWithRetry(`${apiUrl}/evaluate-pdf`, { 
          method: "POST", 
          body: formData,
          headers
        });
        await processResponse(res, isReevaluate);
      }
      
      setActiveTab('overview');
    } catch (err: any) {
      console.error("Backend error:", err);
      const displayError = err.message.includes("Unable to connect") 
        ? err.message 
        : `Server error: ${err.message || "An unexpected error occurred."}`;
      setError(displayError);
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
      <main className="max-w-4xl mx-auto px-6 pt-32 pb-24 space-y-12 z-10 relative">
        <section className="text-center space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900">Evaluation Dashboard</h1>
          <p className="text-gray-500 font-medium">Precision-engineered academic assessment engine</p>
        </section>

        <div className="flex justify-center">
          <div className="bg-gray-100 p-1 rounded-2xl flex gap-1 border border-gray-200 shadow-sm transition-all duration-200 ease-in-out">
            {INPUT_MODES.map((mode) => {
              const isLocked = !user && mode.id !== 'manual';
              return (
                <button 
                  key={mode.id} 
                  disabled={loading} 
                  onClick={() => { 
                    if (isLocked) {
                      setError("Login required for PDF evaluation");
                      return;
                    }
                    setInputMode(mode.id); 
                    setResult(null); 
                    setEvaluations(null); 
                    setError(null); 
                    setSummary(null); 
                  }} 
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ease-in-out relative active:scale-[0.98] ${inputMode === mode.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'} ${isLocked ? 'opacity-50 cursor-not-allowed group' : ''}`}
                >
                  {isLocked && <span className="material-symbols-outlined text-[16px] absolute -top-1 -right-1 bg-white rounded-full shadow-sm">lock</span>}
                  {mode.label}
                  {isLocked && (
                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-50">
                      Login required for PDF evaluation
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <section className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 ease-in-out rounded-2xl p-8 md:p-10 space-y-10">
          {inputMode !== 'combined' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
              <div className="md:col-span-3 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Question Prompt</label>
                  <button disabled={loading} onClick={() => setIsCustom(!isCustom)} className={`text-[10px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded-full border transition-all duration-200 ${isCustom ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>{isCustom ? "✓ Custom" : "+ Custom"}</button>
                </div>
                {isCustom ? (
                  <input disabled={loading} type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200 font-medium text-gray-800" placeholder="Enter custom question..." value={customQuestion} onChange={(e) => setCustomQuestion(e.target.value)} />
                ) : (
                  <select disabled={loading} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200 font-medium cursor-pointer text-gray-800" value={selectedQuestion} onChange={(e) => setSelectedQuestion(e.target.value)}>
                    {PREDEFINED_QUESTIONS.map((q, i) => <option key={i} value={q}>{q}</option>)}
                  </select>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Target Marks</label>
                <select disabled={loading} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200 font-medium bg-gray-50 text-gray-800" value={marks} onChange={(e) => setMarks(Number(e.target.value))}>
                  {MARK_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} Marks</option>)}
                </select>
              </div>
            </div>
          )}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Your Submission</label>
            {inputMode === 'manual' ? (
              <textarea 
                disabled={loading} 
                className="w-full border border-gray-200 rounded-xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200 h-48 resize-none text-gray-700 leading-relaxed font-medium" 
                placeholder={`Write your response for ${marks} marks...`} 
                value={userAnswer} 
                onChange={(e) => setUserAnswer(e.target.value)} 
              />
            ) : (
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ease-in-out relative group ${isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 bg-gray-50/50 hover:border-blue-400 hover:bg-blue-50/20'}`}
            >
                {selectedFile ? (
                  <>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedFile(null); 
                        setResult(null);
                        setError(null);
                        setLoading(false);
                        setEvaluations(null);
                        setSummary(null);
                      }}
                      className="absolute top-4 right-4 bg-white border border-gray-200 p-2.5 rounded-xl shadow-sm hover:bg-red-50 hover:border-red-200 text-red-500 z-30 transition-all duration-200 active:scale-90 hover:shadow-md"
                      title="Remove file"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                    <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
                      <div className="w-16 h-16 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center shadow-sm border border-green-100">
                        <span className="material-symbols-outlined text-4xl">task</span>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">{selectedFile.name}</p>
                        <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest mt-1.5 flex items-center justify-center gap-1.5"><span className="material-symbols-outlined text-[14px]">verified</span>Ready for evaluation</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <input 
                      disabled={loading} 
                      type="file" 
                      accept=".pdf" 
                      className="absolute inset-0 opacity-0 cursor-pointer z-20" 
                      onChange={handleFileChange} 
                    />
                    <div className="flex flex-col items-center gap-4">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${isDragging ? 'bg-blue-600 text-white scale-110 shadow-lg' : 'bg-blue-50 text-blue-600 group-hover:scale-110'}`}>
                        <span className="material-symbols-outlined text-4xl">{isDragging ? 'upload_file' : 'picture_as_pdf'}</span>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">{isDragging ? 'Drop your file here' : 'Upload Answer Sheet'}</p>
                        <p className="text-[11px] text-gray-500 mt-1.5 font-medium tracking-wide">{isDragging ? 'Let go to upload' : 'Upload your PDF to get instant evaluation'}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          {error && <div className="text-sm text-red-600 font-bold text-center px-4 py-4 bg-red-50 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-2">{error}</div>}
          <div className="flex justify-end pt-4">
            <button 
              onClick={() => handleEvaluate(false)} 
              disabled={loading || (inputMode === 'manual' ? userAnswer.trim().length === 0 : !selectedFile)} 
              className="bg-blue-600 text-white rounded-xl px-12 py-4.5 font-bold flex items-center gap-3 disabled:opacity-50 active:scale-[0.98] transition-all duration-200 shadow-lg hover:bg-blue-700 hover:shadow-blue-600/20 hover:shadow-xl"
            >
              {loading ? <><span className="material-symbols-outlined animate-spin text-xl">sync</span><span className="tracking-wide">{loadingMsg}</span></> : <><span className="tracking-wide">Begin Evaluation</span><span className="material-symbols-outlined text-2xl">auto_awesome</span></>}
            </button>
          </div>
        </section>

        {!result && !loading && (
          <div className="py-20 text-center animate-in fade-in duration-700">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 text-gray-300 mb-6">
              <span className="material-symbols-outlined text-3xl">analytics</span>
            </div>
            <p className="text-gray-500 font-medium text-lg">Enter an answer or upload a PDF to begin evaluation</p>
          </div>
        )}

        {result && !loading && (
          <section className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">
            <div className="bg-white border border-gray-100 shadow-md rounded-2xl p-10 text-center space-y-6 relative overflow-hidden transition-all duration-300 hover:shadow-lg">
              <div className="absolute top-0 left-0 w-full h-2 bg-gray-50">
                <div className={`h-full transition-all duration-1500 ease-out origin-left animate-in slide-in-from-left-full ${result.result_label === 'Invalid Response' ? 'bg-red-500' : result.result_label === 'Low Quality Answer' ? 'bg-amber-500' : 'bg-blue-600'}`} style={{ width: result.result_label === 'Invalid Response' ? '100%' : `${(result.score / result.max_score) * 100}%` }}></div>
              </div>
              <div className="absolute top-6 right-6 flex items-center gap-2">
                {result.validation_confidence < 1.0 && (
                  <div className="text-[9px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1.5 rounded-full border border-gray-200 shadow-sm flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[12px]">security</span>
                    VAL: {Math.round(result.validation_confidence * 100)}%
                  </div>
                )}
                {result.result_label === 'Invalid Response' ? (
                  <div className="text-[10px] font-bold text-red-600 bg-red-50 px-3.5 py-1.5 rounded-full border border-red-100 shadow-sm flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">warning</span>
                    INVALID
                  </div>
                ) : result.result_label === 'Low Quality Answer' ? (
                  <div className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3.5 py-1.5 rounded-full border border-amber-100 shadow-sm flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">info</span>
                    LOW QUALITY
                  </div>
                ) : (
                  reevaluateMsg && <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100 shadow-sm">{reevaluateMsg}</div>
                )}
              </div>
              
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em]">Evaluation Result</span>
                <p className={`text-3xl font-bold leading-tight ${result.result_label === 'Invalid Response' ? 'text-red-600' : result.result_label === 'Low Quality Answer' ? 'text-amber-600' : 'text-gray-900'}`}>
                  {result.result_label === 'Invalid Response' ? "Inconclusive Result" : result.result_label === 'Low Quality Answer' ? "Concise Response" : `"${result.summary}"`}
                </p>
              </div>

              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Your Score</span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-5xl font-black tracking-tighter ${result.result_label === 'Invalid Response' ? 'text-red-600' : result.result_label === 'Low Quality Answer' ? 'text-amber-600' : result.score / result.max_score >= 0.85 ? 'text-green-600' : result.score / result.max_score >= 0.5 ? 'text-blue-600' : 'text-red-600'}`}>{result.score}</span>
                  <span className="text-xl font-bold text-gray-300">/ {result.max_score}</span>
                </div>
                <span className={`text-[11px] font-bold uppercase tracking-widest mt-1 ${result.result_label === 'Invalid Response' ? 'text-red-600' : result.result_label === 'Low Quality Answer' ? 'text-amber-600' : result.score / result.max_score >= 0.85 ? 'text-green-600' : result.score / result.max_score >= 0.5 ? 'text-blue-600' : 'text-red-600'}`}>{result.result_label}</span>
              </div>

              <div className="pt-4 border-t border-gray-50">
                <button onClick={() => handleEvaluate(true)} className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-2 mx-auto transition-all duration-200 active:scale-95 group">
                  <span className="material-symbols-outlined text-lg group-hover:rotate-180 transition-transform duration-500">refresh</span> 
                  Request Deep Re-analysis
                </button>
              </div>
            </div>

            {(summary?.preview || result?.extracted_text_preview) && (
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md">
                <button onClick={() => setShowPreview(!showPreview)} className="w-full flex items-center justify-between p-5 bg-gray-50 border-b border-gray-100 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-all duration-200">
                  <span className="flex items-center gap-3"><span className="material-symbols-outlined text-[18px]">visibility</span>Transcribed Content Preview</span>
                  <span className="material-symbols-outlined transition-transform duration-300 text-lg" style={{ transform: showPreview ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                </button>
                {showPreview && (
                  <div className="animate-in slide-in-from-top-4 duration-300 ease-out">
                    <div className="p-10 bg-white text-sm text-gray-600 font-mono leading-loose max-h-72 overflow-y-auto custom-scrollbar">
                      {summary?.preview || result?.extracted_text_preview}
                    </div>
                    <div className="px-10 py-4 bg-gray-50 border-t border-gray-100 flex items-center gap-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <span className="material-symbols-outlined text-[16px]">security</span>Neural-OCR processed in secure sandboxed environment
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white border border-gray-100 shadow-md rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg">
              <div className="flex border-b border-gray-100 bg-gray-50/50">
                {['overview', 'improve', 'missing', 'model answer', 'feedback'].map((tab) => (
                  <button 
                    key={tab} 
                    onClick={() => setActiveTab(tab)} 
                    className={`flex-1 py-5 text-[10px] font-bold uppercase tracking-widest transition-all duration-200 border-b-2 relative ${activeTab === tab ? 'text-blue-600 border-blue-600 bg-white shadow-[0_4px_12px_-4px_rgba(37,99,235,0.2)]' : 'text-gray-400 border-transparent hover:text-gray-900 hover:bg-white/50'}`}
                  >
                    {tab === 'improve' ? 'Learning Plan' : tab}
                    {(result.result_label === 'Invalid Response' || result.result_label === 'Low Quality Answer') && (tab === 'missing' || tab === 'improve') && (
                      <span className={`absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse ${result.result_label === 'Invalid Response' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                    )}
                  </button>
                ))}
              </div>
              <div className="p-10 md:p-14">
                {activeTab === 'overview' && (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="relative flex items-center justify-center w-48 h-48 group">
                      <div className="absolute inset-0 bg-blue-600/5 rounded-full blur-2xl transition-all duration-500 group-hover:bg-blue-600/10"></div>
                      <svg className="w-full h-full transform -rotate-90 relative z-10">
                        <circle className="text-gray-100" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeWidth="12" />
                        <circle className="text-blue-600 transition-all duration-1500 ease-out animate-in fade-in" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeDasharray="552.9" strokeDashoffset={552.9 - (552.9 * (result.score / result.max_score))} strokeLinecap="round" strokeWidth="12" />
                      </svg>
                      <div className="absolute flex flex-col items-center z-20">
                        <span className="text-7xl font-black tracking-tighter text-gray-900">{result.score}</span>
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-[-4px]">Points Earned</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-8 text-center md:text-left">
                      <div className="flex flex-wrap justify-center md:justify-start gap-3">
                        <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-blue-100 shadow-sm">{result.detected_level}</div>
                        <div className="px-4 py-2 bg-green-50 text-green-600 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border border-green-100 shadow-sm">
                          <span className="material-symbols-outlined text-[16px]">verified</span>
                          Confidence: {getConfidenceLevel(result.confidence)} ({Math.round(result.confidence * 100)}%)
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="h-px w-12 bg-gray-200 hidden md:block"></div>
                        <h4 className="text-2xl font-semibold text-gray-900 leading-relaxed italic">"{result.question}"</h4>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'improve' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-xl">psychology</span>
                      </div>
                      <div className="space-y-0.5">
                        <h5 className="text-sm font-bold text-gray-900 tracking-tight">Learning Strategy</h5>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Personalized optimization plan</p>
                      </div>
                    </div>
                    <div className="p-10 bg-gray-50 rounded-2xl border border-gray-100 text-base text-gray-700 leading-loose font-medium shadow-inner">
                      {result.improvement_plan}
                    </div>
                  </div>
                )}
                {activeTab === 'missing' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                      <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-xl">warning</span>
                      </div>
                      <div className="space-y-0.5">
                        <h5 className="text-sm font-bold text-gray-900 tracking-tight">Critical Knowledge Gaps</h5>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Missing points from evaluation</p>
                      </div>
                    </div>
                    <div className="grid gap-4">
                      {result.missing_points.map((m: string, i: number) => (
                        <div key={i} className="p-6 bg-red-50/30 text-red-700 rounded-2xl text-base font-semibold border border-red-100 flex items-start gap-4 transition-all hover:bg-red-50/50">
                          <span className="material-symbols-outlined text-red-400 text-xl mt-0.5">error_outline</span>
                          {m}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {activeTab === 'model answer' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                      <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-xl">verified_user</span>
                      </div>
                      <div className="space-y-0.5">
                        <h5 className="text-sm font-bold text-gray-900 tracking-tight">Reference Architecture</h5>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Ideal response model</p>
                      </div>
                    </div>
                    <div className="p-10 bg-gray-50 rounded-2xl text-base text-gray-700 font-medium leading-loose whitespace-pre-wrap border border-gray-100 shadow-inner">
                      {result.ideal_answer}
                    </div>
                  </div>
                )}
                {activeTab === 'feedback' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-xl">forum</span>
                      </div>
                      <div className="space-y-0.5">
                        <h5 className="text-sm font-bold text-gray-900 tracking-tight">Holistic Assessment</h5>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Comprehensive evaluator insights</p>
                      </div>
                    </div>
                    <div className={`p-12 rounded-2xl text-2xl font-semibold leading-relaxed italic border relative ${result.result_label === 'Invalid Response' ? 'bg-red-50/20 border-red-100/50 text-red-900' : result.result_label === 'Low Quality Answer' ? 'bg-amber-50/20 border-amber-100/50 text-amber-900' : 'bg-blue-50/20 border-blue-100/50 text-gray-900'}`}>
                      <span className={`absolute top-4 left-4 text-6xl font-serif leading-none opacity-50 select-none ${result.result_label === 'Invalid Response' ? 'text-red-100' : result.result_label === 'Low Quality Answer' ? 'text-amber-100' : 'text-blue-100'}`}>“</span>
                      <p className="relative z-10">{result.feedback_simple}</p>
                      <span className={`absolute bottom-[-10px] right-6 text-6xl font-serif leading-none opacity-50 select-none ${result.result_label === 'Invalid Response' ? 'text-red-100' : result.result_label === 'Low Quality Answer' ? 'text-amber-100' : 'text-blue-100'}`}>”</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
