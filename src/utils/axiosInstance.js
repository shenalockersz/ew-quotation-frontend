// Simple axios instance with your env-driven base URL
import axios from 'axios';

const baseURL = `${import.meta.env.VITE_PROTOCOL}://${
  import.meta.env.VITE_HOST
}:${import.meta.env.VITE_PORT}${import.meta.env.VITE_PREFIX}`;

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  // withCredentials: true, // <- enable if you need cookies
});

// Optional: response interceptor for centralized error logs
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('API Error:', err?.response?.data || err.message);
    return Promise.reject(err);
  }
);

export default api;
