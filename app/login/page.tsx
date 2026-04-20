'use client';

import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Resend email verification state
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNeedsVerification(false);
    setResendSuccess(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setError('Please verify your email before logging in.');
        setNeedsVerification(true);
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      router.push('/evaluate');
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    setError(null);
    setResendSuccess(null);

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      setError(error.message);
    } else {
      setResendSuccess('Verification email resent');
      setNeedsVerification(false);
    }
    setResendLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center font-body text-[#1d1d1f] w-full">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 w-full z-50 glass-nav border-b border-[#e5e5ea] shadow-sm">
        <div className="flex items-center justify-between px-6 h-16 w-full max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden shadow-sm border border-[#e5e5ea]">
              <Image 
                src="/logo.jpeg" 
                alt="EvalMind AI Logo" 
                fill
                className="object-cover"
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#1d1d1f] font-headline">
              EvalMind <span className="text-[#007aff]">AI</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="w-full max-w-md px-6 py-20 flex flex-col items-center text-center z-10 relative">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-[#1d1d1f] mb-2">Welcome back</h1>
          <p className="text-[#86868b] font-body text-base">Continue your journey with academic precision.</p>
        </div>

        <div className="apple-card w-full p-8 space-y-6">
          {/* Third Party Auth */}
          <button className="w-full flex items-center justify-center gap-3 bg-white border border-[#d2d2d7] py-3.5 px-6 rounded-2xl hover:bg-[#f5f5f7] transition-colors">
            <img alt="Google" className="w-5 h-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDvpe_bOZp18jX7vjPnNZUiQvnT6dIZ1kFGbrnbHQWQ2meWrEZGOR3LtJovr5i8komtq3rizYpVNbZYBpCmGw4Ir7Frx-NKNo3mj7pimXGuGIsW9G6oEd8OnNQ5XRMN8eZdT2SKRAIXxWPJV1kTJeyECh2QMOmG3XqPnFu_fvZ4QSqtUiM049FebMilEEZsRtvF8cfmFYyb6PqWAjY5XD9MSqXHfPuEncXlVkMze46ZsbpqYpppb8nF77mX1X4IQSMA9TFHgddlP-lL" />
            <span className="font-semibold text-[#1d1d1f]">Continue with Google</span>
          </button>

          {/* Separator */}
          <div className="flex items-center gap-4 py-2">
            <div className="h-[1px] flex-1 bg-[#e5e5ea]"></div>
            <span className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">or</span>
            <div className="h-[1px] flex-1 bg-[#e5e5ea]"></div>
          </div>

          {/* Login Form */}
          <form className="space-y-5 text-left" onSubmit={handleLogin}>
            {resendSuccess && <div className="text-sm text-[#007aff] bg-[#007aff] bg-opacity-10 p-3 rounded-lg font-medium text-center">{resendSuccess}</div>}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1d1d1f] ml-1" htmlFor="email">Email</label>
              <input 
                className="apple-input w-full" 
                id="email" 
                placeholder="name@domain.com" 
                type="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setNeedsVerification(false);
                  setResendSuccess(null);
                  setError(null);
                }}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-sm font-medium text-[#1d1d1f]" htmlFor="password">Password</label>
                <a className="text-xs font-semibold text-[#007aff] hover:underline" href="#">Forgot?</a>
              </div>
              <div className="relative">
                <input 
                  className="apple-input w-full pr-12" 
                  id="password" 
                  placeholder="••••••••" 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f] z-10 pointer-events-auto flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[20px] select-none">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {error && <div className="text-sm text-[#ff3b30] font-medium mt-1">{error}</div>}

            <div className="space-y-3 mt-4">
              <button disabled={loading} className="w-full primary-gradient py-3.5 rounded-2xl font-semibold text-lg" type="submit">
                {loading ? 'Signing In...' : 'Sign In'}
              </button>

              {needsVerification && (
                <button 
                  type="button" 
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="w-full bg-[#f5f5f7] border border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#e5e5ea] py-3 rounded-2xl font-semibold text-sm transition-colors"
                >
                  {resendLoading ? 'Resending...' : 'Resend Email'}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Footer Links */}
        <div className="flex flex-col gap-4 mt-8">
          <Link href="/evaluate" className="text-[#86868b] font-medium hover:text-[#1d1d1f] transition-colors flex items-center justify-center gap-1.5">
            <span>Continue as Guest</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
          <p className="text-sm text-[#86868b]">
            Don't have an account?{' '}
            <Link className="text-[#1d1d1f] font-semibold hover:underline decoration-[#1d1d1f] underline-offset-2" href="/signup">
              Create one
            </Link>
          </p>
        </div>
      </main>

      {/* Aesthetic Decorative Background Elements */}
      <div className="fixed top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-[#007aff] opacity-[0.03] rounded-full blur-[100px] pointer-events-none -z-10"></div>
      <div className="fixed bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] bg-[#34c759] opacity-[0.03] rounded-full blur-[100px] pointer-events-none -z-10"></div>
    </div>
  );
}
