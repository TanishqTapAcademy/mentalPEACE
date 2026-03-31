import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, getErrorMessage } from '../context/AuthContext';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, isLoading, login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleGoogleResponse = useCallback(async (response: { credential: string }) => {
    setError('');
    setLoading(true);
    try {
      await googleLogin(response.credential);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [googleLogin, navigate]);

  useEffect(() => {
    const initGoogle = () => {
      if (window.google && googleButtonRef.current) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'filled_black',
          size: 'large',
          width: '100%',
          shape: 'pill',
          text: 'signin_with',
        });
      }
    };

    // GSI script may already be loaded or still loading
    if (window.google) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          clearInterval(interval);
          initGoogle();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [handleGoogleResponse]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="bg-[#09090b] min-h-screen flex items-center justify-center font-['Roboto_Condensed'] text-zinc-300 relative overflow-hidden antialiased selection:bg-teal-500/30 selection:text-teal-200"
      style={{
        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }}
    >
      {/* Ambient Background */}
      <div className="absolute top-[-15%] left-[-10%] w-[80vw] h-[80vw] sm:w-[55vw] sm:h-[55vw] bg-teal-600/20 rounded-full blur-[80px] sm:blur-[100px] animate-[float_18s_ease-in-out_infinite] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[70vw] h-[70vw] sm:w-[50vw] sm:h-[50vw] bg-emerald-600/15 rounded-full blur-[80px] sm:blur-[100px] animate-[float_22s_ease-in-out_infinite_reverse] pointer-events-none mix-blend-screen" />
      <div className="absolute top-[20%] right-[15%] w-[50vw] h-[50vw] sm:w-[35vw] sm:h-[35vw] bg-cyan-600/15 rounded-full blur-[70px] sm:blur-[90px] animate-[float_15s_ease-in-out_infinite_1s] pointer-events-none mix-blend-screen" />

      {/* Main Container */}
      <div className="relative z-10 w-full px-4 sm:px-6 max-w-sm sm:max-w-md group/container" style={{ perspective: '1200px' }}>
        <div className="bg-zinc-900/50 backdrop-blur-2xl border border-white/5 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5),0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(0,0,0,0.5)] rounded-[2rem] p-6 sm:p-10 flex flex-col gap-6 sm:gap-8 animate-[slideFadeIn_0.8s_cubic-bezier(0.16,1,0.3,1)_both] transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.7),0_8px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] relative overflow-hidden">
          {/* Glass reflection */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-white/10 to-transparent opacity-10 pointer-events-none" />

          {/* Header */}
          <div className="flex flex-col items-center text-center gap-3 sm:gap-4 relative z-20">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-teal-900 to-[#09090b] rounded-2xl flex items-center justify-center shadow-[0_8px_16px_-4px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.8)] mb-1 ring-1 ring-teal-500/20 transition-transform duration-500 hover:scale-[1.08] hover:-rotate-3 relative overflow-hidden group/logo">
              <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/0 via-teal-400/20 to-teal-500/0 opacity-0 group-hover/logo:opacity-100 transition-opacity duration-500" />
              <span className="text-teal-400 text-base sm:text-lg font-medium tracking-tighter relative z-10 drop-shadow-[0_0_8px_rgba(45,212,191,0.4)]">MP</span>
            </div>
            <div className="space-y-1 sm:space-y-1.5 transition-transform duration-500 group-hover/container:translate-y-[-2px]">
              <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-white drop-shadow-sm">Welcome back</h1>
              <p className="text-xs sm:text-sm text-zinc-400 font-normal px-2 sm:px-0">Enter your credentials to access your account.</p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="relative z-20 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 animate-[slideFadeIn_0.3s_ease-out]">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5 relative z-20">
            {/* Email */}
            <div className="flex flex-col gap-1.5 group/field">
              <label htmlFor="email" className="text-xs font-medium text-zinc-400 uppercase tracking-widest pl-0.5 transition-colors duration-300 group-focus-within/field:text-teal-400">Email Address</label>
              <div className="relative group/input transition-all duration-300 transform group-focus-within/field:-translate-y-0.5">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within/input:text-teal-400 transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                </div>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-900/50 backdrop-blur-md border border-white/5 text-zinc-100 text-sm rounded-xl pl-9 pr-4 py-2.5 outline-none transition-all duration-300 focus:bg-[#09090b] focus:border-teal-500/40 focus:ring-4 focus:ring-teal-500/10 hover:bg-zinc-800/50 hover:border-white/10 placeholder:text-zinc-600 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]"
                  placeholder="hello@example.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5 group/field">
              <div className="flex items-center justify-between pl-0.5 pr-0.5">
                <label htmlFor="password" className="text-xs font-medium text-zinc-400 uppercase tracking-widest transition-colors duration-300 group-focus-within/field:text-teal-400">Password</label>
                <a href="#" className="text-xs font-medium text-zinc-500 hover:text-white transition-colors hover:underline underline-offset-4 decoration-zinc-700">Forgot?</a>
              </div>
              <div className="relative group/input transition-all duration-300 transform group-focus-within/field:-translate-y-0.5">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within/input:text-teal-400 transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-900/50 backdrop-blur-md border border-white/5 text-zinc-100 text-sm rounded-xl pl-9 pr-10 py-2.5 outline-none transition-all duration-300 focus:bg-[#09090b] focus:border-teal-500/40 focus:ring-4 focus:ring-teal-500/10 hover:bg-zinc-800/50 hover:border-white/10 placeholder:text-zinc-600 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-teal-400 transition-all duration-300 hover:scale-110 focus:outline-none"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" x2="23" y1="1" y2="23" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between mt-1 sm:mt-2 px-0.5">
              <label className="flex items-center gap-2.5 cursor-pointer group/check">
                <input type="checkbox" className="w-4 h-4 bg-zinc-900/50 border border-zinc-700 rounded accent-teal-500 cursor-pointer" />
                <span className="text-xs sm:text-sm font-normal text-zinc-400 select-none group-hover/check:text-zinc-200 transition-colors">Remember me</span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 sm:mt-4 w-full bg-gradient-to-b from-teal-500 to-emerald-600 text-white font-medium text-sm py-3 rounded-xl shadow-[0_4px_12px_rgba(20,184,166,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_8px_24px_rgba(20,184,166,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 flex justify-center items-center gap-2 group/btn relative overflow-hidden ring-1 ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shine_4s_ease-in-out_infinite] pointer-events-none" />
              <span className="relative z-10 tracking-wide drop-shadow-sm text-white">
                {loading ? 'Signing in...' : 'Sign In'}
              </span>
              {!loading && (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 transition-transform duration-300 group-hover/btn:translate-x-1 text-white"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative z-20 flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-700/50" />
            <span className="text-xs text-zinc-500 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-zinc-700/50" />
          </div>

          {/* Google Sign-In */}
          <div className="relative z-20 flex justify-center">
            <div ref={googleButtonRef} />
          </div>

          {/* Bottom Link */}
          <div className="text-center flex flex-col sm:inline-block text-xs sm:text-sm font-normal text-zinc-400 mt-1 sm:mt-2 relative z-20">
            <span>New to the platform?</span>{' '}
            <Link to="/signup" className="text-teal-400 font-medium hover:text-teal-300 hover:underline underline-offset-4 decoration-teal-500/30 hover:decoration-teal-400 transition-all sm:ml-0.5 mt-1 sm:mt-0">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
