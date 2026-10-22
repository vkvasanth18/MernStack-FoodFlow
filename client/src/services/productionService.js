import API from './api';

export const getProductions = async (params = {}) => {
  const response = await API.get('/production', { params });
  return response.data;
};

export const getProductionById = async (id) => {
  const response = await API.get(`/production/${id}`);
  return response.data;
};

export const createProduction = async (data) => {
  const response = await API.post('/production', data);
  return response.data;
};

export const updateProduction = async (id, data) => {
  const response = await API.put(`/production/${id}`, data);
  return response.data;
};

export const deleteProduction = async (id) => {
  const response = await API.delete(`/production/${id}`);
  return response.data;
};
