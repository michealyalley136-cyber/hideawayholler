import { Router } from 'express';
import { authenticate, authorizeAdmin, authorizeSuperAdmin } from '../middleware/auth';
import {
  createBusinessBillingPortalSession,
  createBusinessCheckoutSession,
  getBusinessBillingOverview,
  getSuperAdminBillingControls,
  listBusinessInvoices,
  listBusinessPayments,
} from '../controllers/businessBilling.controller';
import {
  createSuperAdminInvoice,
  deleteSuperAdminInvoice,
  generateSuperAdminSetupFeeInvoice,
  getSuperAdminClientDashboard,
  getSuperAdminInvoice,
  markSuperAdminInvoicePaid,
  markSuperAdminInvoiceWaived,
  reactivateSuperAdminAccount,
  saveSuperAdminBillingSettings,
  sendInvoicePaymentLink,
  suspendSuperAdminAccount,
  syncBusinessBillingFromStripe,
  updateSuperAdminBusinessAccount,
  waiveSuperAdminSetupFee,
} from '../controllers/superAdminBilling.controller';

const router = Router();

router.get('/subscription', authenticate, authorizeAdmin, getBusinessBillingOverview);
router.get('/invoices', authenticate, authorizeAdmin, listBusinessInvoices);
router.get('/payments', authenticate, authorizeAdmin, listBusinessPayments);
router.post('/checkout-session', authenticate, authorizeAdmin, createBusinessCheckoutSession);
router.post('/billing-portal-session', authenticate, authorizeAdmin, createBusinessBillingPortalSession);
router.get('/super-admin', authenticate, authorizeSuperAdmin, getSuperAdminBillingControls);
router.get('/super-admin/clients/hideaway-holler', authenticate, authorizeSuperAdmin, getSuperAdminClientDashboard);
router.get('/super-admin-client-dashboard', authenticate, authorizeSuperAdmin, getSuperAdminClientDashboard);
router.patch('/super-admin/billing-settings', authenticate, authorizeSuperAdmin, saveSuperAdminBillingSettings);
router.patch('/super-admin/account', authenticate, authorizeSuperAdmin, updateSuperAdminBusinessAccount);
router.patch('/super-admin-account', authenticate, authorizeSuperAdmin, updateSuperAdminBusinessAccount);
router.post('/super-admin/invoices', authenticate, authorizeSuperAdmin, createSuperAdminInvoice);
router.get('/super-admin/invoices/:invoiceId', authenticate, authorizeSuperAdmin, getSuperAdminInvoice);
router.post('/super-admin/invoices/:invoiceId/send-payment-link', authenticate, authorizeSuperAdmin, sendInvoicePaymentLink);
router.post('/super-admin/invoices/:invoiceId/mark-paid', authenticate, authorizeSuperAdmin, markSuperAdminInvoicePaid);
router.post('/super-admin/invoices/:invoiceId/mark-waived', authenticate, authorizeSuperAdmin, markSuperAdminInvoiceWaived);
router.delete('/super-admin/invoices/:invoiceId', authenticate, authorizeSuperAdmin, deleteSuperAdminInvoice);
router.post('/super-admin/setup-fee/generate-invoice', authenticate, authorizeSuperAdmin, generateSuperAdminSetupFeeInvoice);
router.post('/super-admin/setup-fee/waive', authenticate, authorizeSuperAdmin, waiveSuperAdminSetupFee);
router.post('/super-admin/account/suspend', authenticate, authorizeSuperAdmin, suspendSuperAdminAccount);
router.post('/super-admin/account/reactivate', authenticate, authorizeSuperAdmin, reactivateSuperAdminAccount);
router.post('/super-admin/sync-stripe', authenticate, authorizeSuperAdmin, syncBusinessBillingFromStripe);
router.post('/super-admin-sync-stripe', authenticate, authorizeSuperAdmin, syncBusinessBillingFromStripe);

export default router;
