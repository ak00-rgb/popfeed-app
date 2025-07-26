// src/app/api/create-feed/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  console.log('🔍 Create Feed API - Session check:', {
    hasSession: !!session,
    hasUser: !!session?.user,
    userId: session?.user?.id,
    sessionError: sessionError?.message
  });

  if (sessionError || !session?.user) {
    return NextResponse.json({ 
      error: 'User not authenticated',
      details: sessionError?.message || 'No session found'
    }, { status: 401 });
  }

  const body = await req.json();
  const { eventName, startDate, startTime, timezone, location, isPrivate } = body;

  if (!eventName || !startDate || !startTime || !timezone || !location) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const coordinates = {
    // San Francisco: longitude, latitude
    longitude: -122.4194,
    latitude: 37.7749,
  };
  const point = `POINT(${coordinates.longitude} ${coordinates.latitude})`;

  const event_code = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { error } = await supabase.from('feeds').insert({
    name: eventName,
    event_code,
    location: point,
    starts_at: new Date(`${startDate}T${startTime}`),
    is_private: isPrivate,
    timezone,
    user_id: session.user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, code:event_code });
  
}
