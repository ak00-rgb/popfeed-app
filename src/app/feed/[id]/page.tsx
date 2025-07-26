'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { FaHeart, FaRegHeart, FaComment, FaShare } from 'react-icons/fa'
import { IoMdCreate } from 'react-icons/io'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import dynamic from 'next/dynamic'
import { useSession } from '@/src/components/SessionProvider'

const PostComposer = dynamic(() => import('@/src/components/PostComposer'), { ssr: false })

interface Comment {
  id: string
  username: string
  content: string
  created_at: string
  likes: number
  isLiked: boolean
}

interface Post {
  id: string
  username: string
  created_at: string
  body: string
  likes: number
  comments: number
  shares: number
  isLiked?: boolean
  commentList?: Comment[]
  showComments?: boolean
  showAllComments?: boolean; // <-- add this
}

export default function FeedPage() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()
  const { session, user, loading, signOut } = useSession()

  const [posts, setPosts] = useState<Post[]>([])
  const [showComposer, setShowComposer] = useState(false)
  const [username, setUsername] = useState('')
  const [loadingLikes, setLoadingLikes] = useState<Set<string>>(new Set())
  const [loadingCommentLikes, setLoadingCommentLikes] = useState<Set<string>>(new Set())
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({})
  const [submittingComments, setSubmittingComments] = useState<Set<string>>(new Set())
  const [profileLoading, setProfileLoading] = useState(true);

  const loadUsername = useCallback(async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, alias_finalized')
        .eq('id', userId)
        .single();

      console.log('FeedPage: loaded profile:', profile, 'Error:', error, 'User:', userId);

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error.message)
        return
      }

      // Only set username if it exists and is finalized (not a temporary one)
      if (profile?.username && profile?.alias_finalized) {
        setUsername(profile.username)
      } else if (profile?.username && profile.username.startsWith('user_')) {
        // If it's a temporary username, don't set it - user needs to complete setup
        setUsername('')
      }
    } catch (error) {
      console.error('Error in loadUsername:', error)
    }
  }, [supabase])

  // Load username when user is available
  useEffect(() => {
    if (user?.id) {
      setProfileLoading(true);
      loadUsername(user.id).finally(() => setProfileLoading(false));
    } else {
      setProfileLoading(false);
    }
  }, [user?.id, loadUsername]); // Add loadUsername to dependencies

  useEffect(() => {
    if (searchParams.get('post') === 'true') {
      // Only show composer if user is properly authenticated and has a username
      if (session && username && !username.startsWith('user_')) {
        setShowComposer(true)
      } else if (session && !username) {
        // If authenticated but no username, redirect to username setup
        router.push(`/create/username?redirect=/feed/${id}?post=true`)
      } else if (!session) {
        // If not authenticated, redirect to sign in
        router.push(`/create?redirect=/feed/${id}?post=true`)
      }
    }
  }, [searchParams, session, username, router, id])

  const fetchPosts = useCallback(async () => {
    try {
      const response = await fetch(`/api/feed-with-likes-comments?feedId=${id}`);
      if (!response.ok) {
        console.error('Failed to fetch batched feed:', await response.text());
        return;
      }
      const { posts } = await response.json();
      // Format created_at for display
      const formattedPosts = posts.map((post: {
        id: string;
        username: string;
        created_at: string;
        body: string;
        likes: number;
        isLiked: boolean;
        comments: number;
        commentList: Comment[];
        shares: number;
      }) => ({
        ...post,
        created_at: new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        showComments: false,
        showAllComments: false,
      }));
      setPosts(formattedPosts);
      console.log('FeedPage: postsWithLikesAndComments:', formattedPosts);
    } catch (error) {
      console.error('Error fetching batched feed:', error);
    }
  }, [id])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts]) // Add fetchPosts to dependencies

  const toggleLike = async (postId: string) => {
    // Check if user is authenticated
    if (!session) {
      // Redirect to sign in with return URL
      router.push(`/create?redirect=/feed/${id}`);
      return;
    }

    // Prevent multiple clicks while loading
    if (loadingLikes.has(postId)) return;
    
    setLoadingLikes(prev => new Set(prev).add(postId));
    
    try {
      const currentPost = posts.find(p => p.id === postId);
      if (!currentPost) return;
      
      const action = currentPost.isLiked ? 'unlike' : 'like';
      
      const response = await fetch('/api/like-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action }),
      });
      
      if (response.ok) {
        const { likes, isLiked } = await response.json();
        
        setPosts(prev => 
          prev.map(p => 
            p.id === postId 
              ? { ...p, likes, isLiked }
              : p
          )
        );
      } else {
        const error = await response.json();
        console.error('Like error:', error);
        
        // Handle authentication error
        if (error.code === 'AUTH_REQUIRED') {
          router.push(`/create?redirect=/feed/${id}`);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLoadingLikes(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  }

  const handleComment = (post: Post) => {
    if (!session) {
      router.push(`/create?redirect=/feed/${id}`);
      return;
    }
    
    // Toggle comment visibility
    setPosts(prev => 
      prev.map(p => 
        p.id === post.id 
          ? { ...p, showComments: !p.showComments }
          : p
      )
    );
  }

  const handleCommentSubmit = async (postId: string) => {
    if (!session) {
      router.push(`/create?redirect=/feed/${id}`);
      return;
    }

    const content = commentInputs[postId]?.trim();
    if (!content) return;

    setSubmittingComments(prev => new Set(prev).add(postId));

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, content }),
      });

      if (response.ok) {
        const { comment } = await response.json();
        
        // Add new comment to the post
        setPosts(prev => 
          prev.map(p => 
            p.id === postId 
              ? { 
                  ...p, 
                  comments: p.comments + 1,
                  commentList: [...(p.commentList || []), comment],
                  showComments: true
                }
              : p
          )
        );

        // Clear comment input
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      } else {
        const error = await response.json();
        console.error('Comment error:', error);
        
        if (error.code === 'AUTH_REQUIRED') {
          router.push(`/create?redirect=/feed/${id}`);
        } else if (error.code === 'USERNAME_REQUIRED') {
          router.push(`/create/username?redirect=/feed/${id}`);
        }
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmittingComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  }

  const handleCommentLike = async (commentId: string, postId: string) => {
    if (!session) {
      router.push(`/create?redirect=/feed/${id}`);
      return;
    }

    if (loadingCommentLikes.has(commentId)) return;
    
    setLoadingCommentLikes(prev => new Set(prev).add(commentId));
    
    try {
      const currentComment = posts
        .find(p => p.id === postId)
        ?.commentList?.find(c => c.id === commentId);
      
      if (!currentComment) return;
      
      const action = currentComment.isLiked ? 'unlike' : 'like';
      
      const response = await fetch('/api/comment-like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, action }),
      });
      
      if (response.ok) {
        const { likes, isLiked } = await response.json();
        
        setPosts(prev => 
          prev.map(p => 
            p.id === postId 
              ? {
                  ...p,
                  commentList: p.commentList?.map(c => 
                    c.id === commentId 
                      ? { ...c, likes, isLiked }
                      : c
                  )
                }
              : p
          )
        );
      } else {
        const error = await response.json();
        console.error('Comment like error:', error);
        
        if (error.code === 'AUTH_REQUIRED') {
          router.push(`/create?redirect=/feed/${id}`);
        }
      }
    } catch (error) {
      console.error('Error toggling comment like:', error);
    } finally {
      setLoadingCommentLikes(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }
  }

  const handleShare = (post: Post) => {
    const url = `${window.location.href}#post-${post.id}`
    if (navigator.share) {
      navigator.share({ title: 'Check out this post on Popfeed', url })
    } else {
      navigator.clipboard.writeText(url)
      alert('Link copied to clipboard')
    }
  }

  const handleStartPost = () => {
    if (!session) {
      router.push(`/create?redirect=/feed/${id}?post=true`)
    } else if (!username) {
      router.push(`/create/username?redirect=/feed/${id}?post=true`)
    } else {
      setShowComposer(true)
    }
  }

  // Refetch posts after a new post is created to avoid race condition
  const handlePostCreated = async () => {
    // Refetch posts after new post creation
    await fetchPosts();
    setShowComposer(false);
  }

  // Show loading state while session or profile is loading
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-[#0d0b1f] text-white flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
        <p className="text-gray-400 text-sm">Loading session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0b1f] text-white px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <button 
          onClick={() => router.push('/')} 
          className="text-2xl font-bold hover:opacity-80 transition-opacity"
        >
          <span className="text-white">pop</span><span className="text-purple-500">feed</span>
        </button>
        {!session ? (
          <button
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors"
            onClick={() => router.push(`/create?redirect=/feed/${id}?post=true`)}
          >
            Sign in
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-400">
              {username && !username.startsWith('user_') ? `@${username}` : '@anonymous'}
            </div>
            <button
              onClick={signOut}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </header>

      {/* Create Post Area */}
      {showComposer && session && username && !username.startsWith('user_') ? (
        <PostComposer
          feedId={id as string}
          onPostCreated={handlePostCreated}
          onCancel={() => setShowComposer(false)}
          currentUsername={username}
        />
      ) : (
        <div
          onClick={handleStartPost}
          className={`bg-[#1e1b30] rounded-xl p-4 mb-6 cursor-pointer ${session ? 'hover:bg-[#2a273a]' : 'opacity-50 cursor-not-allowed'}`}
        >
          <div className="flex items-center justify-between">
            <input
              disabled
              placeholder={session ? (username && !username.startsWith('user_') ? 'Start a post...' : 'Set your username to post') : 'Sign in to post'}
              className="w-full bg-transparent text-white placeholder-gray-500 outline-none cursor-pointer"
            />
            <IoMdCreate className="text-gray-400 text-xl ml-2" />
          </div>
        </div>
      )}

      {/* Posts List */}
      {posts.map(post => (
          <div key={post.id} id={`post-${post.id}`} className="bg-[#1e1b30] rounded-xl p-4 mb-4">
            <div className="text-sm text-white font-semibold">{post.username}</div>
            <div className="text-xs text-gray-400 mb-2">{post.created_at}</div>
            <p className="text-sm mb-4 text-white">{post.body}</p>
            
            {/* Interaction Buttons */}
            <div className="flex items-center justify-start gap-6 text-sm text-gray-400 mb-4">
              <button 
                onClick={() => toggleLike(post.id)} 
                disabled={loadingLikes.has(post.id)}
                className={`flex items-center gap-1 transition-colors ${
                  loadingLikes.has(post.id) 
                    ? 'opacity-50' 
                    : session 
                      ? 'hover:text-orange-500' 
                      : 'hover:text-purple-400'
                }`}
                title={!session ? 'Sign in to like' : ''}
              >
                {loadingLikes.has(post.id) ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-orange-500"></div>
                ) : post.isLiked ? (
                  <FaHeart className="text-orange-500" />
                ) : (
                  <FaRegHeart className={!session ? 'text-gray-500' : ''} />
                )}
                {post.likes}
              </button>
              <button 
                onClick={() => handleComment(post)}
                className={`flex items-center gap-1 transition-colors ${
                  session ? 'hover:text-blue-400' : 'hover:text-purple-400'
                }`}
                title={!session ? 'Sign in to comment' : ''}
              >
                <FaComment className={!session ? 'text-gray-500' : ''} /> 
                {post.comments}
              </button>
              <button 
                onClick={() => handleShare(post)} 
                className="flex items-center gap-1 hover:text-green-400 transition-colors"
              >
                <FaShare /> {post.shares}
              </button>
            </div>

            {/* Comment Section */}
            {post.showComments && (
              <div className="border-t border-gray-700 pt-4">
                {/* Comment Input */}
                {session && (
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Write a comment..."
                      value={commentInputs[post.id] || ''}
                      onChange={(e) => setCommentInputs(prev => ({ 
                        ...prev, 
                        [post.id]: e.target.value 
                      }))}
                      onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit(post.id)}
                      className="flex-1 bg-[#19162b] border border-zinc-700 text-white px-3 py-2 rounded-md text-sm"
                      disabled={submittingComments.has(post.id)}
                    />
                    <button
                      onClick={() => handleCommentSubmit(post.id)}
                      disabled={!commentInputs[post.id]?.trim() || submittingComments.has(post.id)}
                      className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-md text-sm disabled:opacity-50"
                    >
                      {submittingComments.has(post.id) ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                      ) : (
                        '→'
                      )}
                    </button>
                  </div>
                )}

                {/* Comments List with lazy loading */}
                <div className="space-y-3">
                  {(post.commentList || [])
                    .slice(0, post.showAllComments ? undefined : 3)
                    .map((comment) => (
                      <div key={comment.id} className="bg-[#19162b] rounded-lg p-3">
                        <div className="flex items-start justify-between mb-1">
                          <div className="text-sm text-white font-medium">{comment.username}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(comment.created_at).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                        <p className="text-sm text-gray-300 mb-2">{comment.content}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <button
                            onClick={() => handleCommentLike(comment.id, post.id)}
                            disabled={loadingCommentLikes.has(comment.id)}
                            className={`flex items-center gap-1 transition-colors ${
                              loadingCommentLikes.has(comment.id) 
                                ? 'opacity-50' 
                                : session 
                                  ? 'hover:text-orange-500' 
                                  : 'hover:text-purple-400'
                            }`}
                            title={!session ? 'Sign in to like' : ''}
                          >
                            {loadingCommentLikes.has(comment.id) ? (
                              <div className="animate-spin rounded-full h-2 w-2 border-b border-orange-500"></div>
                            ) : comment.isLiked ? (
                              <FaHeart className="text-orange-500 text-xs" />
                            ) : (
                              <FaRegHeart className={`text-xs ${!session ? 'text-gray-500' : ''}`} />
                            )}
                            {comment.likes}
                          </button>
                        </div>
                      </div>
                    ))}
                  {/* Show more comments button */}
                  {post.commentList && post.commentList.length > 3 && !post.showAllComments && (
                    <div className="flex justify-center">
                      <button
                        className="text-purple-400 hover:underline text-xs mt-2"
                        onClick={() => setPosts(prev => prev.map(p => p.id === post.id ? { ...p, showAllComments: true } : p))}
                      >
                        Show {post.commentList.length - 3} more comment{post.commentList.length - 3 > 1 ? 's' : ''}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
    </div>
  )
}
