import axios from 'axios';

const defaultApiUrl = import.meta.env.DEV
  ? 'http://localhost:4000'
  : 'https://collaborative-editor-backend-472m.onrender.com';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || defaultApiUrl });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
