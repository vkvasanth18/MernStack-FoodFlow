import API from './api';

export const getTransactions = async (params = {}) => {
  const response = await API.get('/inventory/transactions', { params });
  return response.data;
};

export const recordTransaction = async (data) => {
  const response = await API.post('/inventory/transactions', data);
  return response.data;
};

export const getInventorySummary = async () => {
  const response = await API.get('/inventory/summary');
  return response.data;
};
