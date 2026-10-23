import { Router, Request, Response, NextFunction } from 'express';
import {
  getPublicFaqs,
  getPublicTestimonials,
  getGymBranding,
  getPublicSiteContent,
  getPublicStats,
  getPublicGym,
  getSitemap,
} from '../controllers/content.controller';
import { validate } from '../middlewares/validate.middleware';
import { gymIdParams } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/faqs', asyncHandler(getPublicFaqs));
router.get('/testimonials', asyncHandler(getPublicTestimonials));
router.get('/gym-branding', asyncHandler(getGymBranding));
router.get('/site-content', asyncHandler(getPublicSiteContent));
router.get('/stats', asyncHandler(getPublicStats));
router.get('/gyms/:gymId', validate(gymIdParams, ['params']), asyncHandler(getPublicGym));
// Served to crawlers as /sitemap.xml through a rewrite in vercel.json.
router.get('/sitemap.xml', asyncHandler(getSitemap));

export default router;
