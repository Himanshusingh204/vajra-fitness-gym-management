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
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { listOrders } from '../services/order.service';
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
const decisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().trim().max(500).optional(),
});
router.get('/approvals', asyncHandler(getApprovals));
router.post('/approvals/:id/decide', validate(idParams, ['params']), validate(decisionSchema), asyncHandler(decideApproval));

router.get('/fees', asyncHandler(getAllFees));
router.get('/orders', asyncHandler(async (req: Request, res: Response) => {
  const pick = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  res.json(await listOrders({ status: pick(req.query.status), gymId: pick(req.query.gymId) }));
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
