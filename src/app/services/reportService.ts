import { apiClient } from './apiClient';

export const reportService = {
  async getDashboard() {
    return apiClient.get('/reports/dashboard');
  },
  async getDaily(date?: string) {
    const query = date ? `?date=${date}` : '';
    return apiClient.get(`/reports/daily${query}`);
  },
  async getMonthly(month?: string) {
    const query = month ? `?month=${month}` : '';
    return apiClient.get(`/reports/monthly${query}`);
  },
};
