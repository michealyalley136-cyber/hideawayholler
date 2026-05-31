import { Router } from 'express';
import * as gallery from '../controllers/gallery.controller';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/', authenticate, gallery.listAlbums);
router.get('/:id', authenticate, gallery.getAlbum);
router.post('/', authenticate, authorizeAdmin, gallery.createAlbum);
router.post('/:albumId/images', authenticate, authorizeAdmin, upload.single('file'), gallery.uploadImage);
router.delete('/:id', authenticate, authorizeAdmin, gallery.deleteAlbum);

export default router;
