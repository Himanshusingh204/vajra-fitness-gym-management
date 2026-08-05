import { Router, Request, Response, NextFunction } from 'express';
import { createTicket, getMyTickets } from '../controllers/support.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { ticketSchema } from '../utils/validators';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Support tickets require a logged-in user
router.use(authenticate);

router.get('/my', asyncHandler(getMyTickets));
router.post('/', validate(ticketSchema), asyncHandler(createTicket));

export default router;
