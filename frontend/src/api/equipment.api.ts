import api from '../services/api';

export interface Equipment {
  id: string;
  name: string;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  warrantyExpiry?: string | null;
  location?: string | null;
  condition: string;
  notes?: string | null;
  maintenanceLogs: MaintenanceLog[];
}

export interface MaintenanceLog {
  id: string;
  type: string;
  description: string;
  cost: number;
  date: string;
  nextDue?: string | null;
}

export const getEquipment = async (gymId: string, params?: { condition?: string }) => {
  const response = await api.get<Equipment[]>(`/equipment/gym/${gymId}`, { params });
  return response.data;
};

export const addEquipment = async (gymId: string, data: Partial<Equipment>) => {
  const response = await api.post<Equipment>(`/equipment/gym/${gymId}`, data);
  return response.data;
};

export const updateEquipment = async (id: string, data: Partial<Equipment>) => {
  const response = await api.put<Equipment>(`/equipment/${id}`, data);
  return response.data;
};

export const recordMaintenance = async (id: string, data: {
  type: string;
  description: string;
  cost?: number;
  nextDue?: string;
}) => {
  const response = await api.post<MaintenanceLog>(`/equipment/${id}/maintenance`, data);
  return response.data;
};

export const deleteEquipment = async (id: string) => {
  const response = await api.delete(`/equipment/${id}`);
  return response.data;
};
