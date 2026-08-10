import api from '../services/api';

export interface NutritionPlan {
  id: string;
  title: string;
  calories?: number | null;
  meals: string;
  createdAt: string;
  updatedAt: string;
}

export interface NutritionMeal {
  label: string;
  items: string;
}

export const getMyNutritionPlans = async () => {
  const response = await api.get<NutritionPlan[]>('/nutrition');
  return response.data;
};

export const createNutritionPlan = async (data: {
  title: string;
  calories?: number | null;
  meals: string;
}) => {
  const response = await api.post<NutritionPlan>('/nutrition', data);
  return response.data;
};

export const updateNutritionPlan = async (
  id: string,
  data: { title: string; calories?: number | null; meals: string },
) => {
  const response = await api.put<NutritionPlan>(`/nutrition/${id}`, data);
  return response.data;
};

export const deleteNutritionPlan = async (id: string) => {
  const response = await api.delete(`/nutrition/${id}`);
  return response.data;
};

export const parseNutritionMeals = (raw: string): NutritionMeal[] => {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};
