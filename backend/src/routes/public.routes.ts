import { Router, Request, Response, NextFunction } from 'express';
import { getPublicFaqs, getPublicTestimonials } from '../controllers/content.controller';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/faqs', asyncHandler(getPublicFaqs));
router.get('/testimonials', asyncHandler(getPublicTestimonials));

export default router;
