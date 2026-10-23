import { Router, Request, Response, NextFunction } from 'express';
import {
  registerVendor,
  registerMember,
  registerTrainer,
  login,
  logout,
  refresh,
  changePassword,
  me,
  activateAccount,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
} from '../controllers/auth.controller';
import { authenticateAccount } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { authLimiter, loginLimiter, logoutLimiter } from '../middlewares/rateLimit.middleware';
import {
  registerVendorSchema,
  registerMemberSchema,
  registerTrainerSchema,
  loginSchema,
  changePasswordSchema,
  activateAccountSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '../utils/validators';

const router = Router();

// Wrap async route handlers to catch errors
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.post('/register/vendor', authLimiter, validate(registerVendorSchema), asyncHandler(registerVendor));
router.post('/register/member', authLimiter, validate(registerMemberSchema), asyncHandler(registerMember));
router.post('/register/trainer', authLimiter, validate(registerTrainerSchema), asyncHandler(registerTrainer));
router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(login));
router.post('/logout', logoutLimiter, asyncHandler(logout));
router.post('/refresh', authLimiter, asyncHandler(refresh));
// authenticateAccount lets a trainer whose application is still pending (or
// was rejected) reach their own account, and nothing else.
router.put('/password', authenticateAccount, validate(changePasswordSchema), asyncHandler(changePassword));
router.get('/me', authenticateAccount, asyncHandler(me));
router.get('/profile', authenticateAccount, asyncHandler(getProfile));
router.put('/profile', authenticateAccount, validate(updateProfileSchema), asyncHandler(updateProfile));
router.post('/activate', authLimiter, validate(activateAccountSchema), asyncHandler(activateAccount));
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), asyncHandler(forgotPassword));
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), asyncHandler(resetPassword));

export default router;
