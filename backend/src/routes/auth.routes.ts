import { Router, Request, Response, NextFunction } from 'express';
import {
  registerVendor,
  registerMember,
  login,
  logout,
  refresh,
  changePassword,
  me,
  activateAccount,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { authLimiter, loginLimiter, logoutLimiter } from '../middlewares/rateLimit.middleware';
import {
  registerVendorSchema,
  registerMemberSchema,
  loginSchema,
  changePasswordSchema,
  activateAccountSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../utils/validators';

const router = Router();

// Wrap async route handlers to catch errors
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.post('/register/vendor', authLimiter, validate(registerVendorSchema), asyncHandler(registerVendor));
router.post('/register/member', authLimiter, validate(registerMemberSchema), asyncHandler(registerMember));
router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(login));
router.post('/logout', logoutLimiter, asyncHandler(logout));
router.post('/refresh', authLimiter, asyncHandler(refresh));
router.put('/password', authenticate, validate(changePasswordSchema), asyncHandler(changePassword));
router.get('/me', authenticate, asyncHandler(me));
router.post('/activate', authLimiter, validate(activateAccountSchema), asyncHandler(activateAccount));
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), asyncHandler(forgotPassword));
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), asyncHandler(resetPassword));

export default router;
