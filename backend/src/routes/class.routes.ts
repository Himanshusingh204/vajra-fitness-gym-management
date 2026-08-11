import { Router, Request, Response, NextFunction } from 'express';
import {
  getClasses, createClass, updateClass, deleteClass,
  bookClass, cancelClassBooking, getClassBookings,
} from '../controllers/class.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { gymIdParams, idParams, classIdParams } from '../utils/validators';
import { z } from 'zod';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const classSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional().nullable(),
  capacity: z.number().int().positive().max(500).optional(),
  duration: z.number().int().positive().max(480).optional(),
  dayOfWeek: z.string().optional().nullable(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  location: z.string().trim().max(200).optional().nullable(),
  trainerId: z.string().uuid().optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
});

// Public: list classes for a gym
router.get('/gym/:gymId', validate(gymIdParams, ['params']), asyncHandler(getClasses));

// Gym Admin: manage classes
router.post('/gym/:gymId', authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']), validate(gymIdParams, ['params']), validate(classSchema), asyncHandler(createClass));
router.put('/:id', authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']), validate(idParams, ['params']), validate(classSchema.partial()), asyncHandler(updateClass));
router.delete('/:id', authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']), validate(idParams, ['params']), asyncHandler(deleteClass));

// Gym Admin: view bookings for a class
router.get('/:classId/bookings', authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']), validate(classIdParams, ['params']), asyncHandler(getClassBookings));

// Member: book/cancel class
router.post('/:classId/book', authenticate, authorize(['MEMBER']), validate(classIdParams, ['params']), asyncHandler(bookClass));
router.delete('/bookings/:id', authenticate, authorize(['MEMBER', 'GYM_ADMIN', 'SUPER_ADMIN']), validate(idParams, ['params']), asyncHandler(cancelClassBooking));

export default router;
