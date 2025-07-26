import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    console.log('Attempting to send OTP to:', email);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${req.headers.get('origin')}/create/verify`,
      },
    });

    if (error) {
      console.error('Full Supabase OTP error:', {
        message: error.message,
        status: error.status,
        name: error.name,
        stack: error.stack
      });
      
      // Handle specific error cases
      if (error.message.includes('rate limit') || error.message.includes('security purposes')) {
        return NextResponse.json({ 
          error: 'Too many attempts. Please wait a few minutes before trying again.' 
        }, { status: 429 });
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('OTP sent successfully to:', email);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in send-otp:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
