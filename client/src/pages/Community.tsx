import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import { timeAgo } from '../utils/timeAgo';

interface PostUser { id: number; username: string; }
interface PostData { id: number; content: string; category: string | null; createdAt: string; user: PostUser; likeCount: number; commentCount: number; likedByMe: boolean; }
interface CommentData { id: number; content: string; createdAt: string; user: PostUser; }
interface LeaderRow { rank: number; username: string; totalSets: number; isCurrentUser: boolean; }

const CATEGORIES = ['Morning Grit', 'Fueling', 'Strength Focus', 'Recovery'];

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllLeaders, setShowAllLeaders] = useState(false);

  // Composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const fetchAll = async () => {
    const [p, l] = await Promise.all([
      api.get('/community/posts'),
      api.get('/community/leaderboard'),
    ]);
    setPosts(p.data);
    setLeaderboard(l.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const submitPost = async () => {
    if (!newContent.trim()) return;
    setPosting(true);
    await api.post('/community/posts', { content: newContent, category: newCategory });
    setNewContent(''); setNewCategory(null); setComposerOpen(false); setPosting(false);
    fetchAll();
  };

  const deletePost = async (id: number) => {
    await api.delete(`/community/posts/${id}`);
    fetchAll();
  };

  const toggleLike = async (postId: number) => {
    const { data } = await api.post(`/community/posts/${postId}/like`);
    setPosts((prev) => prev.map((p) =>
      p.id === postId ? { ...p, likedByMe: data.liked, likeCount: data.count } : p
    ));
  };

  if (loading) return <LoadingSkeleton />;

  const visibleLeaders = showAllLeaders ? leaderboard : leaderboard.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="uppercase tracking-widest text-xs font-bold text-tertiary font-label">The Hearth</p>
        <h2 className="font-headline text-3xl lg:text-4xl font-black text-on-surface">Community</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Social Feed */}
        <div className="lg:col-span-7 space-y-6">
          {/* Composer */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full hearth-glow flex items-center justify-center text-on-primary text-sm font-bold font-headline flex-shrink-0">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                {!composerOpen ? (
                  <button onClick={() => setComposerOpen(true)}
                    className="w-full text-left bg-surface-container-low rounded-xl px-4 py-3 text-sm text-outline font-body hover:bg-surface-container transition-colors">
                    Share your hearth's heat today...
                  </button>
                ) : (
                  <div className="space-y-3">
                    <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Share your hearth's heat today..."
                      rows={3} autoFocus
                      className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm font-body text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((c) => (
                        <button key={c} onClick={() => setNewCategory(newCategory === c ? null : c)}
                          className={`text-xs px-3 py-1.5 rounded-full font-label transition-all ${
                            newCategory === c ? 'hearth-glow text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                          }`}>
                          {c}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setComposerOpen(false); setNewContent(''); setNewCategory(null); }}
                        className="px-4 py-2 text-sm font-headline text-on-surface-variant hover:text-on-surface transition-colors">
                        Cancel
                      </button>
                      <button onClick={submitPost} disabled={posting || !newContent.trim()}
                        className="hearth-glow text-on-primary rounded-full px-6 py-2 text-sm font-headline font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1">
                        {posting && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                        Post Pulse
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Posts */}
          {posts.length === 0 && (
            <div className="bg-surface-container-lowest rounded-2xl p-10 text-center shadow-sm">
              <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">forum</span>
              <p className="text-on-surface-variant font-body">Be the first to post!</p>
            </div>
          )}

          {posts.map((p) => (
            <PostCard key={p.id} post={p} currentUserId={user?.id || 0}
              onLike={() => toggleLike(p.id)} onDelete={() => deletePost(p.id)} />
          ))}
        </div>

        {/* Right: Leaderboard + Circles */}
        <div className="lg:col-span-5 space-y-6">
          {/* Leaderboard */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-headline text-xl font-bold text-on-surface">Hearth Heroes</h3>
                <p className="text-xs text-on-surface-variant font-label">Monthly Challenge</p>
              </div>
              <span className="text-xs font-headline font-bold text-primary bg-primary-fixed rounded-full px-3 py-1">12 Days REMAINING</span>
            </div>

            <div className="space-y-2">
              {visibleLeaders.map((r) => (
                <div key={r.rank} className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${r.isCurrentUser ? 'bg-primary-fixed/30' : ''}`}>
                  <span className="font-headline font-bold text-sm text-outline w-6 text-center">{r.rank}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-headline ${
                    r.rank === 1 ? 'hearth-glow text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
                  }`}>
                    {r.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-headline font-bold text-sm text-on-surface truncate">{r.username}</p>
                    <p className="text-[10px] font-label text-on-surface-variant">{r.totalSets} Heat Pts</p>
                  </div>
                  {r.rank === 1 && <span className="material-symbols-outlined filled text-secondary text-[20px]">emoji_events</span>}
                  {r.rank <= 3 && r.rank > 1 && <span className="material-symbols-outlined text-primary text-[18px]">trending_up</span>}
                </div>
              ))}
            </div>

            {leaderboard.length > 4 && (
              <button onClick={() => setShowAllLeaders(!showAllLeaders)}
                className="w-full mt-3 text-sm text-primary font-headline font-medium py-2 hover:bg-surface-container-low rounded-xl transition-colors">
                {showAllLeaders ? 'Show Less' : 'View Full Standings'}
              </button>
            )}

            {leaderboard.length === 0 && (
              <p className="text-center text-on-surface-variant font-body text-sm py-4">No activity yet this month</p>
            )}
          </div>

          {/* Joined Circles */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline text-xl font-bold text-on-surface">Joined Circles</h3>
              <span className="text-xs font-headline font-bold text-primary cursor-pointer hover:underline">EXPLORE ALL</span>
            </div>
            <div className="space-y-2">
              {[
                { name: 'Early Risers', icon: 'local_fire_department', iconBg: 'bg-secondary-container', desc: '2.4k active today' },
                { name: 'Plant Powered', icon: 'eco', iconBg: 'bg-tertiary-container/30', desc: 'Daily recipes shared' },
                { name: 'Marathon Prep', icon: 'directions_run', iconBg: 'bg-primary-fixed', desc: '85 runners online' },
              ].map((circle) => (
                <div key={circle.name} className="bg-surface-container-low rounded-xl p-4 flex items-center justify-between hover:bg-surface-container-high transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${circle.iconBg} flex items-center justify-center`}>
                      <span className="material-symbols-outlined text-[20px]">{circle.icon}</span>
                    </div>
                    <div>
                      <p className="font-headline font-bold text-sm text-on-surface">{circle.name}</p>
                      <p className="text-[11px] text-on-surface-variant font-label">{circle.desc}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant text-[18px]">chevron_right</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Post Card ---

function PostCard({ post, currentUserId, onLike, onDelete }: {
  post: PostData; currentUserId: number; onLike: () => void; onDelete: () => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  const loadComments = async () => {
    setLoadingComments(true);
    const { data } = await api.get(`/community/posts/${post.id}/comments`);
    setComments(data);
    setLoadingComments(false);
  };

  const toggleComments = () => {
    if (!showComments) loadComments();
    setShowComments(!showComments);
  };

  const submitComment = async () => {
    if (!newComment.trim()) return;
    await api.post(`/community/posts/${post.id}/comments`, { content: newComment });
    setNewComment('');
    loadComments();
  };

  const isOwn = post.user.id === currentUserId;

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant text-sm font-bold font-headline flex-shrink-0">
          {post.user.username.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-headline font-bold text-sm text-on-surface">{post.user.username}</p>
          <p className="text-[11px] text-outline font-label">{timeAgo(post.createdAt)}</p>
        </div>
        {post.category && (
          <span className="bg-primary-fixed text-primary text-[10px] rounded-full px-2.5 py-1 font-label font-bold uppercase tracking-wider">
            {post.category}
          </span>
        )}
        {isOwn && (
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="text-outline-variant hover:text-on-surface transition-colors p-1">
              <span className="material-symbols-outlined text-[18px]">more_horiz</span>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/20 py-1 z-10">
                <button onClick={() => { onDelete(); setShowMenu(false); }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-error hover:bg-error-container/30 w-full transition-colors">
                  <span className="material-symbols-outlined text-[16px]">delete</span> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <p className="font-body text-on-surface text-sm leading-relaxed mb-4">{post.content}</p>

      {/* Actions */}
      <div className="flex items-center gap-4 border-t border-outline-variant/10 pt-3">
        <button onClick={onLike} className={`flex items-center gap-1.5 text-sm transition-colors ${post.likedByMe ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}>
          <span className={`material-symbols-outlined text-[20px] ${post.likedByMe ? 'filled' : ''}`}>favorite</span>
          <span className="font-label">{post.likeCount}</span>
        </button>
        <button onClick={toggleComments} className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
          <span className="font-label">{post.commentCount}</span>
        </button>
        <div className="flex-1" />
        <button className="text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[20px]">share</span>
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-outline-variant/10 space-y-3">
          {loadingComments ? (
            <div className="h-6 w-32 bg-surface-container-high rounded animate-pulse" />
          ) : (
            <>
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] font-bold font-headline text-on-surface-variant flex-shrink-0">
                    {c.user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="bg-surface-container-low rounded-xl px-3 py-2 flex-1">
                    <span className="font-headline font-bold text-xs text-on-surface">{c.user.username}</span>
                    <span className="text-xs text-outline font-label ml-2">{timeAgo(c.createdAt)}</span>
                    <p className="text-sm text-on-surface font-body mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <input value={newComment} onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                  placeholder="Add a comment..."
                  className="flex-1 bg-surface-container-low rounded-xl px-3 py-2 text-sm font-body text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <button onClick={submitComment} disabled={!newComment.trim()}
                  className="text-primary hover:text-primary-container disabled:text-outline-variant transition-colors">
                  <span className="material-symbols-outlined text-[20px]">send</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// --- Loading Skeleton ---

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-4 w-24 bg-surface-container-high rounded animate-pulse mb-2" />
        <div className="h-10 w-48 bg-surface-container-high rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
            <div className="h-12 bg-surface-container-high rounded-xl animate-pulse" />
          </div>
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm space-y-3">
              <div className="flex gap-3"><div className="w-10 h-10 rounded-full bg-surface-container-high animate-pulse" /><div className="flex-1"><div className="h-4 w-24 bg-surface-container-high rounded animate-pulse mb-1" /><div className="h-3 w-16 bg-surface-container-high rounded animate-pulse" /></div></div>
              <div className="h-12 bg-surface-container-high rounded animate-pulse" />
              <div className="h-8 bg-surface-container-high rounded animate-pulse w-32" />
            </div>
          ))}
        </div>
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
            <div className="h-6 w-32 bg-surface-container-high rounded animate-pulse mb-4" />
            {[0, 1, 2, 3].map(i => <div key={i} className="h-12 bg-surface-container-high rounded-xl animate-pulse mb-2" />)}
          </div>
          <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
            <div className="h-6 w-28 bg-surface-container-high rounded animate-pulse mb-4" />
            {[0, 1, 2].map(i => <div key={i} className="h-14 bg-surface-container-high rounded-xl animate-pulse mb-2" />)}
          </div>
        </div>
      </div>
    </div>
  );
}
