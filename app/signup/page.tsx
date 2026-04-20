'use client';

import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Signup triggered");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : '',
        data: {
          full_name: fullName
        }
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data?.user && !data?.session) {
      console.log("Verification email requested");
      setSuccessMessage("Verification email sent. Please check your inbox or spam folder.");
      setLoading(false);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFullName('');
    } else {
      router.push('/evaluate');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center font-body text-[#1d1d1f] w-full py-12">
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
      <main className="w-full max-w-md px-6 py-12 flex flex-col items-center text-center z-10 relative">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-[#1d1d1f] mb-2">Create an account</h1>
          <p className="text-[#86868b] font-body text-base">Join the future of academic evaluation.</p>
        </div>

        <div className="apple-card w-full p-8 space-y-6">
          {/* Third Party Auth */}
          <button className="w-full flex items-center justify-center gap-3 bg-white border border-[#d2d2d7] py-3.5 px-6 rounded-2xl hover:bg-[#f5f5f7] transition-colors">
            <img alt="Google" className="w-5 h-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDvpe_bOZp18jX7vjPnNZUiQvnT6dIZ1kFGbrnbHQWQ2meWrEZGOR3LtJovr5i8komtq3rizYpVNbZYBpCmGw4Ir7Frx-NKNo3mj7pimXGuGIsW9G6oEd8OnNQ5XRMN8eZdT2SKRAIXxWPJV1kTJeyECh2QMOmG3XqPnFu_fvZ4QSqtUiM049FebMilEEZsRtvF8cfmFYyb6PqWAjY5XD9MSqXHfPuEncXlVkMze46ZsbpqYpppb8nF77mX1X4IQSMA9TFHgddlP-lL" />
            <span className="font-semibold text-[#1d1d1f]">Sign up with Google</span>
          </button>

          {/* Separator */}
          <div className="flex items-center gap-4 py-2">
            <div className="h-[1px] flex-1 bg-[#e5e5ea]"></div>
            <span className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">or</span>
            <div className="h-[1px] flex-1 bg-[#e5e5ea]"></div>
          </div>

          {/* Signup Form */}
          <form className="space-y-4 text-left" onSubmit={handleSignup}>
            {successMessage && <div className="text-sm text-[#007aff] bg-[#007aff] bg-opacity-10 p-3 rounded-lg font-medium text-center">{successMessage}</div>}
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1d1d1f] ml-1" htmlFor="fullName">Full Name</label>
              <input 
                className="apple-input w-full" 
                id="fullName" 
                placeholder="John Doe" 
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1d1d1f] ml-1" htmlFor="email">Email</label>
              <input 
                className="apple-input w-full" 
                id="email" 
                placeholder="name@domain.com" 
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1d1d1f] ml-1" htmlFor="password">Password</label>
              <div className="relative">
                <input 
                  className="apple-input w-full pr-12" 
                  id="password" 
                  placeholder="••••••••" 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
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
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1d1d1f] ml-1" htmlFor="confirmPassword">Confirm Password</label>
              <div className="relative">
                <input 
                  className="apple-input w-full pr-12" 
                  id="confirmPassword" 
                  placeholder="••••••••" 
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
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

            <button disabled={loading} className="w-full primary-gradient py-3.5 rounded-2xl font-semibold text-lg mt-4" type="submit">
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Footer Links */}
        <div className="flex flex-col gap-4 mt-8">
          <Link href="/evaluate" className="text-[#86868b] font-medium hover:text-[#1d1d1f] transition-colors flex items-center justify-center gap-1.5">
            <span>Continue as Guest</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
          <p className="text-sm text-[#86868b]">
            Already have an account?{' '}
            <Link className="text-[#1d1d1f] font-semibold hover:underline decoration-[#1d1d1f] underline-offset-2" href="/login">
              Log in
            </Link>
          </p>
        </div>
      </main>
      
      {/* Aesthetic Decorative Background Elements */}
      <div className="fixed top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-[#007aff] opacity-[0.03] rounded-full blur-[100px] pointer-events-none -z-10"></div>
    </div>
  );
}
