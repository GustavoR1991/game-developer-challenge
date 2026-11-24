import axios from 'axios';
import { apiSettings } from './apiRuntime';

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || '/api';

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: 'application/json' },
});

httpClient.interceptors.request.use((config) => {
  config.timeout = apiSettings().timeoutMs;
  return config;
});
