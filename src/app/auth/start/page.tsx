'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StartAuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const handleSendOtp = async () => {
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      router.push(`/auth/verify?email=${email}`);
    } else {
      alert('Failed to send OTP');
    }
  };

  return (
    <div className="p-4 text-white">
      <h1 className="text-xl font-bold mb-2">Enter your email</h1>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="p-2 rounded bg-gray-800 border border-gray-600 w-full"
      />
      <button
        onClick={handleSendOtp}
        className="mt-4 bg-orange-500 px-4 py-2 rounded"
      >
        Send OTP
      </button>
    </div>
  );
}
