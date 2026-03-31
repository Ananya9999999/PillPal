import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'https://pillpal-production-3752.up.railway.app/') + '/api'
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('pillpal_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pillpal_token');
      localStorage.removeItem('pillpal_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export const auth = {
  register: data => api.post('/auth/register', data),
  login:    data => api.post('/auth/login', data),
  me:       ()   => api.get('/auth/me'),
};

export const medications = {
  getAll: ()         => api.get('/medications'),
  create: data       => api.post('/medications', data),
  update: (id, data) => api.put(`/medications/${id}`, data),
  delete: id         => api.delete(`/medications/${id}`),
};

export const schedules = {
  getAll: ()         => api.get('/schedules'),
  create: data       => api.post('/schedules', data),
  update: (id, data) => api.put(`/schedules/${id}`, data),
  delete: id         => api.delete(`/schedules/${id}`),
};

export const logs = {
  getAll: params     => api.get('/logs', { params }),
  patch:  (id, data) => api.patch(`/logs/${id}`, data),
};

export const dashboard = {
  get: () => api.get('/dashboard'),
};

export const device = {
  get:    ()   => api.get('/device'),
  update: data => api.put('/device', data),
};

export const nextDose = {
  get: () => api.get('/next-dose'),
};

export function createEventSource() {
  const token = localStorage.getItem('pillpal_token');
  return new EventSource(`/api/events?_t=${Date.now()}`, {
   
    withCredentials: false,
  });
}

export default api;
