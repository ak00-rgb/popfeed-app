import { createServerSupabaseClient } from './supabase-server';

export async function fetchFeedPosts(eventCode: string) {
  const supabase = await createServerSupabaseClient(); // await is important here

  // Step 1: Get feed ID from event_code
  const { data: feed, error: feedError } = await supabase
    .from('feeds')
    .select('id')
    .eq('event_code', eventCode)
    .single();

  if (feedError || !feed) throw new Error(feedError?.message || 'Feed not found');

  // Step 2: Fetch posts using UUID feed.id
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('feed_id', feed.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}
