import { Router, Request, Response, NextFunction } from 'express';
import { getMembers, getMember, updateMember, addMember, getMyProfile, enrollMember, sendActivationLink, deleteMember, importMembers } from '../controllers/member.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { memberAddSchema, updateMemberSchema, enrollSchema, memberImportSchema, idParams, gymIdParams } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Route for Member self-access
router.get('/my-profile', authenticate, authorize(['MEMBER']), asyncHandler(getMyProfile));
router.post('/enroll', authenticate, authorize(['MEMBER']), validate(enrollSchema), asyncHandler(enrollMember));

// Members of a gym (Gym Admin, Super Admin, Trainer or Staff at that gym)
router.get('/gym/:gymId', authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN', 'TRAINER', 'STAFF']), validate(gymIdParams, ['params']), asyncHandler(getMembers));

// Add a member (Gym Admin / Super Admin only)
router.post('/gym/:gymId', authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']), validate(gymIdParams, ['params']), validate(memberAddSchema), asyncHandler(addMember));

// Bulk import members from CSV (Gym Admin / Super Admin only)
router.post('/gym/:gymId/import', authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']), validate(gymIdParams, ['params']), validate(memberImportSchema), asyncHandler(importMembers));

// Regenerate a member's activation link (Gym Admin / Super Admin)
router.post('/:id/activation-link', authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']), validate(idParams, ['params']), asyncHandler(sendActivationLink));

router.get('/:id', authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN', 'TRAINER']), validate(idParams, ['params']), asyncHandler(getMember));
router.put('/:id', authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']), validate(idParams, ['params']), validate(updateMemberSchema), asyncHandler(updateMember));
router.delete('/:id', authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']), validate(idParams, ['params']), asyncHandler(deleteMember));

export default router;
