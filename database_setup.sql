-- Create post_likes table for like functionality (authenticated users only)
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one like per user per post
  UNIQUE(post_id, user_id)
);

-- Create comments table for comment functionality (authenticated users only)
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL, -- Store username at time of comment
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comment_likes table for comment likes (authenticated users only)
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one like per user per comment
  UNIQUE(comment_id, user_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for post_likes table
-- Allow anyone to read likes (for displaying like counts)
CREATE POLICY "Anyone can read post likes" ON post_likes
  FOR SELECT USING (true);

-- Allow authenticated users to insert their own likes
CREATE POLICY "Authenticated users can insert likes" ON post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own likes
CREATE POLICY "Users can delete their own likes" ON post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for comments table
-- Allow anyone to read comments
CREATE POLICY "Anyone can read comments" ON comments
  FOR SELECT USING (true);

-- Allow authenticated users to insert their own comments
CREATE POLICY "Authenticated users can insert comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own comments
CREATE POLICY "Users can delete their own comments" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for comment_likes table
-- Allow anyone to read comment likes
CREATE POLICY "Anyone can read comment likes" ON comment_likes
  FOR SELECT USING (true);

-- Allow authenticated users to insert their own comment likes
CREATE POLICY "Authenticated users can insert comment likes" ON comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own comment likes
CREATE POLICY "Users can delete their own comment likes" ON comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON post_likes TO authenticated;
GRANT SELECT ON post_likes TO anon; -- Anonymous users can only read like counts
GRANT ALL ON comments TO authenticated;
GRANT SELECT ON comments TO anon; -- Anonymous users can only read comments
GRANT ALL ON comment_likes TO authenticated;
GRANT SELECT ON comment_likes TO anon; -- Anonymous users can only read comment likes 