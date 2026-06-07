import { Router } from 'express';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
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
import supplyRoutes from './supply.routes';
import reviewRoutes from './review.routes';
import sosRoutes from './sos.routes';
import adminDeviceRoutes from './adminDevice.routes';
import settingsRoutes from './settings.routes';
import houseAssignmentRoutes from './houseAssignment.routes';
import sosSettingsRoutes from './sosSettings.routes';
import businessBillingRoutes from './businessBilling.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'hollerhub-api' });
});

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
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
router.use('/supply-requests', supplyRoutes);
router.use('/reviews', reviewRoutes);
router.use('/sos', sosRoutes);
router.use('/admin-devices', adminDeviceRoutes);
router.use('/settings', settingsRoutes);
router.use('/sos-settings', sosSettingsRoutes);
router.use('/house-assignments', houseAssignmentRoutes);
router.use('/business-billing', businessBillingRoutes);

export default router;
