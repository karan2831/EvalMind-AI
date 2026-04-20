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

  const toggleCustomMode = () => {
    setIsCustom(!isCustom);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        setError("Unsupported format. Please upload a PDF.");
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleEvaluate = async (isReevaluate = false) => {
    try {
      setLoading(true);
      setError(null);
      if (!isReevaluate) {
        setResult(null);
        setEvaluations(null);
        setSummary(null);
        setPrevScore(null);
        setReevaluateMsg(null);
      } else {
        setPrevScore(result.score);
      }

      const finalQuestion = isCustom ? customQuestion : selectedQuestion;

      if (inputMode === 'manual') {
        if (!finalQuestion || finalQuestion.trim().length < 5) throw new Error("Please enter a valid question");
        if (!userAnswer || userAnswer.trim().length < 5) throw new Error("Please enter a valid answer");

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: finalQuestion, answer: userAnswer, marks: marks })
        });

        const data = await handleApiResponse(res);
        if (data) {
          setResult(data);
          if (isReevaluate) {
            setReevaluateMsg(data.score === prevScore ? "Result is consistent" : "Minor variation detected");
          }
          saveHistory(finalQuestion, userAnswer, data);
        }
      } else {
        if (!selectedFile) throw new Error("Please upload a PDF file");

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('marks', marks.toString());
        formData.append('mode', inputMode);
        if (inputMode === 'answer_sheet') formData.append('question', finalQuestion);

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/evaluate-pdf`, {
          method: "POST",
          body: formData
        });

        const data = await handleApiResponse(res);
        if (data) {
          if (data.evaluations) {
            setEvaluations(data.evaluations);
            setSummary({ total_score: data.total_score, total_max_score: data.total_max_score, count: data.count, preview: data.extracted_text_preview });
            setResult(data.evaluations[0].result);
          } else {
            setResult(data);
            setSummary({ preview: data.extracted_text_preview });
          }
        }
      }
      setActiveTab('overview');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApiResponse = async (res: Response) => {
    const text = await res.text();
    if (!res.ok) {
      let msg = text;
      try { msg = JSON.parse(text).detail; } catch(e) {}
      setError(msg || "Evaluation failed");
      return null;
    }
    return JSON.parse(text);
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

  const getLabelColor = (label: string) => {
    if (label === "Excellent Answer") return "text-[#34c759]";
    if (label === "Good Answer") return "text-[#ffcc00]";
    return "text-[#ff3b30]";
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
              <button key={mode.id} onClick={() => { setInputMode(mode.id); setResult(null); setEvaluations(null); setError(null); setSummary(null); }} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${inputMode === mode.id ? 'bg-white text-[#007aff] shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}>
                <span className="material-symbols-outlined text-[18px]">{mode.icon}</span>{mode.label}
              </button>
            ))}
          </div>
        </div>

        <section className="apple-card p-8 md:p-10 space-y-8">
          {inputMode !== 'combined' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3"><span className="text-xs font-bold uppercase tracking-wider text-[#007aff]">Question Prompt</span><button onClick={toggleCustomMode} className={`text-[10px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded-full transition-all border ${isCustom ? 'bg-[#007aff] text-white border-[#007aff]' : 'bg-white text-[#86868b] border-[#d2d2d7]'}`}>{isCustom ? "✓ Custom Mode" : "+ Enter Custom"}</button></div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#86868b] md:mr-32">Marks</span>
              </div>
              <div className="flex flex-col md:flex-row items-start gap-4">
                <div className="flex-1 w-full">{isCustom ? <input type="text" className="apple-input w-full text-lg font-bold" placeholder="Enter your question here..." value={customQuestion} onChange={(e) => setCustomQuestion(e.target.value)} /> : <select className="apple-input w-full text-lg font-bold cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22%2386868B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')" value={selectedQuestion} onChange={(e) => setSelectedQuestion(e.target.value)}>{PREDEFINED_QUESTIONS.map((q, i) => <option key={i} value={q}>{q}</option>)}</select>}</div>
                <div className="w-full md:w-40"><select className="apple-input w-full font-bold bg-[#f5f5f7] border-transparent" value={marks} onChange={(e) => setMarks(Number(e.target.value))}>{MARK_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} Marks</option>)}</select></div>
              </div>
            </div>
          )}
          <div className="space-y-4">
            {inputMode === 'manual' ? <textarea className="apple-input w-full h-44 resize-none font-body text-base" placeholder={`Write your response for ${marks} marks...`} value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} /> : <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-[#d2d2d7] rounded-3xl bg-[#fbfbfd] hover:border-[#007aff] transition-all relative cursor-pointer"><input type="file" accept=".pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} /><div className="flex flex-col items-center gap-4 text-center"><div className="w-16 h-16 rounded-2xl bg-[#007aff] bg-opacity-5 text-[#007aff] flex items-center justify-center shadow-sm"><span className="material-symbols-outlined text-4xl">{selectedFile ? 'task' : 'picture_as_pdf'}</span></div><div><p className="font-bold">{selectedFile ? selectedFile.name : 'Click or Drag PDF Answer Sheet'}</p><p className="text-xs font-medium text-[#86868b] mt-1">Text-based PDF only (Max 10 pages)</p></div></div></div>}
          </div>
          {error && <div className="text-sm text-[#ff3b30] font-bold text-center px-4 py-2 bg-[#ff3b30] bg-opacity-5 rounded-xl border border-[#ff3b30] border-opacity-10 animate-shake">{error}</div>}
          <div className="flex justify-end pt-2">
            <button onClick={() => handleEvaluate(false)} disabled={loading} className="primary-gradient px-10 py-4 rounded-full font-bold transition-all disabled:opacity-40 flex items-center gap-3 shadow-lg active:scale-95">{loading ? <><span className="material-symbols-outlined animate-spin">sync</span>Processing...</> : <><span className="text-sm">Evaluate Now</span><span className="material-symbols-outlined text-xl">auto_awesome</span></>}</button>
          </div>
        </section>

        {result && !loading && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="apple-card p-8 text-center space-y-4 border-2 border-[#f5f5f7] relative">
              {reevaluateMsg && <div className="absolute top-4 right-4 text-[10px] font-bold text-[#007aff] bg-[#007aff] bg-opacity-10 px-3 py-1 rounded-full animate-bounce">{reevaluateMsg}</div>}
              <div className="flex flex-col items-center gap-1">
                <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${getLabelColor(result.result_label)}`}>{result.result_label}</span>
                <p className="text-2xl font-bold text-[#1d1d1f]">"{result.summary}"</p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center justify-center gap-2 text-[#86868b] text-[10px] font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-sm">bolt</span>
                  Evaluated instantly — saves time compared to manual checking
                </div>
                <button onClick={() => handleEvaluate(true)} className="text-[10px] font-bold text-[#007aff] hover:underline flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">refresh</span> Re-evaluate Answer
                </button>
              </div>
            </div>

            {(summary?.preview || result?.extracted_text_preview) && (
              <div className="apple-card overflow-hidden">
                <button onClick={() => setShowPreview(!showPreview)} className="w-full flex items-center justify-between p-4 bg-[#fbfbfd] border-b border-[#e5e5ea] text-[10px] font-bold uppercase tracking-widest text-[#86868b] hover:text-[#1d1d1f] transition-all"><span className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">visibility</span>Extracted Text Preview</span><span className="material-symbols-outlined transition-transform duration-300" style={{ transform: showPreview ? 'rotate(180deg)' : 'none' }}>expand_more</span></button>
                {showPreview && <div className="space-y-4"><div className="p-6 bg-white text-xs text-[#1d1d1f] font-mono leading-relaxed">{summary?.preview || result?.extracted_text_preview}</div><div className="px-6 pb-4 flex items-center gap-2 text-[10px] font-bold text-[#ff9500] uppercase tracking-wider"><span className="material-symbols-outlined text-sm">warning</span>AI evaluation is based on extracted text. Please verify content for best accuracy.</div></div>}
              </div>
            )}

            {summary?.total_score !== undefined && (
              <div className="bg-gradient-to-br from-[#007aff] to-[#5856d6] p-8 rounded-[2rem] text-white flex items-center justify-between shadow-2xl relative overflow-hidden group"><div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 -mr-10 -mt-10 rounded-full blur-2xl"></div><div className="z-10"><h4 className="text-sm font-bold uppercase tracking-[0.2em] opacity-70 mb-1">Batch Performance</h4><p className="text-xs opacity-50 font-medium">Evaluation across {summary.count} questions</p></div><div className="text-right z-10"><p className="text-4xl font-black">{summary.total_score} <span className="text-lg opacity-60">/ {summary.total_max_score}</span></p><div className="inline-block px-3 py-1 bg-white bg-opacity-10 rounded-full text-[10px] font-bold mt-2 uppercase tracking-widest">Aggregate Score</div></div></div>
            )}

            <div className="apple-card overflow-hidden">
              <div className="flex border-b border-[#e5e5ea] bg-[#fbfbfd]">{['overview', 'improve', 'missing', 'model answer', 'feedback'].map((tab) => (<button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === tab ? 'text-[#007aff] border-[#007aff] bg-white' : 'text-[#86868b] border-transparent hover:text-[#1d1d1f]'}`}>{tab === 'improve' ? 'Where to Improve' : tab}</button>))}</div>
              <div className="p-8 md:p-12">
                {activeTab === 'overview' && (
                  <div className="space-y-12">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                      <div className="relative flex items-center justify-center w-40 h-40"><svg className="w-full h-full transform -rotate-90"><circle className="text-[#f5f5f7]" cx="80" cy="80" fill="transparent" r="74" stroke="currentColor" strokeWidth="12"></circle><circle className="text-[#007aff] transition-all duration-1000" cx="80" cy="80" fill="transparent" r="74" stroke="currentColor" strokeDasharray="464.9" strokeDashoffset={464.9 - (464.9 * (result.score / result.max_score))} strokeLinecap="round" strokeWidth="12"></circle></svg><div className="absolute flex flex-col items-center"><span className="text-5xl font-black text-[#1d1d1f]">{result.score}</span><span className="text-[10px] font-bold text-[#86868b] uppercase tracking-widest">/ {result.max_score}</span></div></div>
                      <div className="flex-1 space-y-6 text-center md:text-left"><div className="space-y-2"><div className="flex flex-wrap justify-center md:justify-start gap-2"><span className="px-3 py-1 bg-[#007aff] bg-opacity-10 text-[#007aff] rounded-full text-[10px] font-bold uppercase tracking-wider">{result.detected_level}</span><span className="px-3 py-1 bg-[#34c759] bg-opacity-10 text-[#34c759] rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">verified</span>Confidence: {getConfidenceLevel(result.confidence)} ({Math.round(result.confidence * 100)}%)</span></div><h4 className="text-xl font-bold text-[#1d1d1f] line-clamp-2">{result.question || "Individual Response"}</h4></div><div className="grid grid-cols-3 gap-3">{[{ label: 'Coverage', val: result.scoring_breakdown.coverage }, { label: 'Depth', val: result.scoring_breakdown.depth }, { label: 'Clarity', val: result.scoring_breakdown.clarity }].map(b => (<div key={b.label} className="bg-[#f5f5f7] p-3 rounded-2xl"><div className="flex items-center justify-between mb-1"><span className="text-[8px] font-bold text-[#86868b] uppercase">{b.label}</span><span className="text-[10px] font-bold text-[#1d1d1f]">{Math.round(b.val * 100)}%</span></div><div className="w-full bg-white h-1 rounded-full overflow-hidden"><div className="bg-[#007aff] h-full transition-all duration-1000" style={{ width: `${b.val * 100}%` }}></div></div></div>))}</div></div>
                    </div>
                  </div>
                )}
                {activeTab === 'improve' && (
                  <div className="space-y-6">
                    <h5 className="text-xs font-bold text-[#1d1d1f] uppercase tracking-wider px-1">Learning Roadmap</h5>
                    <div className="p-8 bg-[#007aff] bg-opacity-5 rounded-3xl border border-[#007aff] border-opacity-10 space-y-4">
                      <div className="flex items-center gap-3 text-[#007aff]"><span className="material-symbols-outlined">trending_up</span><h6 className="font-bold text-sm">Where you can improve</h6></div>
                      <p className="text-sm font-medium text-[#1d1d1f] leading-relaxed">{result.improvement_plan}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-[#f5f5f7] p-6 rounded-2xl space-y-2"><p className="text-[8px] font-bold text-[#86868b] uppercase">Your Core Gap</p><p className="text-xs font-bold text-[#1d1d1f]">{result.score < result.max_score ? "Insufficient depth/detail compared to model answer." : "Mastered! No major gaps detected."}</p></div>
                      <div className="bg-[#f5f5f7] p-6 rounded-2xl space-y-2"><p className="text-[8px] font-bold text-[#86868b] uppercase">Expected Outcome</p><p className="text-xs font-bold text-[#007aff] italic">"Goal: 100% Score"</p></div>
                    </div>
                  </div>
                )}
                {activeTab === 'missing' && (<div className="space-y-6"><h5 className="text-xs font-bold text-[#1d1d1f] uppercase tracking-wider px-1">Gaps Identified</h5><div className="grid grid-cols-1 gap-3">{result.missing_points?.length > 0 ? (result.missing_points.map((item: string, i: number) => (<div key={i} className="flex items-start gap-4 p-5 bg-[#ff3b30] bg-opacity-5 rounded-2xl border border-[#ff3b30] border-opacity-10 group hover:bg-opacity-10 transition-all"><span className="material-symbols-outlined text-[#ff3b30] bg-white rounded-full p-1 text-sm shadow-sm">close</span><p className="font-bold text-[#1d1d1f] text-sm leading-relaxed">{item}</p></div>))) : (<div className="text-center py-10 bg-[#34c759] bg-opacity-5 border border-[#34c759] border-opacity-20 rounded-2xl text-[#34c759] font-bold text-sm flex flex-col items-center gap-2"><span className="material-symbols-outlined text-3xl">verified</span> Full Partial Credit Awarded</div>)}</div></div>)}
                {activeTab === 'model answer' && (<div className="space-y-6"><h5 className="text-xs font-bold text-[#1d1d1f] uppercase tracking-wider px-1">Model Answer Reference</h5><div className="p-8 bg-[#f5f5f7] rounded-3xl border border-[#e5e5ea] leading-relaxed relative"><p className="text-[#1d1d1f] text-base font-medium whitespace-pre-wrap">{result.ideal_answer}</p></div></div>)}
                {activeTab === 'feedback' && (
                  <div className="space-y-8">
                    <div className="bg-[#f5f5f7] p-8 rounded-3xl space-y-6 border border-[#e5e5ea]">
                      <div className="flex items-center gap-3 text-[#1d1d1f]"><div className="w-10 h-10 bg-[#007aff] rounded-full flex items-center justify-center text-white shadow-md"><span className="material-symbols-outlined text-xl">school</span></div><h5 className="text-[10px] font-bold uppercase tracking-wider">Teacher's Note</h5></div>
                      <p className="text-[#1d1d1f] text-lg font-bold leading-relaxed italic text-center md:text-left">"{result.feedback_simple}"</p>
                    </div>
                    <div className="space-y-4">
                      <h5 className="text-xs font-bold text-[#1d1d1f] uppercase tracking-wider px-1 flex items-center gap-2"><span className="material-symbols-outlined text-sm">lightbulb</span>Mistakes & How to Improve</h5>
                      <ul className="space-y-3">{result.mistake_explanations?.map((msg: string, i: number) => (<li key={i} className="flex items-start gap-3 p-4 bg-white border border-[#e5e5ea] rounded-2xl text-sm font-medium text-[#1d1d1f] leading-relaxed"><span className="w-1.5 h-1.5 bg-[#007aff] rounded-full mt-2 flex-shrink-0"></span>{msg}</li>))}</ul>
                    </div>
                    <div className="pt-6 border-t border-[#e5e5ea] text-center"><p className="text-xs font-bold text-[#007aff] italic">"{result.learning_outcome}"</p></div>
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
