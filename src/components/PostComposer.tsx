'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useSession } from '@/src/components/SessionProvider';

interface Comment {
  id: string;
  username: string;
  content: string;
  created_at: string;
  likes: number;
  isLiked: boolean;
}

interface Post {
  id: string;
  username: string;
  created_at: string;
  body: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked?: boolean;
  commentList?: Comment[];
  showComments?: boolean;
}

interface PostComposerProps {
  feedId: string;
  onPostCreated: (post: Post) => void;
  onCancel: () => void;
  currentUsername: string;
}

export default function PostComposer({
  feedId,
  onPostCreated,
  onCancel,
  currentUsername,
}: PostComposerProps) {
  const supabase = createClientComponentClient();
  const { user } = useSession();

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!text.trim() || !user?.id || !currentUsername.trim() || currentUsername === 'anonymous') {
      alert('Please set a valid username before posting');
      return;
    }
    setLoading(true);

    const { data: feed, error: feedError } = await supabase
      .from('feeds')
      .select('id')
      .eq('event_code', feedId)
      .single();

    if (feedError || !feed) {
      console.error('Feed not found:', feedError?.message);
      setLoading(false);
      return;
    }

    const { error } = await supabase
    .from('posts')
    .insert({
      feed_id: feed.id,
      message: text,
      alias: currentUsername,
    });
  
  setLoading(false);
  setText('');
  
  if (!error) {
    onPostCreated({
      id: crypto.randomUUID(), // or just a placeholder string like 'temp'
      username: currentUsername,
      created_at: 'Just now',
      body: text,
      likes: 0,
      comments: 0,
      shares: 0,
      isLiked: false,
      commentList: [],
      showComments: false,
    });
  } else {
    console.error('❌ Failed to insert post:', error.message);
  }
  
  };

  return (
    <div className="bg-[#1e1b30] rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's happening?"
            className="w-full bg-transparent text-white placeholder-gray-400 resize-none outline-none border-none"
            rows={3}
            disabled={loading}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePost}
            disabled={loading || !text.trim()}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
