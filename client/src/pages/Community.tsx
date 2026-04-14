import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import { timeAgo } from '../utils/timeAgo';

interface PostUser { id: number; username: string; }
interface PostData { id: number; content: string; category: string | null; createdAt: string; user: PostUser; likeCount: number; commentCount: number; likedByMe: boolean; hasWorkout?: boolean; workoutPostId?: number | null; sharedDayOfWeek?: string | null; hasCardio?: boolean; cardioSessionId?: number | null; activityType?: string | null; }
interface CommentData { id: number; content: string; createdAt: string; user: PostUser; }
interface LeaderRow { rank: number; username: string; totalSets: number; isCurrentUser: boolean; }
interface SearchUser { id: number; username: string; followerCount: number; followingCount: number; isFollowedByMe: boolean; }

const CATEGORIES = ['Morning Grit', 'Fueling', 'Strength Focus', 'Recovery'];

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllLeaders, setShowAllLeaders] = useState(false);
  const [feedTab, setFeedTab] = useState<'foryou' | 'following'>('foryou');

  const [composerOpen, setComposerOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Workout detail modal
  const [workoutModal, setWorkoutModal] = useState<any>(null);
  const [cardioModal, setCardioModal] = useState<any>(null);

  const fetchPosts = async (filter: string = 'foryou') => {
    const { data } = await api.get(`/community/posts${filter === 'following' ? '?filter=following' : ''}`);
    setPosts(data);
  };

  const fetchAll = async () => {
    await fetchPosts(feedTab);
    const l = await api.get('/community/leaderboard');
    setLeaderboard(l.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { fetchPosts(feedTab); }, [feedTab]);

  // Search debounce
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      const { data } = await api.get(`/social/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(data);
      setSearchOpen(true);
    }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery]);

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleFollow = async (userId: number, isFollowed: boolean) => {
    if (isFollowed) await api.delete(`/social/follow/${userId}`);
    else await api.post(`/social/follow/${userId}`);
    setSearchResults((prev) => prev.map((u) => u.id === userId ? { ...u, isFollowedByMe: !isFollowed, followerCount: u.followerCount + (isFollowed ? -1 : 1) } : u));
  };

  const submitPost = async () => {
    if (!newContent.trim()) return;
    setPosting(true);
    await api.post('/community/posts', { content: newContent, category: newCategory });
    setNewContent(''); setNewCategory(null); setComposerOpen(false); setPosting(false);
    fetchPosts(feedTab);
  };

  const deletePost = async (id: number) => { await api.delete(`/community/posts/${id}`); fetchPosts(feedTab); };

  const toggleLike = async (postId: number) => {
    const { data } = await api.post(`/community/posts/${postId}/like`);
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likedByMe: data.liked, likeCount: data.count } : p));
  };

  const viewWorkout = async (postId: number) => {
    const { data } = await api.get(`/community/posts/${postId}/workout`);
    setWorkoutModal(data);
  };

  const viewCardio = async (postId: number) => {
    const { data } = await api.get(`/community/posts/${postId}/cardio`);
    setCardioModal(data);
  };

  if (loading) return <LoadingSkeleton />;

  const visibleLeaders = showAllLeaders ? leaderboard : leaderboard.slice(0, 4);

  return (
    <div className="space-y-6">
      <div>
        <p className="uppercase tracking-widest text-xs font-bold text-tertiary font-label">The Hearth</p>
        <h2 className="font-headline text-3xl lg:text-4xl font-black text-on-surface">Community</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Feed */}
        <div className="lg:col-span-7 space-y-6">
          {/* Composer */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full hearth-glow flex items-center justify-center text-on-primary text-sm font-bold font-headline flex-shrink-0">{user?.username?.charAt(0).toUpperCase()}</div>
              <div className="flex-1">
                {!composerOpen ? (
                  <button onClick={() => setComposerOpen(true)} className="w-full text-left bg-surface-container-low rounded-xl px-4 py-3 text-sm text-outline font-body hover:bg-surface-container transition-colors">Share your hearth's heat today...</button>
                ) : (
                  <div className="space-y-3">
                    <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Share your hearth's heat today..." rows={3} autoFocus className="w-full bg-surface-container-low rounded-xl px-4 py-3 text-sm font-body text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((c) => (
                        <button key={c} onClick={() => setNewCategory(newCategory === c ? null : c)} className={`text-xs px-3 py-1.5 rounded-full font-label transition-all ${newCategory === c ? 'hearth-glow text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}`}>{c}</button>
                      ))}
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setComposerOpen(false); setNewContent(''); setNewCategory(null); }} className="px-4 py-2 text-sm font-headline text-on-surface-variant">Cancel</button>
                      <button onClick={submitPost} disabled={posting || !newContent.trim()} className="hearth-glow text-on-primary rounded-full px-6 py-2 text-sm font-headline font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1">
                        {posting && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                        Post Pulse
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Feed tabs */}
          <div className="flex gap-4 border-b border-outline-variant/20">
            {(['foryou', 'following'] as const).map((tab) => (
              <button key={tab} onClick={() => setFeedTab(tab)}
                className={`pb-2 text-sm font-headline font-medium transition-colors ${feedTab === tab ? 'border-b-2 border-primary text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}>
                {tab === 'foryou' ? 'For You' : 'Following'}
              </button>
            ))}
          </div>

          {posts.length === 0 && feedTab === 'foryou' && (
            <div className="bg-surface-container-lowest rounded-2xl p-10 text-center shadow-sm">
              <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">forum</span>
              <p className="text-on-surface-variant font-body">Be the first to post!</p>
            </div>
          )}

          {posts.length === 0 && feedTab === 'following' && (
            <div className="bg-surface-container-low rounded-3xl p-12 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40 mb-3">group</span>
              <p className="font-headline font-bold text-xl text-on-surface-variant">You're not following anyone yet</p>
              <p className="text-sm text-on-surface-variant mt-2 max-w-sm mx-auto">Search for friends above and follow them to see their workouts and posts here</p>
              <button onClick={() => { const el = document.querySelector<HTMLInputElement>('[placeholder="Search users..."]'); el?.focus(); }}
                className="hearth-glow text-white rounded-full px-6 py-3 font-headline font-bold mt-6 inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
                Find people to follow <span className="material-symbols-outlined text-[16px]">north_east</span>
              </button>
            </div>
          )}

          {posts.map((p) => (
            <PostCard key={p.id} post={p} currentUserId={user?.id || 0}
              onLike={() => toggleLike(p.id)} onDelete={() => deletePost(p.id)}
              onViewWorkout={p.hasWorkout ? () => viewWorkout(p.id) : undefined}
              onViewCardio={p.hasCardio ? () => viewCardio(p.id) : undefined} />
          ))}
        </div>

        {/* Right: Search + Leaderboard + Circles */}
        <div className="lg:col-span-5 space-y-6">
          {/* Search */}
          <div ref={searchRef} className="relative">
            <div className="bg-surface-container-low rounded-full px-4 py-3 flex items-center gap-3">
              <span className="material-symbols-outlined text-outline text-[20px]">search</span>
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                placeholder="Search users..." className="bg-transparent border-none focus:ring-0 focus:outline-none font-body text-sm w-full text-on-surface placeholder:text-outline" />
            </div>
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-lg overflow-hidden">
                {searchResults.map((u) => (
                  <div key={u.id} className="px-4 py-3 flex items-center gap-3 hover:bg-surface-container-low transition-colors border-b border-outline-variant/20 last:border-0">
                    <div className="w-8 h-8 rounded-full hearth-glow flex items-center justify-center text-white text-xs font-bold font-headline">{u.username.charAt(0).toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-headline font-bold text-sm text-on-surface truncate">{u.username}</p>
                      <p className="text-[10px] text-on-surface-variant font-label">{u.followerCount} followers</p>
                    </div>
                    <button onClick={() => toggleFollow(u.id, u.isFollowedByMe)}
                      className={`rounded-full px-4 py-1.5 text-xs font-headline font-bold transition-all ${u.isFollowedByMe ? 'bg-surface-container-high text-on-surface-variant' : 'hearth-glow text-white'}`}>
                      {u.isFollowedByMe ? 'Unfollow' : 'Follow'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="font-headline text-xl font-bold text-on-surface">Hearth Heroes</h3><p className="text-xs text-on-surface-variant font-label">Monthly Challenge</p></div>
              <span className="text-xs font-headline font-bold text-primary bg-primary-fixed rounded-full px-3 py-1">12 Days REMAINING</span>
            </div>
            <div className="space-y-2">
              {visibleLeaders.map((r) => (
                <div key={r.rank} className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${r.isCurrentUser ? 'bg-primary-fixed/30' : ''}`}>
                  <span className="font-headline font-bold text-sm text-outline w-6 text-center">{r.rank}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-headline ${r.rank === 1 ? 'hearth-glow text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>{r.username.charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0"><p className="font-headline font-bold text-sm text-on-surface truncate">{r.username}</p><p className="text-[10px] font-label text-on-surface-variant">{r.totalSets} Heat Pts</p></div>
                  {r.rank === 1 && <span className="material-symbols-outlined filled text-secondary text-[20px]">emoji_events</span>}
                  {r.rank <= 3 && r.rank > 1 && <span className="material-symbols-outlined text-primary text-[18px]">trending_up</span>}
                </div>
              ))}
            </div>
            {leaderboard.length > 4 && <button onClick={() => setShowAllLeaders(!showAllLeaders)} className="w-full mt-3 text-sm text-primary font-headline font-medium py-2 hover:bg-surface-container-low rounded-xl transition-colors">{showAllLeaders ? 'Show Less' : 'View Full Standings'}</button>}
            {leaderboard.length === 0 && <p className="text-center text-on-surface-variant font-body text-sm py-4">No activity yet this month</p>}
          </div>

          {/* Circles */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4"><h3 className="font-headline text-xl font-bold text-on-surface">Joined Circles</h3><span className="text-xs font-headline font-bold text-primary cursor-pointer hover:underline">EXPLORE ALL</span></div>
            <div className="space-y-2">
              {[{ name: 'Early Risers', icon: 'local_fire_department', iconBg: 'bg-secondary-container', desc: '2.4k active today' },
                { name: 'Plant Powered', icon: 'eco', iconBg: 'bg-tertiary-container/30', desc: 'Daily recipes shared' },
                { name: 'Marathon Prep', icon: 'directions_run', iconBg: 'bg-primary-fixed', desc: '85 runners online' },
              ].map((c) => (
                <div key={c.name} className="bg-surface-container-low rounded-xl p-4 flex items-center justify-between hover:bg-surface-container-high transition-colors cursor-pointer">
                  <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center`}><span className="material-symbols-outlined text-[20px]">{c.icon}</span></div><div><p className="font-headline font-bold text-sm text-on-surface">{c.name}</p><p className="text-[11px] text-on-surface-variant font-label">{c.desc}</p></div></div>
                  <span className="material-symbols-outlined text-outline-variant text-[18px]">chevron_right</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Workout detail modal */}
      {workoutModal && <WorkoutModal data={workoutModal} onClose={() => setWorkoutModal(null)} />}
      {cardioModal && <CardioModal data={cardioModal} onClose={() => setCardioModal(null)} />}
    </div>
  );
}

// --- Post Card ---
function PostCard({ post, currentUserId, onLike, onDelete, onViewWorkout, onViewCardio }: {
  post: PostData; currentUserId: number; onLike: () => void; onDelete: () => void; onViewWorkout?: () => void; onViewCardio?: () => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  const loadComments = async () => { setLoadingComments(true); const { data } = await api.get(`/community/posts/${post.id}/comments`); setComments(data); setLoadingComments(false); };
  const toggleComments = () => { if (!showComments) loadComments(); setShowComments(!showComments); };
  const submitComment = async () => { if (!newComment.trim()) return; await api.post(`/community/posts/${post.id}/comments`, { content: newComment }); setNewComment(''); loadComments(); };
  const isOwn = post.user.id === currentUserId;

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant text-sm font-bold font-headline flex-shrink-0">{post.user.username.charAt(0).toUpperCase()}</div>
        <div className="flex-1 min-w-0"><Link to={`/profile/${post.user.username}`} className="font-headline font-bold text-sm text-on-surface hover:text-primary transition-colors">{post.user.username}</Link><p className="text-[11px] text-outline font-label">{timeAgo(post.createdAt)}</p></div>
        {post.category && <span className="bg-primary-fixed text-primary text-[10px] rounded-full px-2.5 py-1 font-label font-bold uppercase tracking-wider">{post.category}</span>}
        {isOwn && (
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="text-outline-variant hover:text-on-surface transition-colors p-1"><span className="material-symbols-outlined text-[18px]">more_horiz</span></button>
            {showMenu && <div className="absolute right-0 top-8 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/20 py-1 z-10"><button onClick={() => { onDelete(); setShowMenu(false); }} className="flex items-center gap-2 px-4 py-2 text-sm text-error hover:bg-error-container/30 w-full transition-colors"><span className="material-symbols-outlined text-[16px]">delete</span> Delete</button></div>}
          </div>
        )}
      </div>

      <p className="font-body text-on-surface text-sm leading-relaxed mb-3">{post.content}</p>

      {/* Workout preview card */}
      {/* Workout preview card */}
      {post.hasWorkout && !post.hasCardio && onViewWorkout && (
        <div className="bg-primary-fixed/30 rounded-xl p-4 border border-primary-fixed mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="font-headline font-bold text-sm text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">fitness_center</span>
              {post.sharedDayOfWeek ? `${post.sharedDayOfWeek.charAt(0) + post.sharedDayOfWeek.slice(1).toLowerCase()} Workout` : 'Full Week Workout'}
            </p>
            <button onClick={onViewWorkout} className="text-primary font-bold text-xs font-headline flex items-center gap-1 hover:gap-2 transition-all">
              View {post.sharedDayOfWeek ? 'Day' : 'Week'} <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
          <p className="text-xs text-on-surface-variant font-body">Tap to view exercises, sets and weights.</p>
        </div>
      )}

      {/* Cardio preview card */}
      {post.hasCardio && onViewCardio && (
        <div className={`rounded-xl p-4 mb-3 ${post.activityType === 'RUN' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
          <div className="flex items-center justify-between">
            <p className="font-headline font-bold text-sm text-on-surface">
              {post.activityType === 'RUN' ? '\ud83c\udfc3' : '\ud83d\udeb4'} {post.sharedDayOfWeek ? `${post.sharedDayOfWeek.charAt(0) + post.sharedDayOfWeek.slice(1).toLowerCase()} ${post.activityType === 'RUN' ? 'Run' : 'Ride'}` : post.activityType === 'RUN' ? 'Run' : 'Ride'}
            </p>
            <button onClick={onViewCardio} className="text-primary font-bold text-xs font-headline flex items-center gap-1 hover:gap-2 transition-all">
              View Details <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

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
        <button className="text-on-surface-variant hover:text-primary transition-colors"><span className="material-symbols-outlined text-[20px]">share</span></button>
      </div>

      {showComments && (
        <div className="mt-3 pt-3 border-t border-outline-variant/10 space-y-3">
          {loadingComments ? <div className="h-6 w-32 bg-surface-container-high rounded animate-pulse" /> : (
            <>
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] font-bold font-headline text-on-surface-variant flex-shrink-0">{c.user.username.charAt(0).toUpperCase()}</div>
                  <div className="bg-surface-container-low rounded-xl px-3 py-2 flex-1"><span className="font-headline font-bold text-xs text-on-surface">{c.user.username}</span><span className="text-xs text-outline font-label ml-2">{timeAgo(c.createdAt)}</span><p className="text-sm text-on-surface font-body mt-0.5">{c.content}</p></div>
                </div>
              ))}
              <div className="flex gap-2">
                <input value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitComment()} placeholder="Add a comment..." className="flex-1 bg-surface-container-low rounded-xl px-3 py-2 text-sm font-body text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <button onClick={submitComment} disabled={!newComment.trim()} className="text-primary hover:text-primary-container disabled:text-outline-variant transition-colors"><span className="material-symbols-outlined text-[20px]">send</span></button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// --- Workout Detail Modal ---
function WorkoutModal({ data, onClose }: { data: any; onClose: () => void }) {
  if (!data) return null;
  const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const days = (data.days || []).slice().sort((a: any, b: any) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek));
  const daysWithContent = days.filter((d: any) => (d.exercises?.length > 0) || (d.activityType !== 'WORKOUT' && d.cardioSession));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest rounded-3xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-surface-container-lowest rounded-t-3xl p-6 pb-3 border-b border-outline-variant/20 flex items-center justify-between z-10">
          <div>
            <p className="font-headline font-bold text-lg text-on-surface">
              {data.user?.username}'s {data.sharedDayOfWeek
                ? `${data.sharedDayOfWeek.charAt(0) + data.sharedDayOfWeek.slice(1).toLowerCase()}${data.days?.[0]?.focus ? ' \u2014 ' + data.days[0].focus.charAt(0).toUpperCase() + data.days[0].focus.slice(1) : ''}`
                : `Week ${data.weekNumber}`}
            </p>
            <p className="text-xs text-on-surface-variant font-label">{data.createdAt?.split('T')[0]}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-surface-container-highest transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="p-6 space-y-6">
          {daysWithContent.map((d: any) => (
            <div key={d.id}>
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-outline-variant/20">
                <span className="font-headline font-bold text-sm text-on-surface">{d.dayOfWeek.charAt(0) + d.dayOfWeek.slice(1).toLowerCase()}</span>
                {d.focus && <span className="bg-primary-fixed text-primary text-[10px] rounded-full px-2 py-0.5 font-bold">{d.focus}</span>}
              </div>
              {d.activityType !== 'WORKOUT' && d.cardioSession && (
                <div className="bg-surface-container-low rounded-xl p-3 mb-2 flex items-center gap-2">
                  <span className="text-lg">{d.activityType === 'RUN' ? '\ud83c\udfc3' : '\ud83d\udeb4'}</span>
                  <span className="font-body text-sm text-on-surface">{d.cardioSession.distanceKm || '?'}km in {d.cardioSession.durationMinutes || '?'} min</span>
                </div>
              )}
              {d.exercises?.map((ex: any) => (
                <div key={ex.id} className="mb-2">
                  <p className="font-headline font-bold text-sm text-on-surface mb-1">{ex.name}</p>
                  <div className="flex flex-wrap gap-1">
                    {ex.sets.map((s: any, si: number) => {
                      const parts = [];
                      if (s.reps) parts.push(s.reps);
                      if (s.weightKg) parts.push(`\u00d7${s.weightKg}kg`);
                      const label = parts.join(' ') || '\u2014';
                      return (
                        <span key={si} className={`rounded-full px-2 py-1 text-xs font-bold ${s.completed ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
          {daysWithContent.length === 0 && (
            <p className="text-center text-on-surface-variant font-body py-4">No workout data to show</p>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Loading Skeleton ---
function CardioModal({ data, onClose }: { data: any; onClose: () => void }) {
  if (!data) return null;
  const isRun = data.type === 'RUN';
  const paceStr = data.avgPaceMinKm ? `${Math.floor(data.avgPaceMinKm)}:${String(Math.round((data.avgPaceMinKm % 1) * 60)).padStart(2, '0')}` : null;
  const dayName = data.dayOfWeek ? data.dayOfWeek.charAt(0) + data.dayOfWeek.slice(1).toLowerCase() : '';

  const stats = [
    data.durationMinutes && { value: `${data.durationMinutes}`, label: 'Duration', unit: 'min' },
    isRun && paceStr && { value: paceStr, label: 'Pace', unit: '/km' },
    !isRun && data.avgSpeedKmh && { value: `${data.avgSpeedKmh}`, label: 'Speed', unit: 'km/h' },
    data.avgHeartRate && { value: `${data.avgHeartRate}`, label: 'HR', unit: 'bpm' },
    data.elevationM && { value: `+${data.elevationM}`, label: 'Elevation', unit: 'm' },
    data.calories && { value: `${data.calories}`, label: 'Calories', unit: 'kcal' },
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest rounded-3xl max-w-lg w-full mx-4 p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-headline font-bold text-lg text-on-surface">{isRun ? '\ud83c\udfc3' : '\ud83d\udeb4'} {dayName} {isRun ? 'Run' : 'Ride'}</p>
            {data.weekNumber && <p className="text-xs text-on-surface-variant font-label">Week {data.weekNumber}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-surface-container-highest transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Main distance */}
        {data.distanceKm && (
          <div className="text-center mb-6">
            <p className="font-headline font-black text-5xl text-primary">{data.distanceKm}</p>
            <p className="text-xs uppercase text-on-surface-variant font-bold tracking-widest mt-1">km total distance</p>
          </div>
        )}

        {/* Stat boxes */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {stats.map((s: any) => (
            <div key={s.label} className="bg-surface-container-low rounded-2xl p-4 text-center">
              <p className="font-headline font-black text-2xl text-primary">{s.value}<span className="text-sm text-on-surface-variant font-normal ml-0.5">{s.unit}</span></p>
              <p className="text-xs uppercase text-on-surface-variant font-bold tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {data.notes && (
          <div className="bg-surface-container-low rounded-xl p-4">
            <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-1">Notes</p>
            <p className="text-sm text-on-surface font-body italic">{data.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div><div className="h-4 w-24 bg-surface-container-high rounded animate-pulse mb-2" /><div className="h-10 w-48 bg-surface-container-high rounded animate-pulse" /></div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm"><div className="h-12 bg-surface-container-high rounded-xl animate-pulse" /></div>
          {[0, 1, 2].map(i => (<div key={i} className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm space-y-3"><div className="flex gap-3"><div className="w-10 h-10 rounded-full bg-surface-container-high animate-pulse" /><div className="flex-1"><div className="h-4 w-24 bg-surface-container-high rounded animate-pulse mb-1" /><div className="h-3 w-16 bg-surface-container-high rounded animate-pulse" /></div></div><div className="h-12 bg-surface-container-high rounded animate-pulse" /></div>))}
        </div>
        <div className="lg:col-span-5 space-y-6">
          <div className="h-12 bg-surface-container-high rounded-full animate-pulse" />
          <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">{[0, 1, 2, 3].map(i => <div key={i} className="h-12 bg-surface-container-high rounded-xl animate-pulse mb-2" />)}</div>
        </div>
      </div>
    </div>
  );
}
