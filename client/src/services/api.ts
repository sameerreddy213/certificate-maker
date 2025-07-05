// client/src/services/api.ts

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Make sure this matches your server's address
});

// Add a request interceptor to include the token in all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;