import { Router, Request, Response, NextFunction } from 'express';
import { listTrainers, createBooking, getMyBookings, getTrainerBookings, getGymBookings, updateBookingStatus } from '../controllers/booking.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { publicWriteLimiter } from '../middlewares/rateLimit.middleware';
import { createBookingSchema, updateBookingSchema } from '../utils/validators';

const router = Router();

const wrap = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Public: list trainers to book
router.get('/trainers', wrap(listTrainers));

// Member routes
router.post('/', authenticate, authorize(['MEMBER']), publicWriteLimiter, validate(createBookingSchema), wrap(createBooking));
router.get('/my', authenticate, authorize(['MEMBER']), wrap(getMyBookings));
router.patch('/:id', authenticate, wrap(updateBookingStatus));

// Trainer routes
router.get('/trainer/my', authenticate, authorize(['TRAINER']), wrap(getTrainerBookings));

// Gym Admin routes
router.get('/gym/:gymId', authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']), wrap(getGymBookings));

export default router;