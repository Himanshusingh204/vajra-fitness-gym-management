import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { getReferrals, createReferral, updateReferralStatus, getReferralStats } from '../controllers/referral.controller';

// =====================================================================
// REFERRAL ROUTES (Referral Program)
// - GYM_ADMIN manages referrals; SUPER_ADMIN auto-passes via authorize().
// =====================================================================

const router = Router();

router.use(authenticate);

router.get('/gym/:gymId', authorize(['GYM_ADMIN']), getReferrals);
router.get('/gym/:gymId/stats', authorize(['GYM_ADMIN']), getReferralStats);
router.post('/gym/:gymId', authorize(['GYM_ADMIN']), createReferral);
router.put('/:id', authorize(['GYM_ADMIN']), updateReferralStatus);

export default router;
