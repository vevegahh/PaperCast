import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

interface Community {
  id: string;
  slug: string;
  name: string;
  description: string;
  post_count: number;
}

interface Post {
  id: string;
  community_id: string;
  paper_title: string;
  episode_title: string;
  audio_url: string;
  cover_art_url: string;
  description: string;
  audience: string;
  story_mode: string;
  style: string;
  upvotes_count: number;
  created_at: string;
}

function getUserId(): string {
  let uid = localStorage.getItem('papercast_uid');
  if (!uid) {
    uid = 'user-' + crypto.randomUUID().slice(0, 8);
    localStorage.setItem('papercast_uid', uid);
  }
  return uid;
}

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [sort, setSort] = useState<'popular' | 'recent'>('popular');
  const [loading, setLoading] = useState(true);
  const [playingPostId, setPlayingPostId] = useState<string | null>(null);
  const [upvotedPosts, setUpvotedPosts] = useState<Set<string>>(new Set());

  const fetchCommunities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/functions/communities`);
      const data = await res.json();
      setCommunities(data.communities || []);
    } catch (e) {
      console.error('Failed to fetch communities:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPosts = useCallback(async (communityId: string, sortBy: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/functions/communities?communityId=${communityId}&sort=${sortBy}`);
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (e) {
      console.error('Failed to fetch posts:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  useEffect(() => {
    if (selectedCommunity) {
      fetchPosts(selectedCommunity.id, sort);
    }
  }, [selectedCommunity, sort, fetchPosts]);

  const handleUpvote = async (postId: string) => {
    const userId = getUserId();
    try {
      const res = await fetch(`${API_BASE}/functions/communities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upvote', postId, userId }),
      });
      const data = await res.json();
      if (data.success) {
        setUpvotedPosts(prev => {
          const next = new Set(prev);
          if (data.upvoted) next.add(postId);
          else next.delete(postId);
          return next;
        });
        setPosts(prev => prev.map(p =>
          p.id === postId
            ? { ...p, upvotes_count: p.upvotes_count + (data.upvoted ? 1 : -1) }
            : p
        ));
      }
    } catch (e) {
      console.error('Upvote failed:', e);
    }
  };

  const togglePlay = (postId: string) => {
    setPlayingPostId(prev => prev === postId ? null : postId);
  };

  // ── Community List View ──
  if (!selectedCommunity) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[720px] mx-auto px-4"
      >
        <div className="bg-surface rounded-2xl border border-border p-6 md:p-8">
          <h2 className="text-xl font-bold text-text-primary mb-1">Communities</h2>
          <p className="text-sm text-text-muted mb-6">Browse podcasts by research niche</p>

          {loading ? (
            <div className="text-center py-8 text-text-muted text-sm">Loading communities...</div>
          ) : (
            <div className="space-y-3">
              {communities.map((c) => (
                <motion.button
                  key={c.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedCommunity(c)}
                  className="w-full text-left p-4 rounded-xl border border-border bg-base hover:border-gold/30 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">{c.name}</h3>
                      <p className="text-xs text-text-muted mt-0.5">{c.description}</p>
                    </div>
                    <span className="text-xs text-text-muted bg-surface px-2 py-1 rounded-lg border border-border flex-shrink-0 ml-3">
                      {c.post_count} {c.post_count === 1 ? 'post' : 'posts'}
                    </span>
                  </div>
                </motion.button>
              ))}
              {communities.length === 0 && (
                <p className="text-center text-text-muted text-sm py-8">No communities yet.</p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // ── Posts View ──
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-[720px] mx-auto px-4"
    >
      <div className="bg-surface rounded-2xl border border-border p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => { setSelectedCommunity(null); setPosts([]); }}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-text-primary">{selectedCommunity.name}</h2>
            <p className="text-xs text-text-muted">{selectedCommunity.description}</p>
          </div>
        </div>

        {/* Sort Toggle */}
        <div className="flex gap-2 mt-4 mb-5">
          {(['popular', 'recent'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sort === s
                  ? 'bg-gold/10 text-gold border border-gold/20'
                  : 'bg-base text-text-muted border border-border hover:border-border/80'
              }`}
            >
              {s === 'popular' ? '\u2B50 Popular' : '\u23F0 Recent'}
            </button>
          ))}
        </div>

        {/* Posts */}
        {loading ? (
          <div className="text-center py-8 text-text-muted text-sm">Loading posts...</div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {posts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-border rounded-xl p-4 bg-base"
                >
                  <div className="flex gap-3">
                    {/* Mini cover */}
                    {post.cover_art_url && (
                      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-surface">
                        <img
                          src={post.cover_art_url}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-text-primary truncate">{post.episode_title}</h4>
                      {post.description && (
                        <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{post.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-text-muted">{post.style}</span>
                        {post.audience && (
                          <span className="text-[10px] text-text-muted px-1.5 py-0.5 bg-surface rounded border border-border">{post.audience}</span>
                        )}
                        {post.story_mode && (
                          <span className="text-[10px] text-text-muted px-1.5 py-0.5 bg-surface rounded border border-border">{post.story_mode}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Controls Row */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    {/* Play button */}
                    <button
                      onClick={() => togglePlay(post.id)}
                      className="flex items-center gap-1.5 text-xs font-medium text-gold hover:text-gold-hover transition-colors"
                    >
                      {playingPostId === post.id ? (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                          </svg>
                          Pause
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                          Play
                        </>
                      )}
                    </button>

                    {/* Upvote */}
                    <button
                      onClick={() => handleUpvote(post.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        upvotedPosts.has(post.id)
                          ? 'bg-gold/10 text-gold border border-gold/20'
                          : 'bg-surface text-text-muted border border-border hover:border-gold/20 hover:text-gold'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill={upvotedPosts.has(post.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                      {post.upvotes_count}
                    </button>
                  </div>

                  {/* Inline Audio Player */}
                  {playingPostId === post.id && (
                    <div className="mt-3">
                      <audio
                        src={post.audio_url}
                        autoPlay
                        controls
                        onEnded={() => setPlayingPostId(null)}
                        className="w-full h-8 opacity-80"
                        style={{ filter: 'sepia(20%) saturate(70%) hue-rotate(340deg)' }}
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {posts.length === 0 && !loading && (
              <p className="text-center text-text-muted text-sm py-8">
                No episodes published yet. Generate one and share it here!
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
