import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const { email, token } = await req.json();

  // ✅ Pass cookies function, not snapshot
  const supabase = createRouteHandlerClient({ cookies });

  const { data: session, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error || !session?.session) {
    return NextResponse.json(
      { error: error?.message || 'No session found' },
      { status: 400 }
    );
  }

  // Ensure profile row exists for new users
  const userId = session.session.user.id;
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();

  if (!existingProfile) {
    await supabase.from('profiles').insert({
      id: userId,
      username: `user_${userId.slice(0, 8)}`,
      alias_finalized: false
    });
  }

  return NextResponse.json({ success: true, session: session.session });
}
