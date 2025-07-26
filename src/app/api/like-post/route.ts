import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  const { postId, action } = await req.json();

  if (!postId || !action) {
    return NextResponse.json({ error: 'Missing postId or action' }, { status: 400 });
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
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', session.user.id)
        .single();

      if (existingLike) {
        return NextResponse.json({ error: 'Already liked' }, { status: 400 });
      }

      // Add like
      const { error } = await supabase
        .from('post_likes')
        .insert({
          post_id: postId,
          user_id: session.user.id
        });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      // Remove like
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', session.user.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // Get updated like count
    const { count } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    return NextResponse.json({ 
      success: true, 
      likes: count || 0,
      isLiked: action === 'like'
    });

  } catch (error) {
    console.error('Like error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get('postId');

  if (!postId) {
    return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
  }

  try {
    // Get session (optional - for checking if user has liked)
    const { data: { session } } = await supabase.auth.getSession();

    // Get like count
    const { count: likes } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    // Check if current user has liked (only if authenticated)
    let isLiked = false;
    if (session?.user?.id) {
      const { data: userLike } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', session.user.id)
        .single();
      
      isLiked = !!userLike;
    }

    return NextResponse.json({ 
      likes: likes || 0,
      isLiked
    });

  } catch (error) {
    console.error('Get likes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 