import { useMemo, useState } from 'react';
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

  // ---------- Stats ----------
  const lowStockProducts = useMemo(() => products.filter((p) => p.stock <= p.minimumStock), [products]);
  const totalRevenue = useMemo(() => sales.reduce((sum, s) => sum + s.finalAmount, 0), [sales]);

  // ---------- Add / edit product ----------
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

  // ---------- Record sale ----------
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
          [...Array(4)].map((_, i) => <div key={i} className="h-28 bg-[var(--color-border)]/30 rounded-2xl animate-pulse" />)
        ) : (
          <>
            <div className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)]">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1">Total Products</p>
              <p className="text-2xl font-extrabold tabular-nums text-[var(--color-primary)]">{products.length}</p>
            </div>
            <div className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)]">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1">Low Stock</p>
              <p className="text-2xl font-extrabold tabular-nums text-amber-500">{lowStockProducts.length}</p>
            </div>
            <div className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)]">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1">Total Sales</p>
              <p className="text-2xl font-extrabold tabular-nums text-blue-500">{sales.length}</p>
            </div>
            <div className="bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-border)]">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1">Total Revenue</p>
              <p className="text-2xl font-extrabold tabular-nums text-green-600">₹{totalRevenue.toLocaleString('en-IN')}</p>
            </div>
          </>
        )}
      </div>

      {/* Products */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex flex-wrap justify-between items-center gap-3">
          <h2 className="font-bold text-lg text-[var(--color-deepgray)] dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-[var(--color-primary)]" /> Products ({products.length})
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
          <div className="px-6 py-5 border-b border-[var(--color-border)] bg-[var(--color-border)]/5">
            <form
              className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!productForm.name.trim()) return;
                createProductMut.mutate(productForm);
              }}
            >
              <div>
                <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Name</label>
                <input className="input-field" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">SKU</label>
                <input className="input-field" value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Category</label>
                <select className="input-field" value={productForm.categoryId} onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}>
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Description</label>
                <input className="input-field" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} placeholder="Optional" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Purchase Price (₹)</label>
                <input className="input-field" type="number" min={0} step="0.01" value={productForm.purchasePrice} onChange={(e) => setProductForm({ ...productForm, purchasePrice: Number(e.target.value) })} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Selling Price (₹)</label>
                <input className="input-field" type="number" min={0} step="0.01" value={productForm.sellingPrice} onChange={(e) => setProductForm({ ...productForm, sellingPrice: Number(e.target.value) })} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Stock</label>
                <input className="input-field" type="number" min={0} value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Minimum Stock</label>
                <input className="input-field" type="number" min={0} value={productForm.minimumStock} onChange={(e) => setProductForm({ ...productForm, minimumStock: Number(e.target.value) })} required />
              </div>
              <button type="submit" className="btn-primary justify-center sm:col-span-2 lg:col-span-4" disabled={createProductMut.isPending}>
                <Plus className="w-4 h-4" /> {createProductMut.isPending ? 'Saving…' : 'Save Product'}
              </button>
            </form>
          </div>
        )}

        {productsLoading ? (
          <div className="p-6">
            <div className="h-32 bg-[var(--color-border)]/30 rounded-xl animate-pulse" />
          </div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-muted)]">No products yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  {['Name', 'SKU', 'Category', 'Stock', 'Selling Price', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {products.map((p) => {
                  const isLow = p.stock <= p.minimumStock;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-6 py-4 font-semibold text-[var(--color-deepgray)] dark:text-white">{p.name}</td>
                      <td className="px-6 py-4 text-[var(--color-muted)]">{p.sku || '—'}</td>
                      <td className="px-6 py-4 text-[var(--color-muted)]">{p.category?.name || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 font-semibold tabular-nums ${isLow ? (p.stock <= 0 ? 'text-red-500' : 'text-amber-500') : 'text-[var(--color-deepgray)] dark:text-white'}`}>
                          {isLow && <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />}
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-[var(--color-primary)] tabular-nums">₹{p.sellingPrice.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            aria-label={`Edit ${p.name}`}
                            className="text-[var(--color-primary)] hover:opacity-75"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(p)}
                            aria-label={`Delete ${p.name}`}
                            className="text-red-500 hover:text-red-700"
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
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex flex-wrap justify-between items-center gap-3">
          <h2 className="font-bold text-lg text-[var(--color-deepgray)] dark:text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[var(--color-primary)]" /> Record Sale
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
                <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Product</label>
                <select className="input-field" value={saleProductId} onChange={(e) => setSaleProductId(e.target.value)}>
                  <option value="">Select product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (₹{p.sellingPrice.toLocaleString('en-IN')}, stock {p.stock})</option>
                  ))}
                </select>
              </div>
              <div className="w-28">
                <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Qty</label>
                <input className="input-field" type="number" min={1} value={saleQuantity} onChange={(e) => setSaleQuantity(Number(e.target.value))} />
              </div>
              <button type="button" onClick={addSaleItem} className="btn-outline px-4 py-3" disabled={!saleProductId}>
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>

            {saleItems.length > 0 && (
              <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                      {['Product', 'Qty', 'Line Total', ''].map((h) => (
                        <th key={h} className="text-left px-4 py-2 text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {saleItems.map((item) => {
                      const product = products.find((p) => p.id === item.productId);
                      const lineTotal = (product?.sellingPrice || 0) * item.quantity;
                      return (
                        <tr key={item.productId}>
                          <td className="px-4 py-2 font-semibold text-[var(--color-deepgray)] dark:text-white">{product?.name || 'Unknown product'}</td>
                          <td className="px-4 py-2 tabular-nums text-[var(--color-muted)]">{item.quantity}</td>
                          <td className="px-4 py-2 font-semibold tabular-nums text-[var(--color-primary)]">₹{lineTotal.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => removeSaleItem(item.productId)}
                              aria-label={`Remove ${product?.name || 'item'} from sale`}
                              className="text-red-500 hover:text-red-700"
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
                <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Payment Method</label>
                <select className="input-field" value={salePaymentMethod} onChange={(e) => setSalePaymentMethod(e.target.value)}>
                  {paymentMethods.map((m) => (
                    <option key={m} value={m}>{m.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Notes</label>
                <input className="input-field" value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} placeholder="Optional" maxLength={1000} />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-sm font-semibold text-[var(--color-deepgray)] dark:text-white">
                Estimated Total: <span className="tabular-nums text-[var(--color-primary)]">₹{saleEstimatedTotal.toLocaleString('en-IN')}</span>
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
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-bold text-lg text-[var(--color-deepgray)] dark:text-white">Recent Sales ({sales.length})</h2>
        </div>
        {salesLoading ? (
          <div className="p-6">
            <div className="h-32 bg-[var(--color-border)]/30 rounded-xl animate-pulse" />
          </div>
        ) : sales.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-muted)]">No sales yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  {['Date', 'Items', 'Final Amount', 'Payment Method'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-6 py-4 text-[var(--color-muted)]">{new Date(s.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="px-6 py-4 text-[var(--color-muted)] max-w-[280px] truncate" title={s.items.map((i) => `${i.product.name} x${i.quantity}`).join(', ')}>
                      {s.items.map((i) => `${i.product.name} x${i.quantity}`).join(', ') || '—'}
                    </td>
                    <td className="px-6 py-4 font-semibold text-[var(--color-primary)] tabular-nums">₹{s.finalAmount.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-[var(--color-muted)]">{s.paymentMethod || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit product modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditingProduct(null)}>
          <div
            className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg text-[var(--color-deepgray)] dark:text-white mb-4">Edit Product</h3>
            <form
              className="grid sm:grid-cols-2 gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingProduct) return;
                updateProductMut.mutate({ id: editingProduct.id, data: editForm });
              }}
            >
              <div>
                <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Name</label>
                <input className="input-field" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">SKU</label>
                <input className="input-field" value={editForm.sku} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Category</label>
                <select className="input-field" value={editForm.categoryId} onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}>
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Description</label>
                <input className="input-field" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Optional" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Purchase Price (₹)</label>
                <input className="input-field" type="number" min={0} step="0.01" value={editForm.purchasePrice} onChange={(e) => setEditForm({ ...editForm, purchasePrice: Number(e.target.value) })} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Selling Price (₹)</label>
                <input className="input-field" type="number" min={0} step="0.01" value={editForm.sellingPrice} onChange={(e) => setEditForm({ ...editForm, sellingPrice: Number(e.target.value) })} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Stock</label>
                <input className="input-field" type="number" min={0} value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: Number(e.target.value) })} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-deepgray)] dark:text-gray-300 mb-1.5">Minimum Stock</label>
                <input className="input-field" type="number" min={0} value={editForm.minimumStock} onChange={(e) => setEditForm({ ...editForm, minimumStock: Number(e.target.value) })} required />
              </div>
              <div className="sm:col-span-2 flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={updateProductMut.isPending}>
                  {updateProductMut.isPending ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" className="btn-outline px-5" onClick={() => setEditingProduct(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
