'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

function generateTempAlias(userId: string) {
  const suffix = userId?.slice(0, 6) || Math.random().toString(36).substring(2, 8);
  return `user_${suffix}`;
}

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const tokenParam = searchParams.get('token');
    
    if (emailParam) setEmail(emailParam);
    if (tokenParam) setToken(tokenParam);
  }, [searchParams]);

  const handleVerify = async () => {
    if (!email || !token) {
      setError('Email and token are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, token }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Redirect to username setup after a short delay
        setTimeout(() => {
          const redirect = searchParams.get('redirect') || '/';
          router.push(`/create/username?redirect=${encodeURIComponent(redirect)}`);
        }, 2000);
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setError('');
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0b1f] text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-[#1e1b30] rounded-xl p-8">
        <h1 className="text-2xl font-bold text-center mb-8">Verify Your Email</h1>
        
        {success ? (
          <div className="text-center">
            <div className="text-green-400 text-lg mb-4">✓ Verification successful!</div>
            <div className="text-gray-400">Redirecting to username setup...</div>
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
  );
}
