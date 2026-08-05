import { Router, Request, Response, NextFunction } from 'express';
import { getEnquiries, createEnquiry, updateEnquiry, handleContactForm } from '../controllers/enquiry.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { publicWriteLimiter } from '../middlewares/rateLimit.middleware';
import { contactSchema, enquirySchema, updateEnquirySchema } from '../utils/validators';

const router = Router();

const wrap = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Public — contact page form submission (no gymId needed)
router.post('/contact', publicWriteLimiter, validate(contactSchema), wrap(handleContactForm));

// Public — walk-in or website enquiry for a specific gym
router.post('/gym/:gymId', publicWriteLimiter, validate(enquirySchema), wrap(createEnquiry));

// Protected — Gym Admin view and update
router.get('/gym/:gymId', authenticate, authorize(['GYM_ADMIN']), wrap(getEnquiries));
router.put('/:id', authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']), validate(updateEnquirySchema), wrap(updateEnquiry));

export default router;
