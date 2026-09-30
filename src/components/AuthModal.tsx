import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { currentFirebaseProjectId } from '../lib/firebase';
import { 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Globe,
  ChevronLeft
} from 'lucide-react';

interface AuthModalProps {
  initialMode?: 'signin' | 'signup';
  onSuccess: () => void;
  onCancel: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ initialMode = 'signup', onSuccess, onCancel }) => {
  const { signInWithGoogle, signUpEmail, loginEmail, resetPassword } = useAuth();
  
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Specific handler for Firebase authorized domains
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setUnauthorizedDomain(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!name.trim()) throw new Error("Please enter your name");
        if (password.length < 6) throw new Error("Password should be at least 6 characters");
        await signUpEmail(email.trim(), password, name.trim());
        onSuccess();
      } else if (mode === 'signin') {
        await loginEmail(email.trim(), password);
        onSuccess();
      } else if (mode === 'forgot') {
        await resetPassword(email.trim());
        setSuccessMsg("Password reset link sent! Check your inbox.");
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setErrorMsg("This email is already in use. Please sign in instead.");
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setErrorMsg("Incorrect email or password.");
      } else {
        setErrorMsg(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg('');
    setUnauthorizedDomain(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onSuccess();
    } catch (err: any) {
      console.error("Google sign in error:", err);
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain') || err.message?.includes('Authorized domains')) {
        setUnauthorizedDomain(window.location.hostname);
      } else {
        setErrorMsg(err.message || "Google sign in was cancelled or failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyDomain = () => {
    const domain = window.location.hostname;
    navigator.clipboard.writeText(domain);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2500);
  };

  const firebaseAuthSettingsUrl = `https://console.firebase.google.com/project/${currentFirebaseProjectId}/authentication/settings`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md bg-[#101014] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-scaleUp my-8">
        {/* Close / Back button */}
        <button 
          onClick={onCancel}
          className="absolute top-5 left-5 w-8 h-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center pt-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 mx-auto flex items-center justify-center mb-3 shadow-lg shadow-rose-500/20">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {mode === 'signup' && 'Create your account'}
            {mode === 'signin' && 'Welcome back'}
            {mode === 'forgot' && 'Reset your password'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {mode === 'signup' && 'Private, consented connection for your relationship.'}
            {mode === 'signin' && 'Sign in to access your couple space and check-ins.'}
            {mode === 'forgot' && "Enter your email to receive recovery instructions."}
          </p>
        </div>

        {/* Feedback messages */}
        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Dedicated Authorized Domain Guidance Card */}
        {unauthorizedDomain && (
          <div className="p-4 mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-3 animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <Globe className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-200">Domain Authorization Required for Google Auth</h4>
                <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                  Firebase protects Google OAuth by only allowing registered domains. Please whitelist this applet's URL in your Firebase Console:
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-white/10 flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-amber-300 break-all select-all font-semibold">
                {unauthorizedDomain}
              </span>
              <button
                type="button"
                onClick={handleCopyDomain}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-semibold flex items-center gap-1 transition-all border border-amber-500/30"
              >
                {copiedDomain ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedDomain ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="text-[11px] space-y-1.5 text-zinc-300">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px]">1</span>
                <span>Open Firebase Console &gt; <strong>Authentication</strong> &gt; <strong>Settings</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px]">2</span>
                <span>Under <strong>Authorized domains</strong>, click <strong>Add domain</strong> and paste.</span>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between border-t border-amber-500/20">
              <a
                href={firebaseAuthSettingsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-semibold underline"
              >
                <span>Open Firebase Console Settings</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <span className="text-[10px] text-zinc-400 italic">
                Or sign up below with Email
              </span>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Google sign-in button */}
        {mode !== 'forgot' && (
          <div className="mb-5">
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full py-3 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-sm font-medium border border-white/10 flex items-center justify-center gap-3 transition-all active:scale-[0.99] cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center my-4">
              <div className="flex-1 h-[1px] bg-white/10" />
              <span className="px-3 text-[11px] uppercase tracking-wider text-zinc-400">or</span>
              <div className="flex-1 h-[1px] bg-white/10" />
            </div>
          </div>
        )}

        {/* Email form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Your Name</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-400 focus:outline-none focus:border-rose-500/70"
                />
                <User className="w-4 h-4 text-zinc-400 absolute right-3.5 top-3" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-400 focus:outline-none focus:border-rose-500/70"
              />
              <Mail className="w-4 h-4 text-zinc-400 absolute right-3.5 top-3" />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-zinc-300">Password</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-400 focus:outline-none focus:border-rose-500/70"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-zinc-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white font-medium text-sm shadow-lg shadow-rose-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{mode === 'signup' ? 'Create Account' : mode === 'signin' ? 'Sign In' : 'Send Reset Link'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Mode switch links */}
        <div className="mt-5 text-center text-xs text-zinc-400">
          {mode === 'signup' && (
            <p>
              Already have an account?{' '}
              <button onClick={() => setMode('signin')} className="text-rose-400 hover:underline font-medium cursor-pointer">
                Sign in
              </button>
            </p>
          )}
          {mode === 'signin' && (
            <p>
              New to TRUSTLY?{' '}
              <button onClick={() => setMode('signup')} className="text-rose-400 hover:underline font-medium cursor-pointer">
                Create an account
              </button>
            </p>
          )}
          {mode === 'forgot' && (
            <p>
              Remembered your password?{' '}
              <button onClick={() => setMode('signin')} className="text-rose-400 hover:underline font-medium cursor-pointer">
                Back to sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
