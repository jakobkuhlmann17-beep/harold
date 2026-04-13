import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import { timeAgo } from '../utils/timeAgo';
import Toast from '../components/Toast';

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => setToast(msg), []);
  const [privacy, setPrivacy] = useState({ profilePublic: true, showWorkouts: true, showNutrition: false, showStats: true, allowFollowers: true });

  const fetchProfile = async () => {
    try {
      const { data } = await api.get(`/social/full-profile/${username}`);
      setProfile(data);
      if (data.privacySettings) setPrivacy(data.privacySettings);
    } catch { setProfile(null); }
    setLoading(false);
  };

  useEffect(() => { fetchProfile(); }, [username]);

  const toggleFollow = async () => {
    if (!profile) return;
    if (profile.isFollowedByMe) { await api.delete(`/social/follow/${profile.id}`); }
    else { await api.post(`/social/follow/${profile.id}`); }
    fetchProfile();
  };

  const savePrivacy = async () => {
    await api.put('/social/privacy', privacy);
    showToast('Privacy settings updated');
    fetchProfile();
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="h-24 bg-surface-container-high rounded-3xl animate-pulse" />
      <div className="grid grid-cols-3 gap-3">{[0,1,2].map(i => <div key={i} className="h-20 bg-surface-container-high rounded-2xl animate-pulse" />)}</div>
    </div>
  );

  if (!profile) return <div className="max-w-3xl mx-auto p-6 text-center"><p className="text-on-surface-variant font-body">User not found</p></div>;

  const isMe = profile.isMe;

  // Private profile gate
  if (profile.isPrivate) return (
    <div className="max-w-3xl mx-auto p-6 text-center space-y-4">
      <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center text-3xl font-headline font-black text-on-surface-variant mx-auto">{profile.username.charAt(0).toUpperCase()}</div>
      <h2 className="font-headline font-black text-2xl text-on-surface">{profile.username}</h2>
      <p className="text-sm text-on-surface-variant">{profile.followerCount} followers &middot; {profile.followingCount} following</p>
      <div className="bg-surface-container-low rounded-xl p-6 inline-block"><span className="material-symbols-outlined text-outline-variant text-4xl">lock</span><p className="text-on-surface-variant font-body mt-2">This profile is private</p></div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 lg:p-8 shadow-sm flex items-center gap-6">
        <div className="w-20 h-20 rounded-full hearth-glow flex items-center justify-center text-white text-3xl font-headline font-black flex-shrink-0">
          {profile.username.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h2 className="font-headline font-black text-2xl text-on-surface">{profile.username}</h2>
          <p className="text-sm text-on-surface-variant font-body">Joined {profile.joinedAt}</p>
          <p className="text-sm text-on-surface-variant font-body mt-1">{profile.followerCount} followers &middot; {profile.followingCount} following</p>
        </div>
        {!isMe && (
          <button onClick={toggleFollow} className={`rounded-full px-6 py-2.5 font-headline font-bold text-sm ${profile.isFollowedByMe ? 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest' : 'hearth-glow text-white hover:opacity-90'} transition-all`}>
            {profile.isFollowedByMe ? 'Unfollow' : 'Follow'}
          </button>
        )}
      </div>

      {/* Privacy badge (own profile) */}
      {isMe && (
        <div className="bg-surface-container-low rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">{privacy.profilePublic ? 'public' : 'lock'}</span>
            Your profile is {privacy.profilePublic ? 'public' : 'private'}
          </div>
          <button onClick={() => setShowPrivacy(!showPrivacy)} className="text-primary text-xs font-headline font-bold hover:underline">Edit privacy</button>
        </div>
      )}

      {/* Privacy settings */}
      {isMe && showPrivacy && (
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 space-y-4">
          <h3 className="font-headline font-bold text-on-surface">Privacy Settings</h3>
          {[
            { key: 'profilePublic', label: 'Profile visibility' },
            { key: 'showWorkouts', label: 'Show workouts' },
            { key: 'showNutrition', label: 'Show nutrition' },
            { key: 'showStats', label: 'Show stats' },
            { key: 'allowFollowers', label: 'Allow followers' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm font-body text-on-surface">{label}</span>
              <button onClick={() => setPrivacy(p => ({ ...p, [key]: !(p as any)[key] }))}
                className={`w-12 h-6 rounded-full relative transition-colors ${(privacy as any)[key] ? 'hearth-glow' : 'bg-surface-container-highest'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${(privacy as any)[key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
          <button onClick={savePrivacy} className="hearth-glow text-white rounded-full px-6 py-2.5 font-headline font-bold text-sm w-full hover:opacity-90 transition-opacity">Save Privacy Settings</button>
        </div>
      )}

      {/* Stats */}
      {profile.stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: profile.stats.totalWeeks, label: 'Weeks' },
            { value: profile.stats.totalSetsCompleted, label: 'Sets Done' },
            { value: `${profile.stats.avgCompletionRate}%`, label: 'Completion' },
            { value: profile.stats.totalVolumeKg >= 1000 ? `${(profile.stats.totalVolumeKg / 1000).toFixed(1)}k` : profile.stats.totalVolumeKg, label: 'Volume (kg)' },
            { value: profile.stats.favouriteExercise, label: 'Top Exercise' },
          ].map((s, i) => (
            <div key={i} className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/20">
              <p className="font-headline font-black text-xl text-primary">{s.value}</p>
              <p className="text-[10px] uppercase text-on-surface-variant font-bold tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent posts */}
      {profile.recentPosts?.length > 0 && (
        <div>
          <h3 className="font-headline text-xl font-bold text-on-surface mb-3">Recent Posts</h3>
          <div className="space-y-3">
            {profile.recentPosts.map((p: any) => (
              <div key={p.id} className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/20">
                <p className="text-sm font-body text-on-surface">{p.content}</p>
                <p className="text-xs text-outline font-label mt-1">{timeAgo(p.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent workouts */}
      {profile.recentWorkouts?.length > 0 && (
        <div>
          <h3 className="font-headline text-xl font-bold text-on-surface mb-3">Recent Workouts</h3>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {profile.recentWorkouts.map((w: any) => (
              <div key={w.weekNumber} className="min-w-[180px] bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/20 flex-shrink-0">
                <p className="font-headline font-bold text-on-surface">Week {w.weekNumber}</p>
                <p className="text-xs text-on-surface-variant mt-1">{w.completedSets}/{w.totalSets} sets</p>
                <div className="w-full bg-surface-container-high rounded-full h-1.5 mt-2">
                  <div className="hearth-glow h-1.5 rounded-full" style={{ width: `${w.totalSets > 0 ? (w.completedSets / w.totalSets) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
