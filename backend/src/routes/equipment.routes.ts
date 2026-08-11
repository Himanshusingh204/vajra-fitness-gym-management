import { Router, Request, Response, NextFunction } from 'express';
import { getEquipment, addEquipment, updateEquipment, recordMaintenance, deleteEquipment } from '../controllers/equipment.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { gymIdParams, idParams } from '../utils/validators';
import { z } from 'zod';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const equipmentSchema = z.object({
  name: z.string().trim().min(2).max(200),
  serialNumber: z.string().trim().max(100).optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  purchaseCost: z.number().min(0).max(1e8).optional().nullable(),
  warrantyExpiry: z.string().optional().nullable(),
  location: z.string().trim().max(200).optional().nullable(),
  condition: z.enum(['OPERATIONAL', 'MAINTENANCE', 'DAMAGED', 'RETIRED']).optional(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const maintenanceSchema = z.object({
  type: z.enum(['PREVENTIVE', 'CORRECTIVE', 'INSPECTION']),
  description: z.string().trim().min(2).max(500),
  cost: z.number().min(0).max(1e8).optional(),
  nextDue: z.string().optional().nullable(),
});

router.use(authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']));

router.get('/gym/:gymId', validate(gymIdParams, ['params']), asyncHandler(getEquipment));
router.post('/gym/:gymId', validate(gymIdParams, ['params']), validate(equipmentSchema), asyncHandler(addEquipment));
router.put('/:id', validate(idParams, ['params']), validate(equipmentSchema.partial()), asyncHandler(updateEquipment));
router.post('/:id/maintenance', validate(idParams, ['params']), validate(maintenanceSchema), asyncHandler(recordMaintenance));
router.delete('/:id', validate(idParams, ['params']), asyncHandler(deleteEquipment));

export default router;
