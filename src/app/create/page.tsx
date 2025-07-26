'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/src/components/SessionProvider'

export default function CreatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/feed'
  const { session, loading: sessionLoading } = useSession()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  // If user is already authenticated, redirect them appropriately
  useEffect(() => {
    if (!sessionLoading && session) {
      // For authenticated users, redirect based on the redirect parameter
      if (redirect === '/create/details') {
        // User wants to create a feed, check if they have username
        const checkProfile = async () => {
          try {
            const { createClientComponentClient } = await import('@supabase/auth-helpers-nextjs');
            const supabase = createClientComponentClient();
            
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, alias_finalized')
              .eq('id', session.user.id)
              .single();

            if (profile?.username && profile?.alias_finalized && !profile.username.startsWith('user_')) {
              // User has finalized username, go to create details
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
        };

        checkProfile();
      } else {
        // Default redirect to feed
        router.push(redirect);
      }
    }
  }, [session, sessionLoading, redirect, router])

  const sendOtp = async () => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email.')
      return
    }

    setLoading(true)

    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const result = await res.json()
    setLoading(false)

    if (!res.ok) {
      alert(result.error || 'Failed to send OTP.')
    } else {
      localStorage.setItem('otp-email', email)
      router.push(`/create/verify?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirect)}`)
    }
  }

  // Show loading state while checking session
  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-[#0d0b1f] text-white flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col justify-center items-center px-6 bg-gradient-to-b from-[#0f0c29] via-[#302b63] to-[#24243e] text-white">
      <button onClick={() => router.push('/')} className="self-start text-sm text-purple-300 mb-6">← Back to Home</button>

      <h1 className="text-3xl font-bold mb-2">
        <span className="text-white">pop</span><span className="text-purple-400">feed</span>
      </h1>
      <h2 className="text-lg font-semibold mt-4">Join the after-party</h2>
      <p className="text-sm text-gray-400 mb-6">Enter your email to get started</p>

      <div className="w-full max-w-xs">
        <input
          className="w-full p-3 mb-4 rounded bg-gray-800 text-white placeholder-gray-400"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
        />

        <button
          onClick={sendOtp}
          disabled={loading}
          className={`mt-2 w-full rounded-md px-4 py-2 font-medium transition ${
            loading ? 'bg-purple-900 cursor-not-allowed opacity-50' : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {loading ? 'Sending...' : 'Continue'}
        </button>
      </div>
    </main>
  )
}
