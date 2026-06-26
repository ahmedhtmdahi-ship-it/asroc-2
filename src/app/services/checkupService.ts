import { apiClient, API_URL } from './apiClient';

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

  // Medicines
  async getMedicines(params?: { search?: string; per_page?: number }) {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.per_page) qs.set('per_page', String(params.per_page));
    const query = qs.toString() ? `?${qs}` : '';
    return apiClient.get(`/medicines${query}`);
  },
  async createMedicine(data: unknown) {
    return apiClient.post('/medicines', data);
  },
  async updateMedicine(id: number, data: unknown) {
    return apiClient.put(`/medicines/${id}`, data);
  },
  async deleteMedicine(id: number) {
    return apiClient.delete(`/medicines/${id}`);
  },

  // Medical Admin — Referrals
  async getPendingReferrals() {
    return apiClient.get('/medical-admin/referrals');
  },
  async approveReferral(id: number) {
    return apiClient.post(`/medical-admin/referrals/${id}/approve`);
  },
  async rejectReferral(id: number, rejection_reason: string) {
    return apiClient.post(`/medical-admin/referrals/${id}/reject`, { rejection_reason });
  },
  getReferralPdfUrl(id: number): string {
    return `${API_URL}/medical-admin/referrals/${id}/pdf`;
  },

  // Internal Pharmacy
  async getPendingPrescriptions() {
    return apiClient.get('/internal-pharmacy/prescriptions');
  },
  async dispensePrescription(id: number) {
    return apiClient.post(`/internal-pharmacy/prescriptions/${id}/dispense`);
  },

  // Monthly Treatments
  async getMonthlyTreatments(params?: { status?: string; per_page?: number }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.per_page) qs.set('per_page', String(params.per_page));
    const query = qs.toString() ? `?${qs}` : '';
    return apiClient.get(`/monthly-treatments${query}`);
  },
  async createMonthlyTreatment(data: unknown) {
    return apiClient.post('/monthly-treatments', data);
  },
  async pauseMonthlyTreatment(id: number) {
    return apiClient.post(`/monthly-treatments/${id}/pause`);
  },
  async discontinueMonthlyTreatment(id: number) {
    return apiClient.post(`/monthly-treatments/${id}/discontinue`);
  },

  // External Pharmacy
  async getExternalMonthlyTreatments() {
    return apiClient.get('/external-pharmacy/monthly-treatments');
  },
  async dispenseExternalTreatment(id: number) {
    return apiClient.post(`/external-pharmacy/treatments/${id}/dispense`);
  },
};
