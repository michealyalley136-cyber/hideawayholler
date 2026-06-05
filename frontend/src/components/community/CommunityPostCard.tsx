'use client';

import { useState } from 'react';
import { Heart, MessageCircle, Flag, Pin, Trash2, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Avatar } from '@/components/Avatar';
import { CommunityPost } from '@/lib/types';

interface CommunityPostCardProps {
  post: CommunityPost;
  isAdmin?: boolean;
  onAction?: (action: string, postId: string) => Promise<void>;
  onReport?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onReact?: (postId: string) => void;
  onToggleComments?: (postId: string) => Promise<void>;
  onToggleOfficial?: (postId: string) => Promise<void>;
}

const typeLabels: Record<string, string> = {
  RESIDENT_MEMORY: 'Memory',
  ADMIN_EVENT: 'Event',
  ANNOUNCEMENT_PHOTO: 'Announcement',
  ANIMAL_MOMENT: 'Animal Moment',
  COMMUNITY_ACTIVITY: 'Community Activity',
};

export function CommunityPostCard({ post, isAdmin, onAction, onReport, onComment, onReact, onToggleComments, onToggleOfficial }: CommunityPostCardProps) {
  const [showActions, setShowActions] = useState(false);
  const authorName = post.authorName || 'Resident';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={authorName} src={post.authorProfile?.avatarUrl ?? undefined} size="sm" />
          <div>
            <p className="font-semibold text-slate-900">{authorName}</p>
            <p className="text-xs text-slate-500">{post.authorRole.toLowerCase()} · {typeLabels[post.postType] || 'Community'}</p>
            <p className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center text-xs">
          {post.isPinned && <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">Pinned</span>}
          {post.isOfficial && <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-800">Official</span>}
          {post.approvalStatus !== 'APPROVED' && (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{post.approvalStatus}</span>
          )}
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        {post.caption && <p className="text-slate-700">{post.caption}</p>}
        {post.images.length > 0 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {post.images.map((image) => (
              <img key={image.id} src={image.imageUrl} alt={post.caption || `Community image`} className="h-48 w-full rounded-xl object-cover" />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span className="flex items-center gap-1"><Heart className="w-4 h-4 text-pink-600" /> {post.reactionCounts}</span>
          <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> {post.commentCounts}</span>
          <span className="flex items-center gap-1"><Flag className="w-4 h-4" /> {post.reportCount}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => onReact?.(post.id)}>
            <Heart className="w-4 h-4 text-pink-600" /> Like
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onComment?.(post.id)}>
            Comment
          </Button>
          <Button variant="outline" size="sm" onClick={() => onReport?.(post.id)}>
            Report
          </Button>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => setShowActions((prev) => !prev)}>
              Admin actions
            </Button>
          )}
        </div>

        {showActions && isAdmin && (
          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant="secondary" size="sm" onClick={() => onAction?.('approve', post.id)}>
              <CheckCircle2 className="w-4 h-4" /> Approve
            </Button>
            <Button variant="outline" size="sm" onClick={() => onAction?.('reject', post.id)}>
              <XCircle className="w-4 h-4" /> Reject
            </Button>
            <Button variant="danger" size="sm" onClick={() => onAction?.('delete', post.id)}>
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onAction?.('pin', post.id)}>
              <Pin className="w-4 h-4" /> Pin
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onAction?.('unpin', post.id)}>
              <Sparkles className="w-4 h-4" /> Unpin
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onToggleComments?.(post.id)}>
              {post.commentsEnabled ? 'Disable Comments' : 'Enable Comments'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onToggleOfficial?.(post.id)}>
              {post.isOfficial ? 'Unmark Official' : 'Mark Official'}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
