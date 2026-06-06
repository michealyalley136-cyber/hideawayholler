import { Response } from 'express';
import { ReviewStatus, UserRole } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

function serializeReview(review: any) {
  return {
    ...review,
    residentName: review.user?.profile?.fullName || 'Hideaway Holler resident',
  };
}

export async function publicReviews(_req: AuthRequest, res: Response) {
  const reviews = await prisma.residentReview.findMany({
    where: { status: ReviewStatus.APPROVED, isFeatured: true },
    include: { user: { include: { profile: true } } },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });

  res.json({ reviews: reviews.map(serializeReview) });
}

export async function myReviews(req: AuthRequest, res: Response) {
  const reviews = await prisma.residentReview.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ reviews });
}

export async function adminReviews(_req: AuthRequest, res: Response) {
  const reviews = await prisma.residentReview.findMany({
    include: { user: { include: { profile: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ reviews: reviews.map(serializeReview) });
}

export async function listReviews(req: AuthRequest, res: Response) {
  const scope = typeof req.query.scope === 'string' ? req.query.scope : 'mine';

  if (scope === 'admin') {
    if (req.user!.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return adminReviews(req, res);
  }

  return myReviews(req, res);
}

export async function createReview(req: AuthRequest, res: Response) {
  const { rating, title, review } = req.body;
  const file = req.file;
  const created = await prisma.residentReview.create({
    data: {
      userId: req.user!.userId,
      rating: Math.min(5, Math.max(1, Number(rating) || 1)),
      title,
      review,
      photoPath: file?.filename,
      photoFileName: file?.originalname,
    },
  });

  res.status(201).json({ review: created });
}

export async function updateReview(req: AuthRequest, res: Response) {
  const { id, status, isFeatured } = req.body;
  const reviewId = req.params.id || id;
  if (!reviewId) {
    return res.status(400).json({ error: 'Review id is required' });
  }

  const reviewed = status === ReviewStatus.APPROVED || status === ReviewStatus.REJECTED;
  const review = await prisma.residentReview.update({
    where: { id: reviewId },
    data: {
      status,
      isFeatured: Boolean(isFeatured),
      reviewedAt: reviewed ? new Date() : undefined,
      reviewedBy: reviewed ? req.user!.userId : undefined,
    },
    include: { user: { include: { profile: true } } },
  });

  res.json({ review: serializeReview(review) });
}
