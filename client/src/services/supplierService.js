import API from './api';

export const getSuppliers = async (params = {}) => {
  const response = await API.get('/suppliers', { params });
  return response.data;
};

export const getSupplierById = async (id) => {
  const response = await API.get(`/suppliers/${id}`);
  return response.data;
};

export const createSupplier = async (supplierData) => {
  const response = await API.post('/suppliers', supplierData);
  return response.data;
};

export const updateSupplier = async (id, supplierData) => {
  const response = await API.put(`/suppliers/${id}`, supplierData);
  return response.data;
};

export const deleteSupplier = async (id) => {
  const response = await API.delete(`/suppliers/${id}`);
  return response.data;
};
