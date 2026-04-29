'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function SupportForm() {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const userEmail = session.user.email;
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://evalmind-ai.onrender.com";
      
      console.log("Sending support request:", {
        subject,
        description,
        user_email: userEmail
      });

      const response = await fetch(`${backendUrl}/support/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          subject: subject,
          description: description,
          user_email: userEmail
        })
      });

      const data = await response.json();
      console.log("Support API response:", data);

      if (!response.ok) {
        console.error("Status:", response.status);
        console.error("Response:", data);
        throw new Error(data?.detail || "Request failed");
      }

      setSubject('');
      setDescription('');
      setMessage({ 
        type: 'success', 
        text: 'Your request has been submitted! We will get back to you soon.' 
      });
    } catch (error: any) {
      console.error('Support error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to submit request. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Issue with payment, evaluation, etc."
          className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your issue in detail..."
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium resize-none"
          required
        />
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
        }`}>
          <span className="material-symbols-outlined">{message.type === 'success' ? 'verified' : 'error'}</span>
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[20px]">send</span>
            Submit Support Request
          </>
        )}
      </button>
    </form>
  );
}
