import { Router } from 'express';
import { authenticate, authorizeAdmin, authorizeSuperAdmin } from '../middleware/auth';
import {
  createBusinessBillingPortalSession,
  createBusinessCheckoutSession,
  getBusinessBillingOverview,
  getSuperAdminClientDashboard,
  getSuperAdminBillingControls,
  listBusinessInvoices,
  listBusinessPayments,
  syncBusinessBillingFromStripe,
  updateSuperAdminBusinessAccount,
} from '../controllers/businessBilling.controller';

const router = Router();

router.get('/subscription', authenticate, authorizeAdmin, getBusinessBillingOverview);
router.get('/invoices', authenticate, authorizeAdmin, listBusinessInvoices);
router.get('/payments', authenticate, authorizeAdmin, listBusinessPayments);
router.post('/checkout-session', authenticate, authorizeAdmin, createBusinessCheckoutSession);
router.post('/billing-portal-session', authenticate, authorizeAdmin, createBusinessBillingPortalSession);
router.get('/super-admin', authenticate, authorizeSuperAdmin, getSuperAdminBillingControls);
router.get('/super-admin/clients/hideaway-holler', authenticate, authorizeSuperAdmin, getSuperAdminClientDashboard);
router.patch('/super-admin/account', authenticate, authorizeSuperAdmin, updateSuperAdminBusinessAccount);
router.post('/super-admin/sync-stripe', authenticate, authorizeSuperAdmin, syncBusinessBillingFromStripe);

export default router;
