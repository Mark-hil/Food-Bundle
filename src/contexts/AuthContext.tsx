import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';
import { AuthChangeEvent } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isRecoveringPassword: boolean;
  signUp: (email: string, password: string, fullName: string, phone?: string, studentId?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; role?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearRecovery: () => void;
  isAdmin: boolean;
  isDriver: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
      (async () => {
        // When the user clicks the reset link in their email, Supabase fires
        // PASSWORD_RECOVERY. We must NOT treat this as a normal login — instead
        // set a flag and redirect to the reset password page.
        if (event === 'PASSWORD_RECOVERY') {
          setUser(session?.user ?? null);
          setIsRecoveringPassword(true);
          setLoading(false);
          // Push the path without a full reload so our custom router picks it up
          window.history.replaceState({}, '', '/reset-password');
          window.dispatchEvent(new PopStateEvent('popstate'));
          return;
        }

        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setIsRecoveringPassword(false);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string, studentId?: string) => {
    try {
      if (studentId) {
        const { data: exists, error: checkError } = await supabase.rpc('check_student_id_exists', {
          p_student_id: studentId
        });
        if (checkError) throw checkError;
        if (exists) {
          throw new Error('This Student ID is already registered.');
        }
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            student_id: studentId || undefined,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user returned from signup');

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Fetch profile to get role for unified routing
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();
        
      return { error: null, role: profileData?.role };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    setIsRecoveringPassword(false);
    await supabase.auth.signOut();
  };

  // Called by ResetPassword page after successfully updating the password
  const clearRecovery = () => {
    setIsRecoveringPassword(false);
  };

  const isAdmin = profile?.role === 'admin';
  const isDriver = profile?.role === 'driver';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isRecoveringPassword, signUp, signIn, signOut, refreshProfile, clearRecovery, isAdmin, isDriver }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
