import { Router, Request, Response, NextFunction } from 'express';
import { getPublicFaqs, getPublicTestimonials, getGymBranding, getPublicSiteContent, getPublicStats } from '../controllers/content.controller';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/faqs', asyncHandler(getPublicFaqs));
router.get('/testimonials', asyncHandler(getPublicTestimonials));
router.get('/gym-branding', asyncHandler(getGymBranding));
router.get('/site-content', asyncHandler(getPublicSiteContent));
router.get('/stats', asyncHandler(getPublicStats));

export default router;
