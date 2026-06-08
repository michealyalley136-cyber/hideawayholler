'use client';

import { useCallback, useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { CommunityPostCard } from '@/components/community/CommunityPostCard';
import { api } from '@/lib/api';
import { CommunityPost } from '@/lib/types';

export default function AdminCommunityPage() {
  const [tab, setTab] = useState<'feed' | 'pending'>('pending');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<{ posts: CommunityPost[] }>(`/community?tab=${tab}`);
      setPosts(data.posts);
    } catch {
      setError('Unable to load community posts.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const runAction = async (action: string, postId: string) => {
    setMessage('');
    setError('');
    const routes: Record<string, string> = {
      approve: '/community/approve',
      reject: '/community/reject',
      delete: '/community/delete',
      pin: '/community/pin',
      unpin: '/community/unpin',
    };
    const path = routes[action];
    if (!path) return;
    try {
      await api(path, { method: 'POST', body: { postId } });
      setMessage(`Post ${action}d successfully.`);
      await loadPosts();
    } catch {
      setError(`Unable to ${action} that post.`);
    }
  };

  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Community Memories</h1>
            <p className="mt-1 text-slate-600">Review resident submissions and manage the approved feed.</p>
          </div>

          <div className="flex gap-2">
            {(['pending', 'feed'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === value ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                {value === 'pending' ? 'Pending Approval' : 'Approved Feed'}
              </button>
            ))}
          </div>

          {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
          {error && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
          {loading && <p className="text-sm text-slate-500">Loading posts...</p>}
          {!loading && !posts.length && (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              {tab === 'pending' ? 'No posts waiting for approval.' : 'No approved community posts yet.'}
            </p>
          )}

          <div className="space-y-4">
            {posts.map((post) => (
              <CommunityPostCard
                key={post.id}
                post={post}
                isAdmin
                onAction={runAction}
              />
            ))}
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
