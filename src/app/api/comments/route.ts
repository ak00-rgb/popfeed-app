import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { postId, content } = await req.json();

  if (!postId || !content?.trim()) {
    console.log('API/comments: missing postId or content', { postId, content });
    return NextResponse.json({ error: 'Missing postId or content' }, { status: 400 });
  }

  // Check if user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user?.id) {
    console.log('API/comments: not authenticated');
    return NextResponse.json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    }, { status: 401 });
  }

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', session.user.id)
    .single();
  console.log('API/comments: profile:', profile, 'error:', profileError, 'user:', session.user.id);

  if (!profile?.username) {
    return NextResponse.json({ 
      error: 'Username required',
      code: 'USERNAME_REQUIRED'
    }, { status: 400 });
  }

  // Create comment
  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: session.user.id,
      username: profile.username,
      content: content.trim()
    })
    .select()
    .single();
  console.log('API/comments: insert error:', error, 'comment:', comment);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ 
    success: true, 
    comment: {
      id: comment.id,
      username: comment.username,
      content: comment.content,
      created_at: comment.created_at,
      likes: 0,
      isLiked: false
    }
  });
}

export async function GET(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get('postId');

  if (!postId) {
    return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
  }

  try {
    // Get session (optional - for checking if user has liked comments)
    const { data: { session } } = await supabase.auth.getSession();

    // Get comments with like counts
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        id,
        username,
        content,
        created_at,
        user_id
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get like counts and user's like status for each comment
    const commentsWithLikes = await Promise.all(
      comments.map(async (comment) => {
        // Get like count
        const { count: likes } = await supabase
          .from('comment_likes')
          .select('*', { count: 'exact', head: true })
          .eq('comment_id', comment.id);

        // Check if current user has liked (only if authenticated)
        let isLiked = false;
        if (session?.user?.id) {
          const { data: userLike } = await supabase
            .from('comment_likes')
            .select('id')
            .eq('comment_id', comment.id)
            .eq('user_id', session.user.id)
            .single();
          
          isLiked = !!userLike;
        }

        return {
          id: comment.id,
          username: comment.username,
          content: comment.content,
          created_at: comment.created_at,
          likes: likes || 0,
          isLiked
        };
      })
    );

    return NextResponse.json({ comments: commentsWithLikes });

  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 