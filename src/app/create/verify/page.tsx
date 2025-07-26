'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function generateTempAlias(userId: string) {
  const suffix = userId?.slice(0, 6) || Math.random().toString(36).substring(2, 8);
  return `user_${suffix}`;
}

export default function VerifyOTP() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const redirect = searchParams.get('redirect') || '/feed';
  const [code, setCode] = useState(Array(6).fill(''));
  const [resendTimer, setResendTimer] = useState(30);
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (value: string, index: number) => {
    if (/^\d$/.test(value) || value === '') {
      const updated = [...code];
      updated[index] = value;
      setCode(updated);
      if (value !== '' && index < 5) {
        const next = document.getElementById(`otp-${index + 1}`);
        if (next) (next as HTMLInputElement).focus();
      }
    }
  };

  const handleVerify = async () => {
    const otp = code.join('');
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: otp }),
      });
  
      const result = await res.json();
  
      if (!res.ok || !result.success || !result.session) {
        alert(result.error || 'Verification failed. Please try again.');
        return;
      }
  
      const { supabase } = await import('@/lib/supabaseClient');
  
      // Check if profile already exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('username, alias_finalized')
        .eq('id', result.session.user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('⚠️ Error fetching existing profile:', fetchError.message);
      }

      // Only create temporary profile if no profile exists or if it's not finalized
      if (!existingProfile || !existingProfile.alias_finalized) {
        const tempAlias = generateTempAlias(result.session.user.id);
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({ 
            id: result.session.user.id, 
            username: tempAlias,
            alias_finalized: false 
          }, { 
            onConflict: 'id' 
          });

        if (profileError) {
          console.error('⚠️ Failed to create profile:', profileError.message);
        }
      }

      // Wait a moment for the session to be properly established
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('🔍 Verify OTP - Session established:', {
        userId: result.session.user.id,
        redirect: redirect
      });

      // The session will be automatically handled by the SessionProvider
      // Redirect based on profile status
      if (existingProfile && existingProfile.alias_finalized && !existingProfile.username.startsWith('user_')) {
        // User has a finalized username, redirect to feed
        console.log('✅ Redirecting to feed:', redirect);
        window.location.href = redirect;
      } else {
        // User needs to set username, redirect to username setup
        console.log('✅ Redirecting to username setup');
        window.location.href = `/create/username?redirect=${encodeURIComponent(redirect)}`;
      }
  
    } catch (err: any) {
      alert(err.message || 'Something went wrong during verification');
    }
  };
  

  const handleResend = async () => {
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (res.ok) setResendTimer(30);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0c29] to-[#302b63] text-white flex flex-col justify-center items-center px-6">
      <h1 className="text-4xl font-bold mb-2">
        pop <span className="text-purple-400">feed</span>
      </h1>
      <p className="text-sm mb-8">join the after-party</p>

      <div className="w-full max-w-sm bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-2">OTP Verification</h2>
        <p className="text-sm text-gray-300 mb-4">
          We’ve sent a verification code to <span>{email}</span>
        </p>

        <div className="flex justify-between mb-4">
          {code.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              className="w-12 h-12 text-center text-lg rounded-md bg-gray-700 border border-gray-500 focus:outline-none"
            />
          ))}
        </div>

        {resendTimer > 0 ? (
          <p className="text-xs text-center text-gray-400 mb-4">
            Resend code in {resendTimer}s
          </p>
        ) : (
          <button onClick={handleResend} className="text-purple-400 text-xs mb-4">
            Resend Code
          </button>
        )}

        <button
          onClick={handleVerify}
          disabled={code.join('').length !== 6}
          className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 rounded-lg transition"
        >
          Verify
        </button>
      </div>
    </div>
  );
}
