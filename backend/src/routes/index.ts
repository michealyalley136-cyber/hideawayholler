import { Router } from 'express';
import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';
import seasonRoutes from './season.routes';
import profileRoutes from './profile.routes';
import applicationRoutes from './application.routes';
import housingRoutes from './housing.routes';
import leaseRoutes from './lease.routes';
import paymentRoutes from './payment.routes';
import noticeRoutes from './notice.routes';
import maintenanceRoutes from './maintenance.routes';
import galleryRoutes from './gallery.routes';
import localGuideRoutes from './localGuide.routes';
import checkinRoutes from './checkin.routes';
import checkoutRoutes from './checkout.routes';
import emergencyRoutes from './emergency.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/seasons', seasonRoutes);
router.use('/profiles', profileRoutes);
router.use('/applications', applicationRoutes);
router.use('/housing', housingRoutes);
router.use('/leases', leaseRoutes);
router.use('/payments', paymentRoutes);
router.use('/notices', noticeRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/gallery', galleryRoutes);
router.use('/local-guide', localGuideRoutes);
router.use('/check-in', checkinRoutes);
router.use('/check-out', checkoutRoutes);
router.use('/emergency', emergencyRoutes);

export default router;
