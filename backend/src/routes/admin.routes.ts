import { z } from 'zod';
import { Router, Request, Response, NextFunction } from 'express';
import {
  getGyms,
  approveGym,
  suspendGym,
  deleteGym,
  getPlatformAnalytics,
  getPlatformOverview,
  getUsers,
  getFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  getTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  getSiteContent,
  createSiteContent,
  updateSiteContent,
  deleteSiteContent,
  getSupportTickets,
  updateSupportTicket,
  getAuditLogs,
  setUserActive,
  deleteUserAccount,
  updateGymProfile,
  getAllFees,
  getPlatformMessages,
  updatePlatformMessage,
  getApprovals,
  decideApproval,
} from '../controllers/admin.controller';
import { authenticate, authorize, type AuthRequest } from '../middlewares/auth.middleware';
import { listOrders } from '../services/order.service';
import { listRefunds } from '../services/refund.service';
import { listPayouts, setPayoutAccount } from '../services/payout.service';
import { prisma } from '../utils/prisma';
import { validate } from '../middlewares/validate.middleware';
import { userStatusSchema, faqSchema, updateFaqSchema, testimonialSchema, updateTestimonialSchema, siteContentSchema, updateSiteContentSchema, ticketAdminSchema, gymUpdateSchema, gymIdParams, userIdParams, idParams, faqIdParams, testimonialIdParams } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// All admin routes require SUPER_ADMIN role
router.use(authenticate, authorize(['SUPER_ADMIN']));

router.get('/gyms', asyncHandler(getGyms));
router.put('/gyms/:gymId/approve', validate(gymIdParams, ['params']), asyncHandler(approveGym));
router.put('/gyms/:gymId/suspend', validate(gymIdParams, ['params']), asyncHandler(suspendGym));
router.put('/gyms/:gymId', validate(gymIdParams, ['params']), validate(gymUpdateSchema), asyncHandler(updateGymProfile));
router.delete('/gyms/:gymId', validate(gymIdParams, ['params']), asyncHandler(deleteGym));
const decisionSchema = z
  .object({
    decision: z.enum(['APPROVED', 'REJECTED', 'CHANGES_REQUESTED']),
    note: z.string().trim().max(500).optional(),
  })
  .refine((d) => d.decision !== 'CHANGES_REQUESTED' || !!d.note, { message: 'Tell the owner what to change', path: ['note'] });
router.get('/approvals', asyncHandler(getApprovals));
router.post('/approvals/:id/decide', validate(idParams, ['params']), validate(decisionSchema), asyncHandler(decideApproval));

router.get('/fees', asyncHandler(getAllFees));
router.get('/orders', asyncHandler(async (req: Request, res: Response) => {
  const pick = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  res.json(await listOrders({ status: pick(req.query.status), gymId: pick(req.query.gymId) }));
}));
router.get('/refunds', asyncHandler(async (_req: Request, res: Response) => res.json(await listRefunds())));
router.get('/payouts', asyncHandler(async (_req: Request, res: Response) => res.json(await listPayouts())));
router.get('/reconciliation', asyncHandler(async (_req: Request, res: Response) => {
  res.json(await prisma.reconciliationIssue.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }));
}));
// The linked account is created at Razorpay (KYC happens there); only its id is kept here.
const payoutAccountSchema = z.object({
  razorpayAccountId: z.string().trim().regex(/^acc_[a-zA-Z0-9]{6,40}$/, 'A Razorpay account id (acc_...) is required'),
  status: z.enum(['PENDING_KYC', 'ACTIVE', 'SUSPENDED']),
});
router.put('/gyms/:gymId/payout-account', validate(gymIdParams, ['params']), validate(payoutAccountSchema), asyncHandler(async (req: Request, res: Response) => {
  try {
    res.json(await setPayoutAccount(req.params.gymId as string, req.body, (req as AuthRequest).user!.userId));
  } catch (err: any) {
    if (err?.message !== 'GYM_NOT_FOUND') throw err;
    res.status(404).json({ error: 'Gym not found', code: 'GYM_NOT_FOUND' });
  }
}));
router.get('/messages', asyncHandler(getPlatformMessages));
router.put('/messages/:id', validate(idParams, ['params']), asyncHandler(updatePlatformMessage));
router.get('/analytics', asyncHandler(getPlatformAnalytics));
router.get('/overview', asyncHandler(getPlatformOverview));
router.get('/users', asyncHandler(getUsers));
router.put('/users/:id/status', validate(userIdParams, ['params']), validate(userStatusSchema), asyncHandler(setUserActive));
router.delete('/users/:id', validate(userIdParams, ['params']), asyncHandler(deleteUserAccount));
router.get('/support/tickets', asyncHandler(getSupportTickets));
router.put('/support/tickets/:id', validate(idParams, ['params']), validate(ticketAdminSchema), asyncHandler(updateSupportTicket));
router.get('/audit-logs', asyncHandler(getAuditLogs));

router.get('/cms/faqs', asyncHandler(getFaqs));
router.post('/cms/faqs', validate(faqSchema), asyncHandler(createFaq));
router.put('/cms/faqs/:id', validate(faqIdParams, ['params']), validate(updateFaqSchema), asyncHandler(updateFaq));
router.delete('/cms/faqs/:id', validate(faqIdParams, ['params']), asyncHandler(deleteFaq));

router.get('/cms/testimonials', asyncHandler(getTestimonials));
router.post('/cms/testimonials', validate(testimonialSchema), asyncHandler(createTestimonial));
router.put('/cms/testimonials/:id', validate(testimonialIdParams, ['params']), validate(updateTestimonialSchema), asyncHandler(updateTestimonial));
router.delete('/cms/testimonials/:id', validate(testimonialIdParams, ['params']), asyncHandler(deleteTestimonial));

router.get('/cms/site-content', asyncHandler(getSiteContent));
router.post('/cms/site-content', validate(siteContentSchema), asyncHandler(createSiteContent));
router.put('/cms/site-content/:id', validate(idParams, ['params']), validate(updateSiteContentSchema), asyncHandler(updateSiteContent));
router.delete('/cms/site-content/:id', validate(idParams, ['params']), asyncHandler(deleteSiteContent));

export default router;
