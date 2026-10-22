import API from './api';

export const getRawMaterials = async (params = {}) => {
  const response = await API.get('/raw-materials', { params });
  return response.data;
};

export const getRawMaterialById = async (id) => {
  const response = await API.get(`/raw-materials/${id}`);
  return response.data;
};

export const createRawMaterial = async (materialData) => {
  const response = await API.post('/raw-materials', materialData);
  return response.data;
};

export const updateRawMaterial = async (id, materialData) => {
  const response = await API.put(`/raw-materials/${id}`, materialData);
  return response.data;
};

export const deleteRawMaterial = async (id) => {
  const response = await API.delete(`/raw-materials/${id}`);
  return response.data;
};
