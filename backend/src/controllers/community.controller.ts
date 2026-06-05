import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { CommunityPostType, ApprovalStatus, ReactionType, ReportStatus, SosAlertStatus, UserRole } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { savePrivateFile, getPrivateUrl, deletePrivateFile } from '../utils/storage';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function isSafePath(filePath: string) {
  const normalized = path.normalize(filePath);
  return normalized && !normalized.includes('..') && !path.isAbsolute(normalized);
}

function toCommunityPostPayload(post: any) {
  return {
    id: post.id,
    authorId: post.authorId,
    authorRole: post.authorRole,
    caption: post.caption,
    postType: post.postType,
    approvalStatus: post.approvalStatus,
    isPinned: post.isPinned,
    commentsEnabled: post.commentsEnabled,
    isOfficial: post.isOfficial,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    authorName: post.author.profile?.fullName || post.author.email,
    authorProfile: {
      fullName: post.author.profile?.fullName,
      avatarUrl: post.author.profile?.avatarUrl,
    },
    images: post.images.map((image: any) => ({ id: image.id, imageUrl: image.imageUrl, imageOrder: image.imageOrder })),
    reactionCounts: post._count?.reactions ?? 0,
    commentCounts: post._count?.comments ?? 0,
    reportCount: post._count?.reports ?? 0,
  };
}

export async function listCommunityPosts(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const isAdmin = req.user!.role === UserRole.ADMIN;
  const tab = String(req.query.tab || 'feed');

  const baseCondition: any = {};
  if (!isAdmin) {
    if (tab === 'mine') {
      baseCondition.authorId = userId;
    } else {
      baseCondition.approvalStatus = ApprovalStatus.APPROVED;
    }
  } else {
    if (tab === 'pending') {
      baseCondition.approvalStatus = ApprovalStatus.PENDING;
    } else if (tab === 'mine') {
      baseCondition.authorId = userId;
    } else {
      baseCondition.approvalStatus = ApprovalStatus.APPROVED;
    }
  }

  const posts = await prisma.communityPost.findMany({
    where: baseCondition,
    include: {
      author: { include: { profile: true } },
      images: true,
      _count: { select: { reactions: true, comments: true, reports: true } },
    },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  });

  res.json({ posts: posts.map(toCommunityPostPayload) });
}

export async function createCommunityPost(req: AuthRequest, res: Response) {
  const files = (req.files as Express.Multer.File[]) || [];
  if (!files.length) {
    return res.status(400).json({ error: 'At least one image is required' });
  }

  const { caption, postType } = req.body;
  const userId = req.user!.userId;
  const isAdmin = req.user!.role === UserRole.ADMIN;

  const invalidFile = files.find((file) => !ALLOWED_IMAGE_TYPES.includes(file.mimetype) || file.size > MAX_IMAGE_SIZE);
  if (invalidFile) {
    return res.status(400).json({ error: 'Only JPG, PNG, or WEBP files under 5MB are allowed' });
  }

  const images = await Promise.all(
    files.slice(0, 10).map(async (file, index) => {
      const { filePath } = savePrivateFile(fs.readFileSync(file.path), file.originalname, 'community');
      return {
        imageUrl: getPrivateUrl(filePath),
        imageOrder: index,
      };
    })
  );

  const post = await prisma.communityPost.create({
    data: {
      authorId: userId,
      authorRole: req.user!.role,
      caption: caption || undefined,
      postType: Object.values(CommunityPostType).includes(postType as CommunityPostType)
        ? (postType as CommunityPostType)
        : CommunityPostType.RESIDENT_MEMORY,
      approvalStatus: isAdmin ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING,
      commentsEnabled: true,
      isOfficial: isAdmin,
      images: {
        create: images,
      },
    },
    include: { author: { include: { profile: true } }, images: true, _count: { select: { reactions: true, comments: true, reports: true } } },
  });

  res.status(201).json({ post: toCommunityPostPayload(post), message: isAdmin ? 'Post created' : 'Your memory was submitted and is waiting for admin approval.' });
}

export async function approveCommunityPost(req: AuthRequest, res: Response) {
  const post = await prisma.communityPost.updateMany({
    where: { id: req.params.postId, approvalStatus: ApprovalStatus.PENDING },
    data: { approvalStatus: ApprovalStatus.APPROVED },
  });

  if (post.count === 0) return res.status(404).json({ error: 'Pending post not found' });
  res.json({ message: 'Post approved' });
}

export async function rejectCommunityPost(req: AuthRequest, res: Response) {
  const updated = await prisma.communityPost.updateMany({
    where: { id: req.params.postId, approvalStatus: ApprovalStatus.PENDING },
    data: { approvalStatus: ApprovalStatus.REJECTED },
  });

  if (updated.count === 0) return res.status(404).json({ error: 'Pending post not found' });
  res.json({ message: 'Post rejected' });
}

export async function deleteCommunityPost(req: AuthRequest, res: Response) {
  const post = await prisma.communityPost.findUnique({ where: { id: req.params.postId }, include: { images: true } });
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (req.user!.role !== UserRole.ADMIN && post.authorId !== req.user!.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await prisma.communityPost.delete({ where: { id: post.id } });
  post.images.forEach((image: any) => {
    const encodedPath = image.imageUrl.replace(/^\/api\/community\/files\//, '');
    deletePrivateFile(decodeURIComponent(encodedPath));
  });
  res.json({ message: 'Post deleted' });
}

export async function pinCommunityPost(req: AuthRequest, res: Response) {
  const post = await prisma.communityPost.update({
    where: { id: req.params.postId },
    data: { isPinned: true },
  });
  res.json({ postId: post.id, isPinned: post.isPinned });
}

export async function unpinCommunityPost(req: AuthRequest, res: Response) {
  const post = await prisma.communityPost.update({
    where: { id: req.params.postId },
    data: { isPinned: false },
  });
  res.json({ postId: post.id, isPinned: post.isPinned });
}

export async function toggleComments(req: AuthRequest, res: Response) {
  const { enabled } = req.body;
  const post = await prisma.communityPost.update({
    where: { id: req.params.postId },
    data: { commentsEnabled: !!enabled },
  });
  res.json({ postId: post.id, commentsEnabled: post.commentsEnabled });
}

export async function reportCommunityPost(req: AuthRequest, res: Response) {
  const { reason } = req.body;
  const post = await prisma.communityPost.findUnique({ where: { id: req.params.postId } });
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const report = await prisma.communityReport.create({
    data: {
      postId: post.id,
      reportedBy: req.user!.userId,
      reason: typeof reason === 'string' ? reason : undefined,
    },
  });

  res.status(201).json({ report });
}

function toCommunityReportPayload(report: any) {
  return {
    id: report.id,
    postId: report.postId,
    reason: report.reason,
    status: report.status,
    createdAt: report.createdAt,
    reviewedAt: report.reviewedAt,
    reviewedBy: report.reviewer?.profile?.fullName || report.reviewedBy,
    reporterName: report.reporter?.profile?.fullName || report.reporter?.email,
    post: {
      id: report.post.id,
      caption: report.post.caption,
      approvalStatus: report.post.approvalStatus,
      isPinned: report.post.isPinned,
      isOfficial: report.post.isOfficial,
      authorId: report.post.authorId,
      authorRole: report.post.authorRole,
      authorName: report.post.author.profile?.fullName || report.post.author.email,
      authorProfile: {
        fullName: report.post.author.profile?.fullName,
        avatarUrl: report.post.author.profile?.avatarUrl,
      },
      createdAt: report.post.createdAt,
      images: report.post.images.map((image: any) => ({ id: image.id, imageUrl: image.imageUrl, imageOrder: image.imageOrder })),
    },
  };
}

export async function listReports(req: AuthRequest, res: Response) {
  const reports = await prisma.communityReport.findMany({
    include: {
      post: { include: { author: { include: { profile: true } }, images: true } },
      reporter: { include: { profile: true } },
      reviewer: { include: { profile: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ reports: reports.map(toCommunityReportPayload) });
}

export async function reviewCommunityReport(req: AuthRequest, res: Response) {
  const { hidePost } = req.body;
  const report = await prisma.communityReport.update({
    where: { id: req.params.reportId },
    data: {
      status: ReportStatus.REVIEWED,
      reviewedBy: req.user!.userId,
      reviewedAt: new Date(),
    },
  });

  if (hidePost) {
    await prisma.communityPost.update({
      where: { id: report.postId },
      data: { approvalStatus: ApprovalStatus.PENDING },
    });
  }

  const reportWithRelations = await prisma.communityReport.findUnique({
    where: { id: report.id },
    include: {
      post: { include: { author: { include: { profile: true } }, images: true } },
      reporter: { include: { profile: true } },
      reviewer: { include: { profile: true } },
    },
  });

  if (!reportWithRelations) return res.status(404).json({ error: 'Report not found' });
  res.json({ report: toCommunityReportPayload(reportWithRelations) });
}

export async function dismissCommunityReport(req: AuthRequest, res: Response) {
  const report = await prisma.communityReport.update({
    where: { id: req.params.reportId },
    data: {
      status: ReportStatus.RESOLVED,
      reviewedBy: req.user!.userId,
      reviewedAt: new Date(),
    },
    include: {
      post: { include: { author: { include: { profile: true } }, images: true } },
      reporter: { include: { profile: true } },
      reviewer: { include: { profile: true } },
    },
  });
  res.json({ report: toCommunityReportPayload(report) });
}

export async function deleteAlbum(req: AuthRequest, res: Response) {
  const album = await prisma.communityAlbum.findUnique({ where: { id: req.params.albumId }, include: { images: true } });
  if (!album) return res.status(404).json({ error: 'Album not found' });

  await prisma.communityAlbum.delete({ where: { id: album.id } });
  album.images.forEach((image: any) => {
    const encodedPath = image.imageUrl.replace(/^\/api\/community\/files\//, '');
    deletePrivateFile(decodeURIComponent(encodedPath));
  });
  res.json({ message: 'Album deleted' });
}

export async function deleteAlbumImage(req: AuthRequest, res: Response) {
  const image = await prisma.communityAlbumImage.findUnique({ where: { id: req.params.imageId } });
  if (!image) return res.status(404).json({ error: 'Album image not found' });

  await prisma.communityAlbumImage.delete({ where: { id: image.id } });
  const encodedPath = image.imageUrl.replace(/^\/api\/community\/files\//, '');
  deletePrivateFile(decodeURIComponent(encodedPath));
  res.json({ message: 'Image deleted' });
}

export async function toggleOfficialPost(req: AuthRequest, res: Response) {
  const { enabled } = req.body;
  const post = await prisma.communityPost.update({
    where: { id: req.params.postId },
    data: { isOfficial: enabled === false ? false : true },
    include: { author: { include: { profile: true } }, images: true, _count: { select: { reactions: true, comments: true, reports: true } } },
  });
  res.json({ post: toCommunityPostPayload(post) });
}

export async function createComment(req: AuthRequest, res: Response) {
  const { commentText } = req.body;
  if (!commentText || typeof commentText !== 'string') {
    return res.status(400).json({ error: 'Comment text is required' });
  }

  const comment = await prisma.communityComment.create({
    data: {
      postId: req.params.postId,
      authorId: req.user!.userId,
      commentText,
    },
  });
  res.status(201).json({ comment });
}

export async function listComments(req: AuthRequest, res: Response) {
  const comments = await prisma.communityComment.findMany({
    where: { postId: req.params.postId },
    include: { author: { include: { profile: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ comments });
}

export async function deleteComment(req: AuthRequest, res: Response) {
  const comment = await prisma.communityComment.findUnique({ where: { id: req.params.commentId } });
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  if (req.user!.role !== UserRole.ADMIN && comment.authorId !== req.user!.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await prisma.communityComment.delete({ where: { id: comment.id } });
  res.json({ message: 'Comment deleted' });
}

export async function reactCommunityPost(req: AuthRequest, res: Response) {
  const { reactionType } = req.body;
  if (!reactionType || !(reactionType in ReactionType)) {
    return res.status(400).json({ error: 'Invalid reaction type' });
  }

  const existing = await prisma.communityReaction.findUnique({
    where: { postId_userId: { postId: req.params.postId, userId: req.user!.userId } },
  });

  if (existing && existing.reactionType === reactionType) {
    await prisma.communityReaction.delete({ where: { id: existing.id } });
    return res.json({ removed: true });
  }

  const reaction = await prisma.communityReaction.upsert({
    where: { postId_userId: { postId: req.params.postId, userId: req.user!.userId } },
    update: { reactionType },
    create: {
      postId: req.params.postId,
      userId: req.user!.userId,
      reactionType,
    },
  });

  res.json({ reaction });
}

export async function listAlbums(req: AuthRequest, res: Response) {
  const albums = await prisma.communityAlbum.findMany({
    include: { createdByUser: { include: { profile: true } }, images: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ albums });
}

export async function createAlbum(req: AuthRequest, res: Response) {
  if (req.user!.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const files = (req.files as { [fieldname: string]: Express.Multer.File[] }) || {};
  const coverFiles = files.cover || [];
  const photoFiles = files.photos || [];
  const { title, description, photoCaptions } = req.body;

  if (!title) return res.status(400).json({ error: 'Album title is required' });
  if (!coverFiles.length) return res.status(400).json({ error: 'Cover image is required' });

  const invalidFile = [...coverFiles, ...photoFiles].find((file) => !ALLOWED_IMAGE_TYPES.includes(file.mimetype) || file.size > MAX_IMAGE_SIZE);
  if (invalidFile) {
    return res.status(400).json({ error: 'Only JPG, PNG, or WEBP files under 5MB are allowed' });
  }

  const captions: string[] = typeof photoCaptions === 'string' ? JSON.parse(photoCaptions || '[]') : Array.isArray(photoCaptions) ? photoCaptions : [];
  const cover = coverFiles[0];
  const { filePath: coverPath } = savePrivateFile(fs.readFileSync(cover.path), cover.originalname, 'community');
  const coverImageUrl = getPrivateUrl(coverPath);

  const album = await prisma.communityAlbum.create({
    data: {
      title,
      description,
      coverImageUrl,
      createdBy: req.user!.userId,
      images: {
        create: photoFiles.slice(0, 10).map((file, index) => {
          const { filePath } = savePrivateFile(fs.readFileSync(file.path), file.originalname, 'community');
          return {
            imageUrl: getPrivateUrl(filePath),
            caption: captions[index] || file.originalname,
            imageOrder: index,
            uploadedBy: req.user!.userId,
          };
        }),
      },
    },
    include: { createdByUser: { include: { profile: true } }, images: true },
  });

  res.status(201).json({ album });
}

export async function serveCommunityFile(req: AuthRequest, res: Response) {
  const encodedPath = (req.params as any).filePath || (req.params as any)[0];
  const filePath = decodeURIComponent(String(encodedPath || ''));
  if (!isSafePath(filePath) || !filePath.startsWith('community')) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  const fullPath = path.join(process.env.PRIVATE_UPLOAD_DIR || './private_uploads', filePath);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.sendFile(path.resolve(fullPath));
}
