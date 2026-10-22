import API from './api';

export const getWasteRecords = async (params = {}) => {
  const response = await API.get('/waste', { params });
  return response.data;
};

export const createWasteRecord = async (data) => {
  const response = await API.post('/waste', data);
  return response.data;
};

export const getWasteAnalytics = async () => {
  const response = await API.get('/waste/analytics');
  return response.data;
};

export const deleteWasteRecord = async (id) => {
  const response = await API.delete(`/waste/${id}`);
  return response.data;
};
