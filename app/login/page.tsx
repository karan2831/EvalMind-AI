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

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center font-body text-[#1d1d1f] w-full">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 w-full z-50 glass-nav border-b border-[#e5e5ea] shadow-sm">
        <div className="flex items-center justify-between px-6 h-16 w-full max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm border border-[#e5e5ea] flex items-center justify-center bg-white">
              <Image 
                src="/logo.jpeg" 
                alt="EvalMind AI Logo" 
                width={32}
                height={32}
                className="object-cover"
                priority
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
          <p className="text-gray-600 font-body text-base">Continue your journey with academic precision.</p>
        </div>

        <div className="apple-card w-full p-8 space-y-6">
          {/* Third Party Auth */}
          <button 
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 bg-white rounded-xl py-3 px-6 hover:bg-gray-50 transition-all active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="font-semibold text-gray-900">Continue with Google</span>
          </button>

          {/* Separator */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-sm text-gray-500">OR</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          {/* Login Form */}
          <form className="space-y-5 text-left" onSubmit={handleLogin}>
            {resendSuccess && <div className="text-sm text-[#007aff] bg-[#007aff] bg-opacity-10 p-3 rounded-lg font-medium text-center">{resendSuccess}</div>}

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1" htmlFor="email">Email</label>
              <input 
                className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" 
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

            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-700" htmlFor="password">Password</label>
                <a className="text-xs font-semibold text-blue-600 hover:underline" href="#">Forgot?</a>
              </div>
              <div className="relative">
                <input 
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition pr-12" 
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 z-10"
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
          <p className="text-sm text-gray-600">
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
