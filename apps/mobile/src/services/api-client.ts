import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('mondega_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = await AsyncStorage.getItem('mondega_refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefresh } = res.data;

          await AsyncStorage.setItem('mondega_access_token', accessToken);
          await AsyncStorage.setItem('mondega_refresh_token', newRefresh);

          original.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(original);
        } catch {
          await AsyncStorage.multiRemove(['mondega_access_token', 'mondega_refresh_token']);
          // Navigation reset to Login handled by app root
        }
      }
    }

    return Promise.reject(error);
  },
);
