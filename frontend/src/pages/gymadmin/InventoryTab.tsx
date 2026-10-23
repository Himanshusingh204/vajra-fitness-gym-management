import { useMemo, useState } from 'react';
import { Button, Dialog, Field, Input, Select } from '../../components/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, Pencil, Trash2, ShoppingCart, AlertTriangle, X } from 'lucide-react';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getSales,
  createSale,
  type Product,
} from '../../api/inventory.api';
import { ConfirmDialog } from '../../components/ConfirmDialog';

type ProductFormState = {
  name: string;
  sku: string;
  description: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  minimumStock: number;
  categoryId: string;
};

const emptyProductForm: ProductFormState = {
  name: '',
  sku: '',
  description: '',
  purchasePrice: 0,
  sellingPrice: 0,
  stock: 0,
  minimumStock: 5,
  categoryId: '',
};

type SaleLineItem = { productId: string; quantity: number };

const paymentMethods = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER'];

export default function InventoryTab({ gymId }: { gymId: string }) {
  const qc = useQueryClient();

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['inventory-products', gymId],
    queryFn: () => getProducts(gymId),
    enabled: !!gymId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['inventory-categories', gymId],
    queryFn: () => getCategories(gymId),
    enabled: !!gymId,
  });

  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ['inventory-sales', gymId],
    queryFn: () => getSales(gymId),
    enabled: !!gymId,
  });

  const lowStockProducts = useMemo(() => products.filter((p) => p.stock <= p.minimumStock), [products]);
  const totalRevenue = useMemo(() => sales.reduce((sum, s) => sum + s.finalAmount, 0), [sales]);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<ProductFormState>(emptyProductForm);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const createProductMut = useMutation({
    mutationFn: (data: ProductFormState) =>
      createProduct(gymId, {
        ...data,
        sku: data.sku || null,
        description: data.description || null,
        categoryId: data.categoryId || null,
      } as Partial<Product> & { categoryId: string | null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-products', gymId] });
      setProductForm(emptyProductForm);
      setShowAddProduct(false);
    },
  });

  const updateProductMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductFormState }) =>
      updateProduct(id, {
        ...data,
        sku: data.sku || null,
        description: data.description || null,
        categoryId: data.categoryId || null,
      } as Partial<Product> & { categoryId: string | null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-products', gymId] });
      setEditingProduct(null);
    },
  });

  const deleteProductMut = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-products', gymId] });
      setDeleteTarget(null);
    },
  });

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setEditForm({
      name: p.name,
      sku: p.sku || '',
      description: p.description || '',
      purchasePrice: p.purchasePrice,
      sellingPrice: p.sellingPrice,
      stock: p.stock,
      minimumStock: p.minimumStock,
      categoryId: p.category?.id || '',
    });
  };

  const [showRecordSale, setShowRecordSale] = useState(false);
  const [saleItems, setSaleItems] = useState<SaleLineItem[]>([]);
  const [saleProductId, setSaleProductId] = useState('');
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [salePaymentMethod, setSalePaymentMethod] = useState('CASH');
  const [saleNotes, setSaleNotes] = useState('');

  const addSaleItem = () => {
    if (!saleProductId || saleQuantity <= 0) return;
    setSaleItems((prev) => {
      const existing = prev.find((i) => i.productId === saleProductId);
      if (existing) {
        return prev.map((i) => (i.productId === saleProductId ? { ...i, quantity: i.quantity + saleQuantity } : i));
      }
      return [...prev, { productId: saleProductId, quantity: saleQuantity }];
    });
    setSaleProductId('');
    setSaleQuantity(1);
  };

  const removeSaleItem = (productId: string) => {
    setSaleItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const saleEstimatedTotal = useMemo(() => {
    return saleItems.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      return sum + (product ? product.sellingPrice * item.quantity : 0);
    }, 0);
  }, [saleItems, products]);

  const createSaleMut = useMutation({
    mutationFn: () =>
      createSale(gymId, {
        items: saleItems,
        paymentMethod: salePaymentMethod,
        notes: saleNotes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-sales', gymId] });
      qc.invalidateQueries({ queryKey: ['inventory-products', gymId] });
      setSaleItems([]);
      setSaleNotes('');
      setSalePaymentMethod('CASH');
      setShowRecordSale(false);
    },
  });

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {productsLoading || salesLoading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-28 bg-surface-sunken rounded-card animate-pulse" />)
        ) : (
          <>
            <div className="bg-surface rounded-card p-5 border border-line">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Total products</p>
              <p className="text-2xl font-extrabold tabular-nums text-accent-ink">{products.length}</p>
            </div>
            <div className="bg-surface rounded-card p-5 border border-line">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Low stock</p>
              <p className="text-2xl font-extrabold tabular-nums text-warning-ink">{lowStockProducts.length}</p>
            </div>
            <div className="bg-surface rounded-card p-5 border border-line">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Total sales</p>
              <p className="text-2xl font-extrabold tabular-nums text-info-ink">{sales.length}</p>
            </div>
            <div className="bg-surface rounded-card p-5 border border-line">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">Total revenue</p>
              <p className="text-2xl font-extrabold tabular-nums text-success-ink">₹{totalRevenue.toLocaleString('en-IN')}</p>
            </div>
          </>
        )}
      </div>

      {/* Products */}
      <div className="bg-surface rounded-card border border-line overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex flex-wrap justify-between items-center gap-3">
          <h2 className="font-bold text-lg text-ink flex items-center gap-2">
            <Package className="w-5 h-5 text-accent-ink" /> Products ({products.length})
          </h2>
          <button
            type="button"
            onClick={() => setShowAddProduct((v) => !v)}
            className="btn-primary text-sm px-4 py-2"
          >
            {showAddProduct ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddProduct ? 'Close' : 'Add Product'}
          </button>
        </div>

        {showAddProduct && (
          <div className="px-6 py-5 border-b border-line bg-surface-sunken">
            <form
              className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!productForm.name.trim()) return;
                createProductMut.mutate(productForm);
              }}
            >
              <div>
                <label htmlFor="inventorytab-f1" className="block text-sm font-semibold text-ink mb-1.5">Name</label>
                <input id="inventorytab-f1" className="input-field" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required />
              </div>
              <div>
                <label htmlFor="inventorytab-f2" className="block text-sm font-semibold text-ink mb-1.5">SKU</label>
                <input id="inventorytab-f2" className="input-field" value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} />
              </div>
              <div>
                <label htmlFor="inventorytab-f3" className="block text-sm font-semibold text-ink mb-1.5">Category</label>
                <select id="inventorytab-f3" className="input-field" value={productForm.categoryId} onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}>
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label htmlFor="inventorytab-f4" className="block text-sm font-semibold text-ink mb-1.5">Description</label>
                <input id="inventorytab-f4" className="input-field" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} placeholder="Optional" />
              </div>
              <div>
                <label htmlFor="inventorytab-f5" className="block text-sm font-semibold text-ink mb-1.5">Purchase Price (₹)</label>
                <input id="inventorytab-f5" className="input-field" type="number" min={0} step="0.01" value={productForm.purchasePrice} onChange={(e) => setProductForm({ ...productForm, purchasePrice: Number(e.target.value) })} required />
              </div>
              <div>
                <label htmlFor="inventorytab-f6" className="block text-sm font-semibold text-ink mb-1.5">Selling Price (₹)</label>
                <input id="inventorytab-f6" className="input-field" type="number" min={0} step="0.01" value={productForm.sellingPrice} onChange={(e) => setProductForm({ ...productForm, sellingPrice: Number(e.target.value) })} required />
              </div>
              <div>
                <label htmlFor="inventorytab-f7" className="block text-sm font-semibold text-ink mb-1.5">Stock</label>
                <input id="inventorytab-f7" className="input-field" type="number" min={0} value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })} required />
              </div>
              <div>
                <label htmlFor="inventorytab-f8" className="block text-sm font-semibold text-ink mb-1.5">Minimum stock</label>
                <input id="inventorytab-f8" className="input-field" type="number" min={0} value={productForm.minimumStock} onChange={(e) => setProductForm({ ...productForm, minimumStock: Number(e.target.value) })} required />
              </div>
              <button type="submit" className="btn-primary justify-center sm:col-span-2 lg:col-span-4" disabled={createProductMut.isPending}>
                <Plus className="w-4 h-4" /> {createProductMut.isPending ? 'Saving…' : 'Save Product'}
              </button>
            </form>
          </div>
        )}

        {productsLoading ? (
          <div className="p-6">
            <div className="h-32 bg-surface-sunken rounded-control animate-pulse" />
          </div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-ink-muted">No products yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken">
                <tr>
                  {['Name', 'SKU', 'Category', 'Stock', 'Selling Price', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-bold text-ink-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {products.map((p) => {
                  const isLow = p.stock <= p.minimumStock;
                  return (
                    <tr key={p.id} className="hover:bg-surface-sunken">
                      <td className="px-6 py-4 font-semibold text-ink">{p.name}</td>
                      <td className="px-6 py-4 text-ink-muted">{p.sku || '-'}</td>
                      <td className="px-6 py-4 text-ink-muted">{p.category?.name || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 font-semibold tabular-nums ${isLow ? (p.stock <= 0 ? 'text-danger-ink' : 'text-warning-ink') : 'text-ink'}`}>
                          {isLow && <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />}
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-accent-ink tabular-nums">₹{p.sellingPrice.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            aria-label={`Edit ${p.name}`}
                            className="text-accent-ink hover:opacity-75"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(p)}
                            aria-label={`Delete ${p.name}`}
                            className="text-danger-ink hover:text-danger-ink"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Sale */}
      <div className="bg-surface rounded-card border border-line overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex flex-wrap justify-between items-center gap-3">
          <h2 className="font-bold text-lg text-ink flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-accent-ink" /> Record Sale
          </h2>
          <button
            type="button"
            onClick={() => setShowRecordSale((v) => !v)}
            className="btn-primary text-sm px-4 py-2"
          >
            {showRecordSale ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showRecordSale ? 'Close' : 'New Sale'}
          </button>
        </div>

        {showRecordSale && (
          <div className="px-6 py-5 space-y-4">
            <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
              <div>
                <label htmlFor="inventorytab-f9" className="block text-sm font-semibold text-ink mb-1.5">Product</label>
                <select id="inventorytab-f9" className="input-field" value={saleProductId} onChange={(e) => setSaleProductId(e.target.value)}>
                  <option value="">Select product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (₹{p.sellingPrice.toLocaleString('en-IN')}, stock {p.stock})</option>
                  ))}
                </select>
              </div>
              <div className="w-28">
                <label htmlFor="inventorytab-f10" className="block text-sm font-semibold text-ink mb-1.5">Qty</label>
                <input id="inventorytab-f10" className="input-field" type="number" min={1} value={saleQuantity} onChange={(e) => setSaleQuantity(Number(e.target.value))} />
              </div>
              <button type="button" onClick={addSaleItem} className="btn-outline px-4 py-3" disabled={!saleProductId}>
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>

            {saleItems.length > 0 && (
              <div className="border border-line rounded-control overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-surface-sunken">
                    <tr>
                      {['Product', 'Qty', 'Line Total', ''].map((h) => (
                        <th key={h} className="text-left px-4 py-2 text-xs font-bold text-ink-muted uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {saleItems.map((item) => {
                      const product = products.find((p) => p.id === item.productId);
                      const lineTotal = (product?.sellingPrice || 0) * item.quantity;
                      return (
                        <tr key={item.productId}>
                          <td className="px-4 py-2 font-semibold text-ink">{product?.name || 'Unknown product'}</td>
                          <td className="px-4 py-2 tabular-nums text-ink-muted">{item.quantity}</td>
                          <td className="px-4 py-2 font-semibold tabular-nums text-accent-ink">₹{lineTotal.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => removeSaleItem(item.productId)}
                              aria-label={`Remove ${product?.name || 'item'} from sale`}
                              className="text-danger-ink hover:text-danger-ink"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="inventorytab-f11" className="block text-sm font-semibold text-ink mb-1.5">Payment method</label>
                <select id="inventorytab-f11" className="input-field" value={salePaymentMethod} onChange={(e) => setSalePaymentMethod(e.target.value)}>
                  {paymentMethods.map((m) => (
                    <option key={m} value={m}>{m.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="inventorytab-f12" className="block text-sm font-semibold text-ink mb-1.5">Notes</label>
                <input id="inventorytab-f12" className="input-field" value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} placeholder="Optional" maxLength={1000} />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-sm font-semibold text-ink">
                Estimated Total: <span className="tabular-nums text-accent-ink">₹{saleEstimatedTotal.toLocaleString('en-IN')}</span>
              </p>
              <button
                type="button"
                onClick={() => createSaleMut.mutate()}
                disabled={saleItems.length === 0 || createSaleMut.isPending}
                className="btn-primary px-6 py-2"
              >
                {createSaleMut.isPending ? 'Saving…' : 'Complete Sale'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recent Sales */}
      <div className="bg-surface rounded-card border border-line overflow-hidden">
        <div className="px-6 py-4 border-b border-line">
          <h2 className="font-bold text-lg text-ink">Recent Sales ({sales.length})</h2>
        </div>
        {salesLoading ? (
          <div className="p-6">
            <div className="h-32 bg-surface-sunken rounded-control animate-pulse" />
          </div>
        ) : sales.length === 0 ? (
          <div className="p-8 text-center text-ink-muted">No sales yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken">
                <tr>
                  {['Date', 'Items', 'Final Amount', 'Payment Method'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-bold text-ink-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-sunken">
                    <td className="px-6 py-4 text-ink-muted">{new Date(s.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="px-6 py-4 text-ink-muted max-w-[280px] truncate" title={s.items.map((i) => `${i.product.name} x${i.quantity}`).join(', ')}>
                      {s.items.map((i) => `${i.product.name} x${i.quantity}`).join(', ') || '-'}
                    </td>
                    <td className="px-6 py-4 font-semibold text-accent-ink tabular-nums">₹{s.finalAmount.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-ink-muted">{s.paymentMethod || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog
        open={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        title="Edit product"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingProduct(null)}>Cancel</Button>
            <Button type="submit" form="edit-product-form" loading={updateProductMut.isPending}>Save changes</Button>
          </>
        }
      >
        <form
          id="edit-product-form"
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!editingProduct) return;
            updateProductMut.mutate({ id: editingProduct.id, data: editForm });
          }}
        >
          <Field label="Name" required>
            <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </Field>
          <Field label="SKU">
            <Input value={editForm.sku} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} />
          </Field>
          <Field label="Category" className="sm:col-span-2">
            <Select value={editForm.categoryId} onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}>
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Optional" />
          </Field>
          <Field label="Purchase price (₹)" required>
            <Input type="number" min={0} step="0.01" value={editForm.purchasePrice} onChange={(e) => setEditForm({ ...editForm, purchasePrice: Number(e.target.value) })} />
          </Field>
          <Field label="Selling price (₹)" required>
            <Input type="number" min={0} step="0.01" value={editForm.sellingPrice} onChange={(e) => setEditForm({ ...editForm, sellingPrice: Number(e.target.value) })} />
          </Field>
          <Field label="Stock" required>
            <Input type="number" min={0} value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: Number(e.target.value) })} />
          </Field>
          <Field label="Minimum stock" required>
            <Input type="number" min={0} value={editForm.minimumStock} onChange={(e) => setEditForm({ ...editForm, minimumStock: Number(e.target.value) })} />
          </Field>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete product"
        message={`Delete "${deleteTarget?.name}" from your inventory? This can't be undone.`}
        confirmLabel="Delete"
        loading={deleteProductMut.isPending}
        onConfirm={() => { if (deleteTarget) deleteProductMut.mutate(deleteTarget.id); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
