/**
 * =============================================================================
 * Auth Context: auth-context.tsx
 * =============================================================================
 *
 * PURPOSE:
 *   จัดการ authentication state ทั้งหมดของ app
 *   - Login (email/password) ผ่าน Supabase Auth
 *   - Signup (สร้าง account ใหม่ + auto sign-in)
 *   - Logout
 *   - โหลด user profile จาก user_profiles table
 *   - ตรวจ admin role
 *
 * HOW IT WORKS:
 *   1. AuthProvider ครอบ app ทั้งหมด (ใน app/layout.tsx)
 *   2. ใช้ supabase.auth.getSession() ตอน mount เพื่อเช็ค session เดิม
 *   3. ใช้ onAuthStateChange() ฟัง login/logout events
 *   4. เมื่อ user login -> ดึง user_profiles + อัปเดต last_login_at
 *   5. Component ใดก็ตามเรียก useAuth() เพื่อดู user, profile, isAdmin
 *
 * CONNECTED FILES:
 *   - Supabase client:  lib/supabase.ts
 *   - DB tables:        auth.users (Supabase built-in), user_profiles
 *   - DB trigger:       on_auth_user_created (auto-creates profile on signup)
 *   - UI consumers:     features/auth/login-page.tsx (login form)
 *                        features/auth/user-management.tsx (admin panel)
 *                        features/dashboard/dashboard-layout.tsx (nav bar)
 *                        features/papers/paper-tracker.tsx (check isAdmin)
 *
 * PYTHON INTEGRATION:
 *   Python ใช้ Supabase Auth เดียวกัน:
 *   ```python
 *   from supabase import create_client
 *   supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
 *   auth = supabase.auth.sign_in_with_password({"email": "...", "password": "..."})
 *   jwt_token = auth.session.access_token  # ใช้เรียก Edge Functions
 *   ```
 * =============================================================================
 */

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

/** Profile จาก user_profiles table (auto-created by DB trigger on signup) */
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'editor' | 'viewer';
  avatar_url: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isAdmin: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

/** ดึง user profile จาก user_profiles table (uses RLS: users read own data) */
async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  return data as UserProfile | null;
}

/**
 * AuthProvider - ครอบ app ทั้งหมดเพื่อให้ทุก component เข้าถึง auth state ได้
 * ใช้ใน: app/layout.tsx
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const p = await fetchProfile(userId);
    setProfile(p);
    if (p) {
      supabase
        .from('user_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId)
        .then(() => {});
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user.id).then(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        (async () => {
          await loadProfile(s.user.id);
        })();
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: 'Signup failed. Please try again.' };

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) return { error: signInError.message };

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isAdmin: profile?.role === 'admin',
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
