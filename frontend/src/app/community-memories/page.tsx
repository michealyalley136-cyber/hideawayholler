'use client';

import { useCallback, useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { CommunityPostCard } from '@/components/community/CommunityPostCard';
import { CommunityUploadForm } from '@/components/community/CommunityUploadForm';
import { api } from '@/lib/api';
import { CommunityPost } from '@/lib/types';

export default function CommunityMemoriesPage() {
  const [tab, setTab] = useState<'feed' | 'mine'>('feed');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<{ posts: CommunityPost[] }>(`/community?tab=${tab}`);
      setPosts(data.posts);
    } catch {
      setError('Unable to load community memories right now. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  return (
    <ProtectedRoute roles={['APPLICANT', 'RESIDENT', 'ALUMNI']}>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Community Memories</h1>
            <p className="mt-1 text-slate-600">Share approved moments from life at Hideaway Holler.</p>
          </div>

          <CommunityUploadForm onComplete={loadPosts} />

          <div className="flex gap-2">
            {(['feed', 'mine'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === value ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                {value === 'feed' ? 'Approved Feed' : 'My Submissions'}
              </button>
            ))}
          </div>

          {error && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
          {loading && <p className="text-sm text-slate-500">Loading memories...</p>}
          {!loading && !posts.length && (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              {tab === 'mine' ? 'You have not submitted any memories yet.' : 'No approved memories yet. Be the first to share one!'}
            </p>
          )}

          <div className="space-y-4">
            {posts.map((post) => (
              <CommunityPostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
