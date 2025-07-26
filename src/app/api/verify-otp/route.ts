import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { email, token } = await req.json();

    if (!email || !token) {
      return NextResponse.json({ error: 'Email and token are required' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    console.log('Verifying OTP for:', email);

    const { data: session, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error || !session?.session) {
      console.error('OTP verification failed:', error);
      return NextResponse.json(
        { error: error?.message || 'No session found' },
        { status: 400 }
      );
    }

    console.log('OTP verified successfully, user ID:', session.session.user.id);

    // Ensure profile row exists for new users
    const userId = session.session.user.id;
    
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, username, alias_finalized')
        .eq('id', userId)
        .single();

      if (!existingProfile) {
        console.log('Creating new profile for user:', userId);
        const { error: profileError } = await supabase.from('profiles').insert({
          id: userId,
          username: `user_${userId.slice(0, 8)}`,
          alias_finalized: false
        });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          // Don't fail the verification if profile creation fails
        } else {
          console.log('Profile created successfully');
        }
      } else {
        console.log('Profile already exists:', existingProfile.username);
      }
    } catch (profileError) {
      console.error('Error checking/creating profile:', profileError);
      // Don't fail the verification if profile operations fail
    }

    return NextResponse.json({ 
      success: true, 
      session: session.session,
      userId: session.session.user.id
    });
  } catch (error) {
    console.error('Unexpected error in verify-otp:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
