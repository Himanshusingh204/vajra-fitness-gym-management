import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { gymIdParams, idParams } from '../utils/validators';
import { getReferrals, createReferral, updateReferralStatus, getReferralStats } from '../controllers/referral.controller';

// =====================================================================
// REFERRAL ROUTES (Referral Program)
// - GYM_ADMIN manages referrals; SUPER_ADMIN auto-passes via authorize().
// =====================================================================

const router = Router();

router.use(authenticate);

router.get('/gym/:gymId', authorize(['GYM_ADMIN']), validate(gymIdParams, ['params']), getReferrals);
router.get('/gym/:gymId/stats', authorize(['GYM_ADMIN']), validate(gymIdParams, ['params']), getReferralStats);
router.post('/gym/:gymId', authorize(['GYM_ADMIN']), validate(gymIdParams, ['params']), createReferral);
router.put('/:id', authorize(['GYM_ADMIN']), validate(idParams, ['params']), updateReferralStatus);

export default router;
