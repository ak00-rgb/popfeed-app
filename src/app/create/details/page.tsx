'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/src/components/SessionProvider';

export default function CreateDetailsPage() {
  const router = useRouter();
  const { user, loading, signOut } = useSession();
  const [eventName, setEventName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [timezone, setTimezone] = useState('GMT-04:00 New York');
  const [location, setLocation] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🔍 Create Details - Submitting form with user:', user?.id);

    const payload = {
      eventName,
      startDate,
      startTime,
      timezone,
      location,
      isPrivate,
    };

    // Add a small delay to ensure session is properly established
    await new Promise(resolve => setTimeout(resolve, 500));

    const res = await fetch('/api/create-feed', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.ok) {
        const { code } = await res.json(); // assuming your API returns { code }
        router.push(`/create/success/${code}`)
    } else {
      const errorData = await res.json();
      alert('Error creating feed: ' + errorData.error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0b1f] text-white flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
        <p className="text-gray-400 text-sm">Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0F0C1D] text-white">
        <div className="bg-[#1B1432] p-6 rounded-xl shadow-md">
          <h1 className="text-xl font-semibold mb-2">Create your feed</h1>
          <p className="text-red-500">User not authenticated</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0F0C1D] to-[#1B1432] p-4 relative">
      <div className="absolute top-6 right-6">
        <button
          onClick={signOut}
          className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Sign out
        </button>
      </div>
      <form 
        onSubmit={handleSubmit}
        className="bg-[#1B1432] p-6 rounded-xl shadow-md w-full max-w-md space-y-4 text-white"
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Home
          </button>
        </div>
        <h1 className="text-2xl font-bold">Create your feed</h1>
        <p className="text-sm text-gray-400">Fill in the details for your event</p>

        <div>
          <label className="block mb-1 text-sm">Event Name</label>
          <input
            type="text"
            placeholder="Enter event name"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="w-full rounded-md bg-[#0F0C1D] border border-gray-600 px-3 py-2 text-white"
            required
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block mb-1 text-sm">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md bg-[#0F0C1D] border border-gray-600 px-3 py-2 text-white"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block mb-1 text-sm">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-md bg-[#0F0C1D] border border-gray-600 px-3 py-2 text-white"
              required
            />
          </div>
        </div>

        <div>
          <label className="block mb-1 text-sm">Time Zone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-md bg-[#0F0C1D] border border-gray-600 px-3 py-2 text-white"
          >
            <option>GMT-04:00 New York</option>
            <option>GMT-07:00 Los Angeles</option>
            <option>GMT+01:00 London</option>
            <option>GMT+05:30 India Standard Time</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 text-sm">Location</label>
          <input
            type="text"
            placeholder="Enter location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-md bg-[#0F0C1D] border border-gray-600 px-3 py-2 text-white"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center text-sm gap-2">
            <span className="material-icons text-gray-400">visibility_off</span>
            Private Feed
          </label>
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="w-5 h-5 accent-purple-600"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-[#FF7A58] hover:bg-[#ff6a44] text-white font-medium py-2 rounded-md"
        >
          Create Feed
        </button>
      </form>
    </main>
  );
}
