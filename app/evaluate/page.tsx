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

export default function EvaluatePage() {
  const [selectedQuestion, setSelectedQuestion] = useState(PREDEFINED_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [marks, setMarks] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
  }, []);

  const toggleCustomMode = () => {
    setIsCustom(!isCustom);
    setError(null);
  };

  const handleEvaluate = async () => {
    try {
      setLoading(true);
      setError(null);

      const finalQuestion = isCustom ? customQuestion : selectedQuestion;

      console.log("Sending:", { question: finalQuestion, answer: userAnswer, marks: marks });

      // Validation
      if (!finalQuestion || finalQuestion.trim().length < 5) {
        setError("Please enter a valid question");
        setLoading(false);
        return;
      }

      if (!userAnswer || userAnswer.trim().length < 5) {
        setError("Please enter a valid answer");
        setLoading(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: finalQuestion,
          answer: userAnswer,
          marks: marks
        }),
      });

      if (!response.ok) {
        throw new Error("API failed");
      }
      
      const data = await response.json();
      console.log("Response:", data);
      
      setResult(data);
      setActiveTab('overview');

      // Save to history if logged in
      if (user) {
        await supabase.from('evaluation_history').insert({
          user_id: user.id,
          question: finalQuestion,
          answer: userAnswer,
          score: data.score,
          max_score: data.max_score,
          feedback: data.feedback
        });
      }
    } catch (err) {
      console.error("Evaluation error:", err);
      setError("Evaluation failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-body text-[#1d1d1f] antialiased min-h-screen">
      <NavBar />
      <main className="max-w-4xl mx-auto px-6 pt-32 pb-24 space-y-10 z-10 relative">
        {/* Header Section */}
        <section className="text-center space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1d1d1f]">EvalMind Assessment</h2>
          <p className="text-[#86868b] font-medium text-sm">Engineered for Fair Evaluation</p>
        </section>

        {/* Assessment Input Card */}
        <section className="apple-card p-8 md:p-10 space-y-8">
          <div className="space-y-6">
            {/* Row 1: Labels */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#007aff]">Question Prompt</span>
                <button 
                  onClick={toggleCustomMode}
                  className={`text-[10px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded-full transition-all border ${isCustom ? 'bg-[#007aff] text-white border-[#007aff]' : 'bg-white text-[#86868b] border-[#d2d2d7] hover:border-[#86868b]'}`}
                >
                  {isCustom ? "✓ Custom Mode" : "+ Enter Custom"}
                </button>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#86868b] md:mr-32">Marks</span>
            </div>

            {/* Row 2: Inputs */}
            <div className="flex flex-col md:flex-row items-start gap-4">
              <div className="flex-1 w-full">
                {isCustom ? (
                  <input 
                    type="text"
                    className="apple-input w-full text-lg font-bold text-[#1d1d1f] border-[#007aff] border-opacity-30 focus:border-opacity-100 animate-in fade-in slide-in-from-top-1 duration-300"
                    placeholder="Enter your question here..."
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                  />
                ) : (
                  <select 
                    className="apple-input w-full text-lg font-bold text-[#1d1d1f] cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22%2386868B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_16px_center]"
                    value={selectedQuestion}
                    onChange={(e) => setSelectedQuestion(e.target.value)}
                  >
                    {PREDEFINED_QUESTIONS.map((q, i) => (
                      <option key={i} value={q}>{q}</option>
                    ))}
                  </select>
                )}
              </div>
              
              <div className="w-full md:w-40">
                <select 
                  className="apple-input w-full font-bold text-[#1d1d1f] cursor-pointer bg-[#f5f5f7] border-transparent"
                  value={marks}
                  onChange={(e) => setMarks(Number(e.target.value))}
                >
                  {MARK_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt} Marks</option>
                  ))}
                </select>
              </div>
            </div>
            
            {isCustom && (
              <div className="text-[10px] font-semibold text-[#ff9500] flex items-center gap-1.5 uppercase tracking-wide px-1 animate-in fade-in duration-500">
                <span className="material-symbols-outlined text-[14px]">info</span>
                General Evaluation Mode Active (Structural Analysis Only)
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-[#1d1d1f] px-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">edit_note</span>
              Student Response
            </label>
            <textarea 
              className="apple-input w-full h-44 resize-none font-body text-base leading-relaxed placeholder-[#86868b] bg-white border-[#d2d2d7]" 
              placeholder={`Write a ${marks >= 10 ? 'comprehensive ' : marks <= 2 ? 'concise ' : ''}response for ${marks} marks...`}
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
            ></textarea>
          </div>
          
          {!user && (
            <div className="text-sm font-medium text-[#86868b] p-4 bg-[#f5f5f7] rounded-2xl flex items-center gap-3 animate-in fade-in duration-700">
              <span className="material-symbols-outlined text-[#86868b] text-[20px]">info</span>
              <span>Browsing as Guest. <strong>Login</strong> to persist assessment results in your history.</span>
            </div>
          )}

          {error && <div className="text-sm text-[#ff3b30] font-bold text-center animate-bounce">{error}</div>}

          <div className="flex justify-end pt-2">
            <button 
              onClick={handleEvaluate}
              disabled={loading}
              className="primary-gradient px-10 py-4 rounded-full font-bold text-base transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-3 shadow-lg hover:shadow-xl active:scale-95"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-xl">sync</span>
                  Evaluating...
                </>
              ) : (
                <>
                  Evaluate Answer
                  <span className="material-symbols-outlined text-xl">auto_awesome</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Tabbed Result Section */}
        {result && !loading && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="apple-card overflow-hidden">
              {/* Tabs Header */}
              <div className="flex border-b border-[#e5e5ea] bg-[#fbfbfd]">
                {['overview', 'breakdown', 'missing', 'feedback'].map((tab) => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)} 
                    className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === tab ? 'text-[#007aff] border-[#007aff] bg-white' : 'text-[#86868b] border-transparent hover:text-[#1d1d1f]'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="p-8 md:p-12">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="flex flex-col items-center justify-center space-y-8">
                    <div className="relative flex items-center justify-center w-48 h-48">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle className="text-[#f5f5f7]" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeWidth="12"></circle>
                        <circle className="text-[#007aff] transition-all duration-1000 ease-out" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeDasharray="552.9" strokeDashoffset={552.9 - (552.9 * (result.score / result.max_score))} strokeLinecap="round" strokeWidth="12"></circle>
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-6xl font-bold text-[#1d1d1f] tracking-tight">{result.score}</span>
                        <span className="text-xs font-bold text-[#86868b] uppercase tracking-widest mt-1">out of {result.max_score}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
                      {['Clarity', 'Accuracy', 'Completeness', 'Terminology'].map(stat => (
                        <div key={stat} className="bg-[#f5f5f7] p-4 rounded-2xl text-center">
                          <p className="text-[10px] font-bold text-[#86868b] uppercase tracking-widest mb-1">{stat}</p>
                          <p className="text-lg font-bold text-[#1d1d1f]">{Math.round((result.score / result.max_score) * 100)}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Breakdown Tab */}
                {activeTab === 'breakdown' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                      <h5 className="text-sm font-bold text-[#1d1d1f] uppercase tracking-wider">Concept-wise Performance</h5>
                      <span className="text-[10px] font-bold text-[#86868b] uppercase">Status</span>
                    </div>
                    <ul className="space-y-3">
                      {result.breakdown?.map((item: any, i: number) => (
                        <li key={i} className="flex items-center justify-between p-5 bg-[#f5f5f7] rounded-2xl border-l-4 border-[#007aff] group hover:bg-[#ececef] transition-colors">
                          <div className="flex items-center gap-4">
                            <span className="material-symbols-outlined text-[#007aff]">check_circle</span>
                            <span className="font-bold text-[#1d1d1f] text-sm">{item.concept || item}</span>
                          </div>
                          <span className="text-xs font-bold text-[#007aff] bg-white px-3 py-1 rounded-full shadow-sm">{item.score || 'Pass'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Missing Concepts Tab */}
                {activeTab === 'missing' && (
                  <div className="space-y-6">
                    <h5 className="text-sm font-bold text-[#1d1d1f] uppercase tracking-wider px-1">Identified Gaps</h5>
                    <div className="grid grid-cols-1 gap-3">
                      {result.missing_concepts?.length > 0 ? (
                        result.missing_concepts.map((item: string, i: number) => (
                          <div key={i} className="flex items-start gap-4 p-5 bg-[#ff3b30] bg-opacity-5 rounded-2xl border border-[#ff3b30] border-opacity-10 group hover:bg-opacity-10 transition-all">
                            <span className="material-symbols-outlined text-[#ff3b30] bg-white rounded-full p-1 shadow-sm">warning</span>
                            <p className="font-bold text-[#1d1d1f] text-sm leading-relaxed">{item}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 bg-[#f5f5f7] rounded-2xl text-[#86868b] font-bold text-sm">No significant gaps detected.</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Feedback Tab */}
                {activeTab === 'feedback' && (
                  <div className="bg-[#f5f5f7] p-8 rounded-3xl space-y-6 border border-[#e5e5ea]">
                    <div className="flex items-center gap-3 text-[#1d1d1f]">
                      <div className="w-10 h-10 bg-[#007aff] rounded-full flex items-center justify-center text-white shadow-md">
                        <span className="material-symbols-outlined text-xl">forum</span>
                      </div>
                      <h5 className="text-sm font-bold uppercase tracking-wider">Examiner Evaluation</h5>
                    </div>
                    <p className="text-[#1d1d1f] text-lg font-medium leading-relaxed italic">
                      "{result.feedback}"
                    </p>
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
