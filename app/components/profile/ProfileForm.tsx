'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AvatarSelector from './AvatarSelector';

interface ProfileFormProps {
  selectedAvatar: string;
}

export default function ProfileForm({ selectedAvatar }: ProfileFormProps) {
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const response = await fetch(`${backendUrl}/profile/${session.user.id}`);
        const data = await response.json();
        
        if (data) {
          setFullName(data.full_name || '');
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setFetching(false);
      }
    }

    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!BASE_URL) {
        throw new Error("Backend URL not configured");
      }

      const response = await fetch(`${BASE_URL}/profile/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          full_name: fullName,
          avatar: selectedAvatar
        })
      });

      const data = await response.json();
      console.log("API response:", data);

      if (!response.ok) {
        throw new Error(data?.detail || "Profile update failed");
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Dispatch event to refresh UI across app
      window.dispatchEvent(new Event("profile-updated"));
    } catch (error: any) {
      console.error('Update error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="h-48 animate-pulse bg-gray-50 rounded-2xl" />;
  }

  return (
    <form onSubmit={handleSave} className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-8">
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Full Name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Enter your full name"
          className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium"
          required
        />
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
        }`}>
          <span className="material-symbols-outlined">{message.type === 'success' ? 'check_circle' : 'error'}</span>
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Saving Changes...
          </>
        ) : (
          'Save Profile Settings'
        )}
      </button>
    </form>
  );
}
