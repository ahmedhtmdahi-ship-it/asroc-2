import { apiClient } from './apiClient';

export const checkupService = {
  // Employee
  async getMyRequests(page = 1) {
    return apiClient.get(`/employee/requests?page=${page}`);
  },
  async getCheckupBalance() {
    return apiClient.get('/employee/checkup-balance');
  },
  async createRequest(data: { type: 'normal' | 'emergency'; notes?: string }) {
    return apiClient.post('/employee/requests', data);
  },
  async cancelRequest(id: number) {
    return apiClient.delete(`/employee/requests/${id}/cancel`);
  },
  async getRequest(id: number) {
    return apiClient.get(`/employee/requests/${id}`);
  },

  // Manager
  async getPendingRequests(page = 1) {
    return apiClient.get(`/manager/requests?page=${page}`);
  },
  async approveRequest(id: number) {
    return apiClient.post(`/manager/requests/${id}/approve`);
  },
  async rejectRequest(id: number, rejection_reason: string) {
    return apiClient.post(`/manager/requests/${id}/reject`, { rejection_reason });
  },
  async postponeRequest(id: number, postponed_until: string, notes?: string) {
    return apiClient.post(`/manager/requests/${id}/postpone`, { postponed_until, notes });
  },

  // Security
  async getApprovedRequests() {
    return apiClient.get('/security/approved-requests');
  },
  async getOutsideNow() {
    return apiClient.get('/security/outside-now');
  },
  async getLateEmployees() {
    return apiClient.get('/security/late-employees');
  },
  async checkout(id: number) {
    return apiClient.post(`/security/requests/${id}/checkout`);
  },
  async registerReturn(id: number) {
    return apiClient.post(`/security/requests/${id}/return`);
  },

  // Doctor
  async getDoctorQueue() {
    return apiClient.get('/doctor/queue');
  },
  async writeDiagnosis(id: number, diagnosis_text: string) {
    return apiClient.post(`/doctor/requests/${id}/diagnose`, { diagnosis_text });
  },
  async writePrescription(id: number, data: { items: unknown[]; notes?: string }) {
    return apiClient.post(`/doctor/requests/${id}/prescription`, data);
  },
  async writeSickLeave(id: number, data: { days_count: number; reason: string; start_date: string }) {
    return apiClient.post(`/doctor/requests/${id}/sick-leave`, data);
  },
  async writeReferral(id: number, data: unknown) {
    return apiClient.post(`/doctor/requests/${id}/referral`, data);
  },

  // Internal Pharmacy
  async getPendingPrescriptions() {
    return apiClient.get('/internal-pharmacy/prescriptions');
  },
  async dispensePrescription(id: number) {
    return apiClient.post(`/internal-pharmacy/prescriptions/${id}/dispense`);
  },
};
