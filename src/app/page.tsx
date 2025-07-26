'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/src/components/SessionProvider';

export default function LandingPage() {
  const [feedCode, setFeedCode] = useState('');
  const router = useRouter();
  const { session, loading } = useSession();

  const handleJoin = () => {
    if (feedCode.trim()) {
      router.push(`/feed/${feedCode.trim()}`);
    } else {
      alert('Please enter a feed code');
    }
  };

  const handleCreate = async () => {
    if (loading) {
      // Still loading session, wait
      return;
    }

    if (session) {
      // User is logged in, check if they have a finalized username
      try {
        const { createClientComponentClient } = await import('@supabase/auth-helpers-nextjs');
        const supabase = createClientComponentClient();
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, alias_finalized')
          .eq('id', session.user.id)
          .single();

        if (profile?.username && profile?.alias_finalized && !profile.username.startsWith('user_')) {
          // User has finalized username, go directly to create details
          router.push('/create/details');
        } else {
          // User needs username setup first
          router.push('/create/username?redirect=/create/details');
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        // Fallback to username setup
        router.push('/create/username?redirect=/create/details');
      }
    } else {
      // User is not logged in, go to email verification
      router.push('/create?redirect=/create/details');
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-b from-[#0F0C1D] to-[#1B1432] px-6 pt-20 text-white font-sans">
      {/* Logo */}
      <div className="text-center mb-14">
        <h1 className="text-4xl font-extrabold tracking-tight">
          pop<span className="text-purple-500">feed</span>
        </h1>
        <p className="mt-2 text-sm text-gray-400 font-medium">
          join the after-party
        </p>
      </div>

      {/* Join a Feed */}
      <section className="w-full max-w-md mb-10">
        <h2 className="text-lg font-semibold mb-4">Join a Feed</h2>

        <div className="bg-[#1F1A2E] rounded-xl p-4 shadow-lg space-y-4">
          <div className="flex items-center rounded-md bg-[#0F0C1D] border border-gray-700 px-3 py-2">
            <input
              type="text"
              placeholder="Enter feed code"
              value={feedCode}
              onChange={(e) => setFeedCode(e.target.value)}
              className="flex-grow bg-transparent text-white placeholder-gray-500 focus:outline-none"
            />
            <button
              onClick={handleJoin}
              className="ml-2 bg-purple-600 hover:bg-purple-500 rounded-md p-2 text-white"
            >
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>

          <button
            onClick={() => alert('QR code scan coming soon!')}
            className="flex items-center justify-center text-sm text-gray-300 hover:text-white w-full gap-2"
          >
            <div className="flex justify-center items-center gap-2 text-white text-sm mt-4">
  <span className="material-symbols-outlined text-lg">qr_code</span>
  <span>Scan QR Code</span>
</div>
          </button>
        </div>
      </section>

      {/* Create a Feed */}
      <section className="w-full max-w-md text-center">
        <h2 className="text-lg font-semibold mb-4">Create a Feed</h2>

        <button
          onClick={handleCreate}
          className="w-full bg-[#FF7A58] hover:bg-[#ff6a44] text-white font-medium py-3 rounded-xl text-base shadow-lg transition duration-200"
        >
          Start a New Feed →
        </button>

        <p className="text-sm text-gray-400 mt-2">Create your own vibe for an event</p>
      </section>
    </main>
  );
}
