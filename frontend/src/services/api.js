import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dairy_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('dairy_token');
      localStorage.removeItem('dairy_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  register: (data) => api.post('/auth/register', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  getUsers: () => api.get('/auth/users'),
};

export const farmersAPI = {
  getAll: (params) => api.get('/farmers', { params }),
  getStats: (id) => api.get(`/farmers/${id}/stats`),
  create: (data) => api.post('/farmers', data),
  update: (id, data) => api.put(`/farmers/${id}`, data),
  delete: (id) => api.delete(`/farmers/${id}`),
};

export const milkAPI = {
  getAll: (params) => api.get('/milk', { params }),
  create: (data) => api.post('/milk', data),
  dailyReport: (date) => api.get('/milk/report/daily', { params: { date } }),
  markPaid: (id) => api.patch(`/milk/${id}/pay`),
};

export const productionAPI = {
  getAll: (params) => api.get('/production', { params }),
  create: (data) => api.post('/production', data),
  getOne: (id) => api.get(`/production/${id}`),
  getExpiring: () => api.get('/production/alerts/expiring'),
};

export const inventoryAPI = {
  getAll: () => api.get('/inventory'),
  getBatches: (params) => api.get('/inventory/batches', { params }),
  getMovements: () => api.get('/inventory/movements'),
  updateThreshold: (productType, threshold) => api.patch(`/inventory/${productType}/threshold`, { threshold }),
  getLowStock: () => api.get('/inventory/alerts/low-stock'),
};

export const salesAPI = {
  getAll: (params) => api.get('/sales', { params }),
  create: (data) => api.post('/sales', data),
  getOne: (id) => api.get(`/sales/${id}`),
  markPaid: (id) => api.patch(`/sales/${id}/pay`),
  dailyReport: (date) => api.get('/sales/report/daily', { params: { date } }),
  getCustomers: () => api.get('/sales/customers'),
  createCustomer: (data) => api.post('/sales/customers', data),
  updateCustomer: (id, data) => api.put(`/sales/customers/${id}`, data),
};

export const analyticsAPI = {
  getKPIs: () => api.get('/analytics/kpis'),
  getTrends: (days) => api.get('/analytics/trends', { params: { days } }),
  getForecast: (type, days) => api.get('/analytics/forecast', { params: { type, days } }),
  getSalesForecast: () => api.get('/analytics/forecast/sales'),
  getOptimize: () => api.get('/analytics/optimize'),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const dashboardAPI = {
  getSummary: () => api.get('/dashboard/summary'),
};

export default api;
