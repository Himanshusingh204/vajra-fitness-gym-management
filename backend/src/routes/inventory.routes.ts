import { Router, Request, Response, NextFunction } from 'express';
import {
  getProducts, createProduct, updateProduct, deleteProduct,
  getCategories, createCategory,
  createSale, getSales,
} from '../controllers/inventory.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { z } from 'zod';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const productSchema = z.object({
  name: z.string().trim().min(2).max(200),
  sku: z.string().trim().max(50).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  purchasePrice: z.number().min(0).max(1e8).optional(),
  sellingPrice: z.number().min(0).max(1e8).optional(),
  stock: z.number().int().min(0).optional(),
  minimumStock: z.number().int().min(0).optional(),
  expiryDate: z.string().optional().nullable(),
  batchNumber: z.string().trim().max(100).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  supplierId: z.string().uuid().optional().nullable(),
});

const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
});

const saleSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
  discount: z.number().min(0).max(1e8).optional(),
  tax: z.number().min(0).max(1e8).optional(),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER']).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

// All inventory routes require GYM_ADMIN role
router.use(authenticate, authorize(['GYM_ADMIN', 'SUPER_ADMIN']));

// Products
router.get('/gym/:gymId/products', asyncHandler(getProducts));
router.post('/gym/:gymId/products', validate(productSchema), asyncHandler(createProduct));
router.put('/products/:id', validate(productSchema.partial()), asyncHandler(updateProduct));
router.delete('/products/:id', asyncHandler(deleteProduct));

// Categories
router.get('/gym/:gymId/categories', asyncHandler(getCategories));
router.post('/gym/:gymId/categories', validate(categorySchema), asyncHandler(createCategory));

// POS: Sales
router.get('/gym/:gymId/sales', asyncHandler(getSales));
router.post('/gym/:gymId/sales', validate(saleSchema), asyncHandler(createSale));

export default router;
