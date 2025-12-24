'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Suspense } from 'react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check for error in URL params (OAuth error)
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (errorParam) {
          console.error('OAuth error:', errorParam, errorDescription);
          setError(errorDescription || errorParam);
          setTimeout(() => router.push('/login?error=auth_failed'), 2000);
          return;
        }

        // Get the authorization code from URL if using PKCE flow
        const code = searchParams.get('code');
        
        if (code) {
          // Exchange the code for a session
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError);
            setError(exchangeError.message);
            setTimeout(() => router.push('/login?error=auth_failed'), 2000);
            return;
          }
        } else {
          // No code, try to get existing session (might be implicit flow or returning user)
          const { error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Auth callback error:', sessionError);
            setError(sessionError.message);
            setTimeout(() => router.push('/login?error=auth_failed'), 2000);
            return;
          }
        }
        
        // Success - redirect to home page
        router.push('/');
      } catch (err) {
        console.error('Unexpected auth callback error:', err);
        setError('An unexpected error occurred');
        setTimeout(() => router.push('/login?error=auth_failed'), 2000);
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {error ? (
          <>
            <div className="text-destructive text-sm text-center max-w-md">
              {error}
            </div>
            <p className="text-muted-foreground text-sm">Redirecting to login...</p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground text-sm">Completing sign in...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
