// ──────────────────────────────────────────────
// API Client — typed HTTP client
// ──────────────────────────────────────────────

import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@collectorhub/shared-types';

export interface ApiClientConfig {
  baseURL: string;
  getAccessToken: () => string | null;
  onTokenRefresh?: (newToken: string) => void;
  onAuthError?: () => void;
}

export class ApiClient {
  private client: AxiosInstance;

  constructor(private config: ApiClientConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    // Attach token on every request
    this.client.interceptors.request.use((reqConfig) => {
      const token = this.config.getAccessToken();
      if (token) {
        reqConfig.headers.Authorization = `Bearer ${token}`;
      }
      return reqConfig;
    });
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const res = await this.client.get<ApiResponse<T>>(url, config);
    return res.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const res = await this.client.post<ApiResponse<T>>(url, data, config);
    return res.data;
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const res = await this.client.patch<ApiResponse<T>>(url, data, config);
    return res.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const res = await this.client.delete<ApiResponse<T>>(url, config);
    return res.data;
  }
}
