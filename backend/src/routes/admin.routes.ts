import { Router, Request, Response, NextFunction } from 'express';
import {
  getGyms,
  approveGym,
  suspendGym,
  getPlatformAnalytics,
  getUsers,
  getFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  getTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  getSupportTickets,
  updateSupportTicket,
  getAuditLogs,
  setUserActive,
  updateGymProfile,
  getAllFees,
} from '../controllers/admin.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { userStatusSchema, faqSchema, updateFaqSchema, testimonialSchema, updateTestimonialSchema, ticketAdminSchema } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// All admin routes require SUPER_ADMIN role
router.use(authenticate, authorize(['SUPER_ADMIN']));

router.get('/gyms', asyncHandler(getGyms));
router.put('/gyms/:gymId/approve', asyncHandler(approveGym));
router.put('/gyms/:gymId/suspend', asyncHandler(suspendGym));
router.put('/gyms/:gymId', asyncHandler(updateGymProfile));
router.get('/fees', asyncHandler(getAllFees));
router.get('/analytics', asyncHandler(getPlatformAnalytics));
router.get('/users', asyncHandler(getUsers));
router.put('/users/:id/status', validate(userStatusSchema), asyncHandler(setUserActive));
router.get('/support/tickets', asyncHandler(getSupportTickets));
router.put('/support/tickets/:id', validate(ticketAdminSchema), asyncHandler(updateSupportTicket));
router.get('/audit-logs', asyncHandler(getAuditLogs));

router.get('/cms/faqs', asyncHandler(getFaqs));
router.post('/cms/faqs', validate(faqSchema), asyncHandler(createFaq));
router.put('/cms/faqs/:id', validate(updateFaqSchema), asyncHandler(updateFaq));
router.delete('/cms/faqs/:id', asyncHandler(deleteFaq));

router.get('/cms/testimonials', asyncHandler(getTestimonials));
router.post('/cms/testimonials', validate(testimonialSchema), asyncHandler(createTestimonial));
router.put('/cms/testimonials/:id', validate(updateTestimonialSchema), asyncHandler(updateTestimonial));
router.delete('/cms/testimonials/:id', asyncHandler(deleteTestimonial));

export default router;
