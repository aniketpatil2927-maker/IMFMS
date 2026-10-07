import axios from 'axios';

const rawBaseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const apiBaseUrl = rawBaseUrl
  ? rawBaseUrl.replace(/\/+$/, '').endsWith('/api')
    ? rawBaseUrl.replace(/\/+$/, '')
    : `${rawBaseUrl.replace(/\/+$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL: apiBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hkbams_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hkbams_token');
      localStorage.removeItem('hkbams_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
