'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithGithub: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Check if an error is related to invalid/expired refresh token
 */
function isRefreshTokenError(error: AuthError | Error | null): boolean {
  if (!error) return false;
  const message = error.message?.toLowerCase() || '';
  return (
    message.includes('refresh token') ||
    message.includes('invalid token') ||
    message.includes('token expired') ||
    message.includes('jwt expired') ||
    message.includes('session not found')
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Clear local auth state and sign out
   * Used when refresh token is invalid or expired
   */
  const clearAuthState = useCallback(async () => {
    setSession(null);
    setUser(null);
    // Try to sign out from Supabase to clear any stale tokens
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Ignore errors during cleanup
    }
  }, []);

  useEffect(() => {
    // Get initial session with proper error handling
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          // Handle refresh token errors gracefully
          if (isRefreshTokenError(error)) {
            console.warn('Session expired or invalid, clearing auth state');
            await clearAuthState();
          } else {
            console.error('Error getting session:', error.message);
          }
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      } catch (error) {
        console.error('Unexpected error getting session:', error);
        setLoading(false);
      }
    };

    initSession();

    // Listen for auth changes with improved error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Handle specific auth events
        switch (event) {
          case 'SIGNED_OUT':
            // Clear state on sign out
            setSession(null);
            setUser(null);
            break;
          case 'TOKEN_REFRESHED':
            // Token successfully refreshed
            setSession(session);
            setUser(session?.user ?? null);
            break;
          case 'SIGNED_IN':
          case 'USER_UPDATED':
          case 'INITIAL_SESSION':
          case 'PASSWORD_RECOVERY':
          case 'MFA_CHALLENGE_VERIFIED':
            // Normal session updates
            setSession(session);
            setUser(session?.user ?? null);
            break;
          default:
            // For any other events, update state if session exists
            setSession(session);
            setUser(session?.user ?? null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [clearAuthState]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    // Clear local state first for immediate UI update
    setSession(null);
    setUser(null);
    // Then sign out from Supabase
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Ignore errors during sign out - state is already cleared
      console.warn('Error during sign out:', error);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithGithub = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithGithub,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
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
