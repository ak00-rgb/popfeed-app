'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

export default function ShareFeedPage() {
  const { code } = useParams();
  const [origin, setOrigin] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = `${origin}/feed/${code}`;

  const copyToClipboard = async (text: string, type: 'url' | 'code') => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        if (type === 'url') {
          setCopiedUrl(true);
          setTimeout(() => setCopiedUrl(false), 2000);
        } else {
          setCopiedCode(true);
          setTimeout(() => setCopiedCode(false), 2000);
        }
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        
        if (type === 'url') {
          setCopiedUrl(true);
          setTimeout(() => setCopiedUrl(false), 2000);
        } else {
          setCopiedCode(true);
          setTimeout(() => setCopiedCode(false), 2000);
        }
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy to clipboard. Please copy manually.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#0F0C1D] to-[#1B1432] text-white px-4">
      <div className="text-left w-full max-w-md mb-4">
        <button
          onClick={() => window.location.href = '/'}
          className="text-sm text-zinc-400 hover:underline"
        >
          ← Back to Home
        </button>
      </div>

      <div className="bg-[#1C1C2A] rounded-xl p-6 w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-1">Share your feed</h1>
        <p className="text-sm text-zinc-400 mb-6">
          Your event feed has been created successfully
        </p>

        <div className="bg-white p-4 rounded-lg flex justify-center mb-4">
          <QRCodeCanvas value={url} size={180} />
        </div>

        <p className="text-sm text-zinc-400 text-center mb-4">
          Scan to join the feed
        </p>

        <label className="text-sm text-zinc-400">Feed URL</label>
        <div className="flex items-center gap-2 mb-4">
          <input
            value={url}
            readOnly
            className="w-full bg-[#19162b] border border-zinc-700 text-white px-3 py-2 rounded-md"
          />
          <button
            onClick={() => copyToClipboard(url, 'url')}
            className={`px-3 py-2 rounded-md text-white transition-colors ${
              copiedUrl ? 'bg-green-600' : 'bg-[#7C3AED] hover:bg-[#6D28D9]'
            }`}
          >
            {copiedUrl ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <label className="text-sm text-zinc-400">Event Code</label>
        <div className="flex items-center gap-2 mb-6">
          <input
            value={String(code)}
            readOnly
            className="w-full bg-[#19162b] border border-zinc-700 text-white px-3 py-2 rounded-md"
          />
          <button
            onClick={() => copyToClipboard(String(code), 'code')}
            className={`px-3 py-2 rounded-md text-white transition-colors ${
              copiedCode ? 'bg-green-600' : 'bg-[#7C3AED] hover:bg-[#6D28D9]'
            }`}
          >
            {copiedCode ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <button
          onClick={() =>
            navigator.share
              ? navigator.share({
                  title: 'Join my Popfeed event',
                  url,
                })
              : alert('Sharing not supported')
          }
          className="w-full bg-[#FF7A58] hover:bg-[#ff6a44] py-3 rounded-lg text-white flex justify-center items-center gap-2"
        >
          <span>🔗</span> Share Feed
        </button>
      </div>
    </div>
  );
}
