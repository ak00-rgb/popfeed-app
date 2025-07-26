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
  onPostCreated: (newPost: Post) => void;
  onCancel: () => void;
  currentUsername: string; // trusted source of immutable alias
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
  const [alias, setAlias] = useState(currentUsername || '');
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!text.trim() || !user?.id || !alias.trim() || alias === 'anonymous') {
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
      alias,
    });
  
  setLoading(false);
  setText('');
  
  if (!error) {
    onPostCreated({
      id: crypto.randomUUID(), // or just a placeholder string like 'temp'
      username: alias,
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
    <div className="bg-[#1a1a2e] p-4 rounded-xl mb-4 text-white shadow-md">
      <div className="flex justify-between items-center mb-2">
        <div className="text-lg font-semibold">
          @{currentUsername || 'anonymous'}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="text-sm text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handlePost}
            disabled={!text.trim() || loading}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-1.5 rounded-full disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-400 mb-2">Post to Anyone</p>
      <textarea
        autoFocus
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full bg-[#13132b] p-3 rounded-lg resize-none text-white placeholder-gray-500 focus:outline-none"
        placeholder="What do you want to talk about?"
      />
    </div>
  );
}
