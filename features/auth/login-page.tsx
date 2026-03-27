'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical,
  Mail,
  Lock,
  Loader as Loader2,
  TriangleAlert as AlertTriangle,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  User,
  CircleCheck as CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useFarmStore } from '@/store/farm-store';
import { useI18n } from '@/lib/i18n/i18n-context';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const { setViewMode } = useFarmStore();
  const { t, locale } = useI18n();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setError(null);
    setSignupSuccess(false);
  };

  const switchMode = (next: 'signin' | 'signup') => {
    resetForm();
    setMode(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (mode === 'signup' && !fullName) return;

    setLoading(true);
    setError(null);

    if (mode === 'signin') {
      const { error: err } = await signIn(email, password);
      if (err) {
        if (err.includes('Email not confirmed')) {
          setError(locale === 'th' ? 'กรุณายืนยันอีเมล เราเตรียมลิงก์ไว้ให้แล้วในอีเมลของคุณครับ' : 'Please verify your email. A confirmation link has been sent.');
        } else {
          setError(err);
        }
      }
    } else {
      const { error: err } = await signUp(email, password, fullName);
      if (err && !err.includes('Email not confirmed')) {
        setError(err);
      } else {
        setSignupSuccess(true);
      }
    }

    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}`,
      },
    });
    if (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center px-4 py-8 min-h-[calc(100vh-80px)]">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-md"
      >
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-border/30 to-transparent" />
        <div className="relative rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl overflow-hidden">
          <div className="p-8 pb-6 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex"
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <FlaskConical size={24} className="text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-[3px] border-card animate-pulse" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-5"
            >
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                {mode === 'signin' ? t.auth.welcomeBack : t.auth.createAccount}
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                {mode === 'signin' ? t.auth.signInSubtitle : t.auth.signUpSubtitle}
              </p>
            </motion.div>
          </div>

          {signupSuccess ? (
            <div className="px-8 pb-8 space-y-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-3 py-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle size={24} className="text-emerald-400" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{t.auth.accountCreated}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t.auth.accountCreatedDesc}
                </p>
              </motion.div>
              <button
                onClick={() => switchMode('signin')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-lg shadow-cyan-500/15 hover:shadow-cyan-500/25 active:scale-[0.98]"
              >
                <span>{t.auth.goToSignIn}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
              <AnimatePresence mode="wait">
                {mode === 'signup' && (
                  <motion.div
                    key="name"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t.auth.fullName}</label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t.auth.fullNamePlaceholder}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/60 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                        autoComplete="name"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t.auth.email}</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.auth.emailPlaceholder}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/60 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t.auth.password}</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? t.auth.minChars : t.auth.passwordPlaceholder}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-secondary/60 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 p-3 rounded-xl text-xs bg-red-500/10 border border-red-500/20 text-red-400"
                  >
                    <AlertTriangle size={14} />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading || !email || !password || (mode === 'signup' && !fullName)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-lg shadow-cyan-500/15 hover:shadow-cyan-500/25 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{mode === 'signin' ? t.auth.signingIn : t.auth.creatingAccount}</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'signin' ? t.auth.signInBtn : t.auth.createAccountBtn}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="relative my-6 pt-2">
                <div className="absolute inset-0 flex items-center pt-2">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider pt-2">
                  <span className="bg-card/95 px-2 text-muted-foreground">
                    {t.header?.farmbase === 'ฟาร์มเบส' ? 'หรือเข้าสู่ระบบด้วย' : 'Or continue with'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all border border-border bg-card hover:bg-secondary text-foreground active:scale-[0.98]"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Google</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                  className="text-xs text-muted-foreground hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >
                  {mode === 'signin' ? t.auth.noAccount : t.auth.hasAccount}
                </button>
              </div>
            </form>
          )}
        </div>

        <button
          onClick={() => setViewMode('marketplace')}
          className="flex items-center gap-1.5 mx-auto mt-5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          <ArrowLeft size={13} />
          <span>{t.auth.backToMarketplace}</span>
        </button>
      </motion.div>
    </div>
  );
}
