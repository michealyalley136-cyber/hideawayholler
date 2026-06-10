import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { sanitizeText } from '../utils/sanitize';

export async function listNotices(req: AuthRequest, res: Response) {
  const { seasonId, category } = req.query;
  const notices = await prisma.notice.findMany({
    where: {
      isPublished: true,
      ...(seasonId && { OR: [{ seasonId: seasonId as string }, { seasonId: null }] }),
      ...(category && { category: category as never }),
    },
    include: {
      reads: req.user ? { where: { userId: req.user.userId } } : false,
      season: true,
    },
    orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
  });

  const enriched = notices.map((n) => ({
    ...n,
    isRead: Array.isArray(n.reads) && n.reads.length > 0,
  }));

  res.json({ notices: enriched });
}

export async function createNotice(req: AuthRequest, res: Response) {
  const body = req.body || {};
  const notice = await prisma.notice.create({
    data: {
      title: sanitizeText(body.title, 200),
      content: sanitizeText(body.content, 5000),
      category: body.category,
      seasonId: body.seasonId || null,
      isPinned: !!body.isPinned,
      isPublished: body.isPublished !== false,
      createdBy: req.user!.userId,
    },
    include: { season: true },
  });
  res.status(201).json({ notice });
}

export async function updateNotice(req: AuthRequest, res: Response) {
  const body = req.body || {};
  const notice = await prisma.notice.update({
    where: { id: req.params.id },
    data: {
      ...(body.title !== undefined && { title: sanitizeText(body.title, 200) }),
      ...(body.content !== undefined && { content: sanitizeText(body.content, 5000) }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.seasonId !== undefined && { seasonId: body.seasonId || null }),
      ...(body.isPinned !== undefined && { isPinned: !!body.isPinned }),
      ...(body.isPublished !== undefined && { isPublished: !!body.isPublished }),
    },
  });
  res.json({ notice });
}

export async function markRead(req: AuthRequest, res: Response) {
  const noticeId = req.params.id;
  const userId = req.user!.userId;
  await prisma.noticeRead.upsert({
    where: { noticeId_userId: { noticeId, userId } },
    create: { noticeId, userId },
    update: { readAt: new Date() },
  });
  res.json({ message: 'Marked as read' });
}

export async function deleteNotice(req: AuthRequest, res: Response) {
  await prisma.notice.delete({ where: { id: req.params.id } });
  res.json({ message: 'Notice deleted' });
}
