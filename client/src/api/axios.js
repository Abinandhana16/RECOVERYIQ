import axios from 'axios';

const TOKEN_KEY = 'recoveryiq_token';

let currentToken = null;
try {
  currentToken = localStorage.getItem(TOKEN_KEY) || null;
} catch {
  currentToken = null;
}

/**
 * Update the in-memory JWT token used for API requests.
 * Called by AuthContext whenever authentication state changes.
 */
export const setAuthToken = (token) => {
  currentToken = token;
};

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor attaching Bearer token
api.interceptors.request.use(
  (config) => {
    let token = currentToken;
    if (!token) {
      try {
        token = localStorage.getItem(TOKEN_KEY);
      } catch {
        token = null;
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const USER_KEY = 'recoveryiq_user';

// Response interceptor for clear error handling and 401 redirection
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');

    if (error.response?.status === 401 && !isAuthEndpoint) {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      } catch {
        // Ignore localStorage access errors
      }
      currentToken = null;
      window.location.href = '/login';
    }

    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;
