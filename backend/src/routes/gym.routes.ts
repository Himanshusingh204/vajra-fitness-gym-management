import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getMyGym, updateGym, listPublicGyms, getGymStats, checkSubdomain } from '../controllers/gym.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { gymUpdateSchema, gymIdParams } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Subdomain availability check query
const subdomainQuery = z.object({
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?$/, 'Invalid subdomain format'),
});

// Public: list approved gyms for browsing/membership registration
router.get('/', asyncHandler(listPublicGyms));

// Dashboard stats for a gym (owner or Super Admin)
router.get('/:gymId/stats', authenticate, validate(gymIdParams, ['params']), asyncHandler(getGymStats));

// All gym branch routes require GYM_ADMIN role
router.use(authenticate, authorize(['GYM_ADMIN']));

router.get('/my-branch', asyncHandler(getMyGym));
router.put('/my-branch', validate(gymUpdateSchema), asyncHandler(updateGym));

// Subdomain availability for white-label branding (owner or Super Admin)
router.get('/subdomain-availability', validate(subdomainQuery, ['query']), asyncHandler(checkSubdomain));

export default router;
