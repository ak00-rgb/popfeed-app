import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface CommentLike {
  comment_id: string;
  user_id: string;
}

interface PostWithExtras {
  id: string;
  username: string;
  created_at: string;
  body: string;
  likes: number;
  isLiked: boolean;
  comments: number;
  commentList: Array<{
    id: string;
    username: string;
    content: string;
    created_at: string;
    likes: number;
    isLiked: boolean;
  }>;
  shares: number;
}

export async function GET(req: Request) {
  const cookieStore = await cookies(); // FIX: Await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  const { searchParams } = new URL(req.url);
  const eventCode = searchParams.get('feedId');

  if (!eventCode) {
    return NextResponse.json({ error: 'Missing feedId' }, { status: 400 });
  }

  // Get session (for like/isLiked info)
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  // Step 1: Get feed ID from event_code
  const { data: feed, error: feedError } = await supabase
    .from('feeds')
    .select('id')
    .eq('event_code', eventCode)
    .single();

  if (feedError || !feed) {
    return NextResponse.json({ error: feedError?.message || 'Feed not found' }, { status: 404 });
  }

  // Step 2: Fetch posts for the feed
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('*')
    .eq('feed_id', feed.id)
    .order('created_at', { ascending: false });

  if (postsError) {
    return NextResponse.json({ error: postsError.message }, { status: 500 });
  }

  const postIds = posts.map((p) => p.id);

  // Step 3: Fetch all likes for these posts
  const { data: postLikes, error: likesError } = await supabase
    .from('post_likes')
    .select('post_id, user_id');

  if (likesError) {
    return NextResponse.json({ error: likesError.message }, { status: 500 });
  }

  // Step 4: Fetch all comments for these posts (limit to 3 per post for initial load)
  const { data: comments, error: commentsError } = await supabase
    .from('comments')
    .select('id, post_id, user_id, username, content, created_at')
    .in('post_id', postIds)
    .order('created_at', { ascending: true });

  if (commentsError) {
    return NextResponse.json({ error: commentsError.message }, { status: 500 });
  }

  // Step 5: Fetch all comment likes for these comments
  const commentIds = comments.map((c) => c.id);
  let commentLikes: CommentLike[] = [];
  if (commentIds.length > 0) {
    const { data: cl, error: clError } = await supabase
      .from('comment_likes')
      .select('comment_id, user_id');
    if (clError) {
      return NextResponse.json({ error: clError.message }, { status: 500 });
    }
    commentLikes = cl || [];
  }

  // Step 6: Aggregate data
  const postsWithExtras: PostWithExtras[] = posts.map((post) => {
    // Likes
    const likesForPost = postLikes.filter((l) => l.post_id === post.id);
    const likes = likesForPost.length;
    const isLiked = !!(userId && likesForPost.some((l) => l.user_id === userId));

    // Comments (first 3)
    const commentsForPost = comments.filter((c) => c.post_id === post.id);
    const commentList = commentsForPost.slice(0, 3).map((comment) => {
      const likesForComment = commentLikes.filter((cl) => cl.comment_id === comment.id);
      const commentLikesCount = likesForComment.length;
      const commentIsLiked = !!(userId && likesForComment.some((cl) => cl.user_id === userId));
      return {
        id: comment.id,
        username: comment.username,
        content: comment.content,
        created_at: comment.created_at,
        likes: commentLikesCount,
        isLiked: commentIsLiked,
      };
    });

    return {
      id: post.id,
      username: post.alias || 'anonymous',
      created_at: post.created_at,
      body: post.message,
      likes,
      isLiked,
      comments: commentsForPost.length,
      commentList,
      shares: 0,
    };
  });

  return NextResponse.json({ posts: postsWithExtras });
} 