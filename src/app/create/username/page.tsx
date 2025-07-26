'use client'

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useSession } from '@/src/components/SessionProvider';

function UsernamePageContent() {
  const router = useRouter();
  const redirect = useSearchParams().get('redirect') || '/feed';
  const supabase = createClientComponentClient();
  const { user } = useSession();

  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [needsUsername, setNeedsUsername] = useState(false);

  useEffect(() => {
    const checkProfileStatus = async () => {
      if (!user?.id) {
        router.push('/create');
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, alias_finalized')
          .eq('id', user.id)
          .single();

        if (profile && profile.alias_finalized && !profile.username.startsWith('user_')) {
          // User already has a proper username, redirect to intended destination
          window.location.href = redirect;
          return;
        }

        setNeedsUsername(true);
      } catch (error) {
        console.error('Error checking profile:', error);
        setNeedsUsername(true);
      } finally {
        setCheckingProfile(false);
      }
    };

    checkProfileStatus();
  }, [user, router, supabase, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    if (!user?.id) {
      setError('User not found');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: username.trim().toLowerCase(),
          alias_finalized: true
        }, {
          onConflict: 'id'
        });

      if (error) {
        if (error.code === '23505') {
          setError('Username already taken');
        } else {
          setError('Failed to save username');
        }
        return;
      }

      // Add a small delay to ensure the database update is processed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Redirect after successful username setup
      // Use window.location to force a full page reload and ensure session is properly established
      window.location.href = redirect;
    } catch {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (checkingProfile) {
    return (
      <div className="min-h-screen bg-[#0d0b1f] text-white flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
        <p className="text-gray-400 text-sm">Checking your profile...</p>
      </div>
    );
  }

  if (!user?.id) {
    return (
      <div className="min-h-screen bg-[#0d0b1f] text-white flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (!needsUsername) {
    return (
      <div className="min-h-screen bg-[#0d0b1f] text-white flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
        <p className="text-gray-400 text-sm">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0b1f] text-white flex flex-col justify-center items-center px-6">
      <button onClick={() => router.push('/')} className="self-start text-sm text-purple-300 mb-6">← Back to Home</button>
      
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2">
          <span className="text-white">pop</span><span className="text-purple-400">feed</span>
        </h1>
        <h2 className="text-xl font-semibold text-center mb-8">Choose your username</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 transition-colors"
              placeholder="Enter your username"
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              title="Username can only contain letters, numbers, and underscores"
            />
            <p className="text-xs text-gray-500 mt-1">
              Letters, numbers, and underscores only. 3-20 characters.
            </p>
          </div>
          
          {error && (
            <div className="text-red-400 text-sm text-center">{error}</div>
          )}
          
          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function UsernamePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0d0b1f] text-white flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    }>
      <UsernamePageContent />
    </Suspense>
  );
}
