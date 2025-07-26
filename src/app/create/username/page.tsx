'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useSession } from '@/src/components/SessionProvider';

const supabase = createClientComponentClient();

export default function UsernamePage() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [userReady, setUserReady] = useState(false);
  const [sessionFailed, setSessionFailed] = useState(false);

  const router = useRouter();
  const redirect = useSearchParams().get('redirect') || '/feed';
  const { user, loading: sessionLoading, signOut } = useSession();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        if (!sessionLoading) {
          setSessionFailed(true);
        }
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('username, alias_finalized')
          .eq('id', user.id)
          .single();

        console.log('Fetched profile:', profile, 'Error:', error, 'User:', user?.id);

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Error fetching profile:', error.message);
          setSessionFailed(true);
          return;
        }

        // If profile exists and username is finalized, redirect
        if (profile?.username && profile?.alias_finalized && !profile.username.startsWith('user_')) {
          router.push(redirect);
          return;
        }

        // If profile exists but username is temporary, clear it for new input
        if (profile?.username && profile.username.startsWith('user_')) {
          setUsername(''); // Clear any temporary username
        }

        setUserReady(true);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setSessionFailed(true);
      }
    };

    console.log('Session user:', user);
    fetchProfile();
  }, [user, sessionLoading, router, redirect]);

  const isValidUsername = (name: string) => /^[a-zA-Z0-9_]{3,20}$/.test(name);

  const saveUsername = async () => {
    if (!user?.id || !username.trim()) {
      alert('Please enter a valid username.');
      return;
    }

    if (!isValidUsername(username)) {
      alert('Username must be 3–20 characters long, alphanumeric or underscore only.');
      return;
    }

    setLoading(true);

    // Check if username is already taken by another user
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.trim())
      .neq('id', user.id) // Exclude current user
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking username:', checkError.message);
    }

    if (existingUser) {
      setLoading(false);
      alert('⚠️ Username is already taken. Please choose a different one.');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        id: user.id, 
        username: username.trim(),
        alias_finalized: true 
      }, { 
        onConflict: 'id' 
      });

    // Add delay and refetch profile before redirect
    await new Promise(res => setTimeout(res, 1000));
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, alias_finalized')
      .eq('id', user.id)
      .single();
    console.log('After upsert, refetched profile:', profile);

    setLoading(false);

    if (!error && profile?.username && profile?.alias_finalized) {
      // Use full page reload to clear any stale session/profile cache
      window.location.href = redirect;
    } else if (!error) {
      // If profile not ready, show error or retry
      alert('Profile not ready yet. Please try again.');
    } else {
      console.error('❌ Failed to save username:', error.message);
      // Check if it's a unique constraint violation
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        alert('⚠️ Username is already taken. Please choose a different one.');
      } else {
        alert('⚠️ Failed to save username. Try again.');
      }
    }
  };

  // UI while loading session
  if (!userReady && !sessionFailed) {
    return (
      <div className="min-h-screen bg-[#0d0b1f] text-white flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
        <p className="text-gray-400 text-sm">Loading session...</p>
      </div>
    );
  }

  // UI if session failed
  if (sessionFailed) {
    return (
      <div className="min-h-screen bg-black text-white flex justify-center items-center px-4 text-center">
        <div>
          <p className="text-red-400 text-sm mb-4">
            Couldn’t load your session. Try verifying again.
          </p>
          <button
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded"
            onClick={() => router.replace('/create')}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Main UI
  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-6">
      <div className="absolute top-6 right-6">
        <button
          onClick={signOut}
          className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Sign out
        </button>
      </div>
      <h1 className="text-3xl font-bold mb-4">
        Welcome to <span className="text-purple-400">Popfeed</span>
      </h1>
      <p className="text-sm text-gray-400 mb-6">Pick a username to start posting</p>

      <div className="w-full max-w-xs">
        <input
          className="w-full p-3 mb-4 rounded bg-gray-800 text-white placeholder-gray-400"
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <button
          onClick={saveUsername}
          disabled={!username.trim() || loading}
          className={`mt-2 w-full rounded-md px-4 py-2 font-medium transition ${
            !username.trim() || loading
              ? 'bg-purple-900 cursor-not-allowed opacity-50'
              : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {loading ? 'Saving...' : 'Continue'}
        </button>

        <p className="text-xs mt-2 text-gray-500">
          Use 3–20 characters. Only letters, numbers, and underscores allowed.
        </p>
      </div>
    </div>
  );
}
