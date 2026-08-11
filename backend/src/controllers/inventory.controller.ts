import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { logAudit } from '../utils/audit';

// List products for a gym
export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { category, search, lowStock } = req.query as { category?: string; search?: string; lowStock?: string };

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const where: any = { gymId, isActive: true };
    if (category) where.categoryId = category;
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (lowStock === 'true') {
      where.stock = { lte: prisma.product.fields.minimumStock as any };
    }

    const products = await prisma.product.findMany({
      where,
      include: { category: true, supplier: true },
      orderBy: { name: 'asc' },
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

// Verify a category/supplier belongs to the gym before linking it to a product,
// otherwise a GYM_ADMIN could create cross-tenant FK references.
const assertLinkedToGym = async (gymId: string, categoryId?: string | null, supplierId?: string | null): Promise<string | null> => {
  if (categoryId) {
    const cat = await prisma.productCategory.findFirst({ where: { id: categoryId, gymId }, select: { id: true } });
    if (!cat) return 'Category does not belong to this gym';
  }
  if (supplierId) {
    const sup = await prisma.supplier.findFirst({ where: { id: supplierId, gymId }, select: { id: true } });
    if (!sup) return 'Supplier does not belong to this gym';
  }
  return null;
};

// Create a product
export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { name, sku, description, purchasePrice, sellingPrice, stock, minimumStock, expiryDate, batchNumber, categoryId, supplierId } = req.body;

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const linkError = await assertLinkedToGym(gymId, categoryId, supplierId);
    if (linkError) return res.status(400).json({ error: linkError });

    const product = await prisma.product.create({
      data: {
        gymId,
        name,
        sku: sku ?? null,
        description: description ?? null,
        purchasePrice: purchasePrice ?? 0,
        sellingPrice: sellingPrice ?? 0,
        stock: stock ?? 0,
        minimumStock: minimumStock ?? 5,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        batchNumber: batchNumber ?? null,
        categoryId: categoryId ?? null,
        supplierId: supplierId ?? null,
      },
      include: { category: true, supplier: true },
    });

    await logAudit({
      action: 'PRODUCT_CREATED',
      entity: 'Product',
      entityId: product.id,
      details: JSON.stringify({ name, stock }),
      userId: req.user?.userId ?? null,
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
};

// Update a product
export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { gym: { select: { ownerId: true } } },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { name, sku, description, purchasePrice, sellingPrice, stock, minimumStock, expiryDate, batchNumber, categoryId, supplierId } = req.body;

    const linkError = await assertLinkedToGym(product.gymId, categoryId, supplierId);
    if (linkError) return res.status(400).json({ error: linkError });

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(sku !== undefined ? { sku } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(purchasePrice !== undefined ? { purchasePrice } : {}),
        ...(sellingPrice !== undefined ? { sellingPrice } : {}),
        ...(stock !== undefined ? { stock } : {}),
        ...(minimumStock !== undefined ? { minimumStock } : {}),
        ...(expiryDate !== undefined ? { expiryDate: expiryDate ? new Date(expiryDate) : null } : {}),
        ...(batchNumber !== undefined ? { batchNumber } : {}),
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(supplierId !== undefined ? { supplierId } : {}),
      },
      include: { category: true, supplier: true },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
};

// Delete a product (soft delete)
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { gym: { select: { ownerId: true } } },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.product.update({ where: { id }, data: { isActive: false } });
    res.json({ message: 'Product removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

// Get product categories (gym owner / super admin).
export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const categories = await prisma.productCategory.findMany({
      where: { gymId },
      include: { _count: { select: { products: true } } },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// Create a category (gym owner / super admin).
export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { name } = req.body;

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const category = await prisma.productCategory.create({
      data: { name, gymId },
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
};

// POS: Create a sale
export const createSale = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;
    const { items, discount, tax, paymentMethod, notes } = req.body;

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Validate stock and calculate totals
    let total = 0;
    const saleItems: Array<{ productId: string; quantity: number; unitPrice: number; total: number }> = [];
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || product.gymId !== gymId) {
        return res.status(400).json({ error: `Product ${item.productId} not found` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }
      const itemTotal = product.sellingPrice.toNumber() * item.quantity;
      total += itemTotal;
      saleItems.push({ productId: product.id, quantity: item.quantity, unitPrice: product.sellingPrice.toNumber(), total: itemTotal });
    }

    const finalAmount = total - (discount || 0) + (tax || 0);

    // Create sale and deduct stock atomically
    const sale = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          gymId,
          total,
          discount: discount || 0,
          tax: tax || 0,
          finalAmount,
          paymentMethod: paymentMethod ?? null,
          notes: notes ?? null,
          items: { create: saleItems },
        },
        include: { items: { include: { product: true } } },
      });

      // Deduct stock
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return sale;
    });

    await logAudit({
      action: 'SALE_CREATED',
      entity: 'Sale',
      entityId: sale.id,
      details: JSON.stringify({ total: finalAmount, itemCount: items.length }),
      userId: req.user?.userId ?? null,
    });

    res.status(201).json(sale);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create sale' });
  }
};

// List sales (gym owner / super admin).
export const getSales = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.params.gymId as string;

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    if (gym.ownerId !== req.user?.userId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const sales = await prisma.sale.findMany({
      where: { gymId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
};
