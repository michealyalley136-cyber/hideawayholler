import { Router } from 'express';
import * as sos from '../controllers/sos.controller';
import { registerAdminDevice } from '../controllers/adminDevice.controller';
import {
  getBusinessBillingOverview,
  listBusinessInvoices,
  listBusinessPayments,
} from '../controllers/businessBilling.controller';
import * as dashboard from '../controllers/dashboard.controller';
import { authenticate, authorizeAdmin, authorizeAdminOrSuperAdmin, authorizeSuperAdmin } from '../middleware/auth';

const router = Router();

router.post('/sos/enable-device', authenticate, authorizeAdmin, registerAdminDevice);
router.post('/sos/test', authenticate, authorizeSuperAdmin, sos.createTestSosAlert);
router.get('/sos/config', authenticate, authorizeAdmin, sos.getSosPushConfig);
router.get('/sos/active', authenticate, authorizeAdmin, sos.listActiveAdminSosAlerts);
// Vercel Hobby plan routes through api/admin/sos/[...path].ts — reuse that handler for dashboard metrics.
router.get('/sos/dashboard-stats', authenticate, authorizeAdmin, dashboard.adminDashboard);
router.get('/sos/history', authenticate, authorizeAdminOrSuperAdmin, sos.listSosHistory);
// Vercel-safe alias for Super Admin SOS records (api/admin/sos/[...path].ts).
router.get('/sos/super-admin-logs', authenticate, authorizeSuperAdmin, sos.listSuperAdminSosLogs);
// Single-segment routes (sosAlertId in body). Vercel's nested catch-all does not resolve
// multi-segment dynamic paths like /sos/:id/acknowledge, so these are the production-safe routes.
router.post('/sos/acknowledge', authenticate, authorizeAdmin, sos.acknowledgeSosAlert);
router.post('/sos/resolve', authenticate, authorizeAdmin, sos.resolveSosAlert);
router.post('/sos/mute', authenticate, authorizeAdmin, sos.muteSosAlert);
// Legacy param routes kept for local development and backward compatibility.
router.post('/sos/:sosAlertId/acknowledge', authenticate, authorizeAdmin, sos.acknowledgeSosAlert);
router.post('/sos/:sosAlertId/resolve', authenticate, authorizeAdmin, sos.resolveSosAlert);
router.post('/sos/:sosAlertId/mute', authenticate, authorizeAdmin, sos.muteSosAlert);

// Vercel-safe alias: /api/admin/dashboard (api/admin/[...path].ts) mirrors /api/dashboard/admin
router.get('/dashboard', authenticate, authorizeAdmin, dashboard.adminDashboard);

// Shared client billing — same ClientService* records Super Admin manages
router.get('/billing/subscription', authenticate, authorizeAdmin, getBusinessBillingOverview);
router.get('/billing/summary', authenticate, authorizeAdmin, getBusinessBillingOverview);
router.get('/billing/invoices', authenticate, authorizeAdmin, listBusinessInvoices);
router.get('/billing/payments', authenticate, authorizeAdmin, listBusinessPayments);

export default router;
