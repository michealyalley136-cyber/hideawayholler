import { Router } from 'express';
import * as community from '../controllers/community.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/', authenticate, community.listCommunityPosts);
router.get('/mine', authenticate, community.listCommunityPosts);
router.get('/pending', authenticate, authorizeAdmin, community.listCommunityPosts);
router.post('/memory', authenticate, community.createCommunityPost);
router.post('/', authenticate, upload.array('photos', 10), community.createCommunityPost);
// Vercel-safe single-segment moderation routes (postId in body)
router.post('/approve', authenticate, authorizeAdmin, community.approveCommunityPost);
router.post('/reject', authenticate, authorizeAdmin, community.rejectCommunityPost);
router.post('/delete', authenticate, community.deleteCommunityPost);
router.post('/pin', authenticate, authorizeAdmin, community.pinCommunityPost);
router.post('/unpin', authenticate, authorizeAdmin, community.unpinCommunityPost);
router.post('/:postId/approve', authenticate, authorizeAdmin, community.approveCommunityPost);
router.post('/:postId/reject', authenticate, authorizeAdmin, community.rejectCommunityPost);
router.delete('/:postId', authenticate, community.deleteCommunityPost);
router.post('/:postId/pin', authenticate, authorizeAdmin, community.pinCommunityPost);
router.post('/:postId/unpin', authenticate, authorizeAdmin, community.unpinCommunityPost);
router.patch('/:postId/comments-enabled', authenticate, authorizeAdmin, community.toggleComments);
router.post('/:postId/reports', authenticate, community.reportCommunityPost);
router.get('/reports', authenticate, authorizeAdmin, community.listReports);
router.post('/:postId/comments', authenticate, community.createComment);
router.get('/:postId/comments', authenticate, community.listComments);
router.delete('/:postId/comments/:commentId', authenticate, community.deleteComment);
router.post('/:postId/reactions', authenticate, community.reactCommunityPost);
router.get('/albums', authenticate, community.listAlbums);
router.post('/albums', authenticate, authorizeAdmin, upload.fields([{ name: 'cover', maxCount: 1 }, { name: 'photos', maxCount: 10 }]), community.createAlbum);
router.get(/^\/files\/(.*)$/, authenticate, community.serveCommunityFile);

export default router;
