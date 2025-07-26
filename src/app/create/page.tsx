'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/src/components/SessionProvider'

function CreatePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/feed'
  const { session, loading: sessionLoading } = useSession()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingProfile, setCheckingProfile] = useState(false)

  // If user is already authenticated, redirect them appropriately
  useEffect(() => {
    if (!sessionLoading && session) {
      // Debug: Log the redirect attempt
      console.log('Create page - user authenticated, checking profile. Redirect:', redirect)
      
      // Check if user is coming from the verify page (in the middle of auth flow)
      const referrer = document.referrer;
      const isFromVerifyPage = referrer.includes('/create/verify');
      const isFromUsernamePage = referrer.includes('/create/username');
      
      if (isFromVerifyPage || isFromUsernamePage) {
        console.log('Create page - user coming from auth flow, skipping redirect to avoid conflicts')
        return;
      }
      
      // Check if we're in the middle of the auth flow by looking at localStorage
      const otpEmail = localStorage.getItem('otp-email');
      const authFlowInProgress = localStorage.getItem('auth-flow-in-progress');
      
      if (otpEmail || authFlowInProgress) {
        console.log('Create page - user has OTP email or auth flow in progress, likely in auth flow, skipping redirect')
        return;
      }
      
      // Check if user is coming from username page by looking at sessionStorage
      const fromUsernamePage = sessionStorage.getItem('from-username-page');
      if (fromUsernamePage) {
        console.log('Create page - user coming from username page, skipping redirect')
        sessionStorage.removeItem('from-username-page');
        return;
      }
      
      setCheckingProfile(true);
      // For authenticated users, check their profile status
      const checkProfileAndRedirect = async () => {
        try {
          const { createClientComponentClient } = await import('@supabase/auth-helpers-nextjs');
          const supabase = createClientComponentClient();
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, alias_finalized')
            .eq('id', session.user.id)
            .single();

          if (!profile) {
            // No profile exists, go to username setup
            console.log('Create page - no profile, redirecting to username setup with:', redirect)
            router.push(`/create/username?redirect=${encodeURIComponent(redirect)}`);
            return;
          }

          if (!profile.alias_finalized || profile.username.startsWith('user_')) {
            // User needs to complete username setup
            console.log('Create page - user needs username setup, redirecting with:', redirect)
            router.push(`/create/username?redirect=${encodeURIComponent(redirect)}`);
            return;
          }

          // User has completed setup, redirect to intended destination
          console.log('Create page - user has username, redirecting to:', redirect)
          if (redirect === '/create/details') {
            router.push('/create/details');
          } else {
            router.push(redirect);
          }
        } catch (error) {
          console.error('Error checking profile:', error);
          // Fallback to username setup
          console.log('Create page - error, fallback redirect to username setup with:', redirect)
          router.push(`/create/username?redirect=${encodeURIComponent(redirect)}`);
        } finally {
          setCheckingProfile(false);
        }
      };

      checkProfileAndRedirect();
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

  // Show loading state while checking session or profile
  if (sessionLoading || checkingProfile) {
    return (
      <div className="min-h-screen bg-[#0d0b1f] text-white flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
        <p className="text-gray-400 text-sm">
          {sessionLoading ? 'Loading...' : 'Checking your profile...'}
        </p>
      </div>
    );
  }

  // If user is authenticated and profile check is complete, show loading while redirecting
  if (session && !checkingProfile) {
    return (
      <div className="min-h-screen bg-[#0d0b1f] text-white flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
        <p className="text-gray-400 text-sm">Redirecting...</p>
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
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 transition-colors"
          onKeyPress={(e) => e.key === 'Enter' && sendOtp()}
        />
        <button
          onClick={sendOtp}
          disabled={loading || !email}
          className="w-full mt-4 px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
        >
          {loading ? 'Sending...' : 'Continue'}
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-6 text-center">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>
    </main>
  )
}

export default function CreatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0d0b1f] text-white flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    }>
      <CreatePageContent />
    </Suspense>
  )
}
