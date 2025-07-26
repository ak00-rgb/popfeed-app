'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from '@/src/components/SessionProvider'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

function VerifyPageContent() {
  const searchParams = useSearchParams()
  const { session, loading: sessionLoading } = useSession()
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [verificationComplete, setVerificationComplete] = useState(false)

  useEffect(() => {
    const emailParam = searchParams.get('email')
    const tokenParam = searchParams.get('token')
    const redirectParam = searchParams.get('redirect')
    
    if (emailParam) setEmail(emailParam)
    if (tokenParam) setToken(tokenParam)
    
    // Debug: Log the redirect URL
    console.log('Verify page - redirect URL:', redirectParam)
  }, [searchParams])

  // Wait for session to be established after verification
  useEffect(() => {
    if (verificationComplete && !sessionLoading && session) {
      const redirect = searchParams.get('redirect') || '/feed'
      console.log('Verify page - redirecting to username setup with redirect:', redirect)
      // Force a page reload to ensure session is properly established
      window.location.href = `/create/username?redirect=${encodeURIComponent(redirect)}`
    }
  }, [verificationComplete, sessionLoading, session, searchParams])

  const handleVerify = async () => {
    if (!email || !token) {
      setError('Email and token are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, token }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setVerificationComplete(true)
        
        // Force session refresh
        const supabase = createClientComponentClient()
        await supabase.auth.refreshSession()
        
        // Don't redirect here - let the useEffect handle it when session is established
      } else {
        setError(data.error || 'Verification failed')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) {
      setError('Email is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setError('')
      } else {
        setError(data.error || 'Failed to send OTP')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0b1f] text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-[#1e1b30] rounded-xl p-8">
        <h1 className="text-2xl font-bold text-center mb-8">Verify Your Email</h1>
        
        {success ? (
          <div className="text-center">
            <div className="text-green-400 text-lg mb-4">✓ Verification successful!</div>
            <div className="text-gray-400">
              Setting up your account...
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#19162b] border border-zinc-700 text-white px-3 py-2 rounded-md"
                  placeholder="Enter your email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full bg-[#19162b] border border-zinc-700 text-white px-3 py-2 rounded-md"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm mb-4 text-center">{error}</div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleVerify}
                disabled={loading || !email || !token}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-2 px-4 rounded-md transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>
              
              <button
                onClick={handleResend}
                disabled={loading || !email}
                className="w-full bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white py-2 px-4 rounded-md transition-colors"
              >
                {loading ? 'Sending...' : 'Resend Code'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0d0b1f] text-white flex items-center justify-center px-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    }>
      <VerifyPageContent />
    </Suspense>
  )
}
