import api from '../services/api';

export interface Product {
  id: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  minimumStock: number;
  expiryDate?: string | null;
  batchNumber?: string | null;
  isActive: boolean;
  category?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
}

export interface ProductCategory {
  id: string;
  name: string;
  _count?: { products: number };
}

export interface Sale {
  id: string;
  total: number;
  discount: number;
  tax: number;
  finalAmount: number;
  paymentMethod?: string | null;
  status: string;
  receiptNumber?: string | null;
  notes?: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    total: number;
    product: { id: string; name: string };
  }>;
}

export const getProducts = async (gymId: string, params?: { category?: string; search?: string; lowStock?: string }) => {
  const response = await api.get<Product[]>(`/inventory/gym/${gymId}/products`, { params });
  return response.data;
};

export const createProduct = async (gymId: string, data: Partial<Product>) => {
  const response = await api.post<Product>(`/inventory/gym/${gymId}/products`, data);
  return response.data;
};

export const updateProduct = async (id: string, data: Partial<Product>) => {
  const response = await api.put<Product>(`/inventory/products/${id}`, data);
  return response.data;
};

export const deleteProduct = async (id: string) => {
  const response = await api.delete(`/inventory/products/${id}`);
  return response.data;
};

export const getCategories = async (gymId: string) => {
  const response = await api.get<ProductCategory[]>(`/inventory/gym/${gymId}/categories`);
  return response.data;
};

export const createCategory = async (gymId: string, name: string) => {
  const response = await api.post<ProductCategory>(`/inventory/gym/${gymId}/categories`, { name });
  return response.data;
};

export const getSales = async (gymId: string) => {
  const response = await api.get<Sale[]>(`/inventory/gym/${gymId}/sales`);
  return response.data;
};

export const createSale = async (gymId: string, data: {
  items: Array<{ productId: string; quantity: number }>;
  discount?: number;
  tax?: number;
  paymentMethod?: string;
  notes?: string;
}) => {
  const response = await api.post<Sale>(`/inventory/gym/${gymId}/sales`, data);
  return response.data;
};
