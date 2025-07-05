import axios from 'axios';

// Create a new axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Make sure this matches your server's address
  headers: {
    'Content-Type': 'application/json',
  },
});

// IMPORTANT: Add a request interceptor
api.interceptors.request.use(
  (config) => {
    // Get the token from localStorage
    const token = localStorage.getItem('token');

    // If the token exists, add it to the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    // Handle request errors
    return Promise.reject(error);
  }
);

export default api;