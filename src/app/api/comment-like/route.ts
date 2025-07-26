import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { commentId, action } = await req.json();

  if (!commentId || !action) {
    return NextResponse.json({ error: 'Missing commentId or action' }, { status: 400 });
  }

  if (!['like', 'unlike'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Check if user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user?.id) {
    return NextResponse.json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    }, { status: 401 });
  }

  try {
    if (action === 'like') {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', session.user.id)
        .single();

      if (existingLike) {
        return NextResponse.json({ error: 'Already liked' }, { status: 400 });
      }

      // Add like
      const { error } = await supabase
        .from('comment_likes')
        .insert({
          comment_id: commentId,
          user_id: session.user.id
        });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      // Remove like
      const { error } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', session.user.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // Get updated like count
    const { count } = await supabase
      .from('comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId);

    return NextResponse.json({ 
      success: true, 
      likes: count || 0,
      isLiked: action === 'like'
    });

  } catch (error) {
    console.error('Comment like error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 