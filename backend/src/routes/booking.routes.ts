import { Router, Request, Response, NextFunction } from 'express';
import { listTrainers, createBooking, getMyBookings, getTrainerBookings, getGymBookings, updateBookingStatus, getAvailableSlots, rescheduleBooking } from '../controllers/booking.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { publicWriteLimiter, userWriteLimiter } from '../middlewares/rateLimit.middleware';
import { createBookingSchema, updateBookingSchema, rescheduleBookingSchema, slotsQuery, idParams, gymIdParams, dateRangeQuery, statusQuery, z } from '../utils/validators';

const router = Router();

const wrap = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Public: list trainers to book (gymId query param required)
router.get('/trainers', validate(z.object({ gymId: z.string().uuid('A valid gym id is required') }), ['query']), wrap(listTrainers));

// Member routes
router.post('/', authenticate, authorize(['MEMBER']), publicWriteLimiter, validate(createBookingSchema), wrap(createBooking));
router.get('/my', authenticate, authorize(['MEMBER']), wrap(getMyBookings));
router.get('/slots', authenticate, authorize(['MEMBER']), validate(slotsQuery, ['query']), wrap(getAvailableSlots));
router.patch('/:id/reschedule', authenticate, authorize(['MEMBER']), userWriteLimiter, validate(idParams, ['params']), validate(rescheduleBookingSchema), wrap(rescheduleBooking));
router.patch('/:id', authenticate, userWriteLimiter, validate(idParams, ['params']), validate(updateBookingSchema), wrap(updateBookingStatus));

// Trainer routes
router.get('/trainer/my', authenticate, authorize(['TRAINER']), validate(dateRangeQuery, ['query']), validate(statusQuery, ['query']), wrap(getTrainerBookings));

// Gym Admin routes
router.get('/gym/:gymId', authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']), validate(gymIdParams, ['params']), validate(dateRangeQuery, ['query']), validate(statusQuery, ['query']), wrap(getGymBookings));

export default router;