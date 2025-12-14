/**
 * API Client for Frontend
 * Handles all API calls to the backend with secure cookie-based authentication
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100/api';

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Send cookies with requests
    });

    // Response interceptor for error handling
    // Note: We don't auto-redirect on 401 here - let AuthContext handle that
    // This allows for proper token refresh flow without race conditions
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as any;

        // Only try refresh once per request to avoid infinite loops
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Token expired - try to refresh
            await this.refreshToken();
            // Retry the original request with new token
            return this.client.request(originalRequest);
          } catch (refreshError) {
            // Refresh failed - don't redirect here, let AuthContext handle it
            // This allows the calling code to decide what to do
            return Promise.reject(error);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Clear client-side state (non-sensitive data only)
   */
  private clearClientState() {
    if (typeof window !== 'undefined') {
      // Only clear non-sensitive UI state, NOT auth tokens
      localStorage.removeItem('user_preferences');
      sessionStorage.clear();
    }
  }

  /**
   * Get user info from cookie (non-httpOnly cookie set by backend)
   */
  getUserInfo(): any | null {
    if (typeof window === 'undefined') return null;

    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('user_info='));

    if (!cookie) return null;

    try {
      return JSON.parse(decodeURIComponent(cookie.split('=')[1]));
    } catch {
      return null;
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName?: string;
  }) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async logout() {
    try {
      await this.client.post('/auth/logout');
    } finally {
      this.clearClientState();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }

  async refreshToken() {
    const response = await this.client.post('/auth/refresh');
    return response.data;
  }

  async forgotPassword(email: string) {
    return this.client.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, password: string) {
    return this.client.post('/auth/reset-password', { token, password });
  }

  async verifyEmail(token: string) {
    return this.client.post('/auth/verify-email', { token });
  }

  async resendVerification(email: string) {
    return this.client.post('/auth/resend-verification', { email });
  }

  // MFA endpoints
  async setupMFA() {
    const response = await this.client.post('/auth/setup-mfa');
    return response.data;
  }

  async completeMFA(code: string) {
    const response = await this.client.post('/auth/complete-mfa', { code });
    return response.data;
  }

  async disableMFA(password: string) {
    const response = await this.client.post('/auth/disable-mfa', { password });
    return response.data;
  }

  async verifyMFA(mfaToken: string, code: string) {
    const response = await this.client.post('/auth/verify-mfa', { mfaToken, code });
    return response.data;
  }

  // User endpoints
  async getCurrentUser() {
    const response = await this.client.get('/users/me');
    return response.data;
  }

  async updateProfile(data: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    avatar: string;
  }>) {
    const response = await this.client.patch('/users/me', data);
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.client.post('/users/change-password', {
      currentPassword,
      newPassword,
    });
  }

  // Organization endpoints
  async getOrganization() {
    const response = await this.client.get('/organizations/current');
    return response.data;
  }

  async updateOrganization(data: Partial<{
    name: string;
    logo: string;
    website: string;
    industry: string;
    size: string;
  }>) {
    const response = await this.client.patch('/organizations/current', data);
    return response.data;
  }

  async inviteTeamMember(email: string, role: string) {
    return this.client.post('/organizations/invite', { email, role });
  }

  async getTeamMembers() {
    const response = await this.client.get('/organizations/members');
    return response.data;
  }

  async removeTeamMember(userId: string) {
    return this.client.delete(`/organizations/members/${userId}`);
  }

  async updateTeamMemberRole(userId: string, role: string) {
    return this.client.patch(`/organizations/members/${userId}`, { role });
  }

  // Enhanced Team Management endpoints
  async bulkInviteTeamMembers(csvData: string, defaultRole?: string) {
    const response = await this.client.post('/team-management/bulk-invite', {
      csvData,
      defaultRole,
    });
    return response.data;
  }

  async getPendingInvites() {
    const response = await this.client.get('/team-management/pending-invites');
    return response.data;
  }

  async resendInvite(inviteId: string) {
    const response = await this.client.post(`/team-management/resend-invite/${inviteId}`);
    return response.data;
  }

  async revokeInvite(inviteId: string) {
    const response = await this.client.delete(`/team-management/revoke-invite/${inviteId}`);
    return response.data;
  }

  async getTeamActivityLog(params?: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const response = await this.client.get('/team-management/activity-log', { params });
    return response.data;
  }

  async getSeatUsage() {
    const response = await this.client.get('/team-management/seat-usage');
    return response.data;
  }

  async assignRolesToMembers(userIds: string[], role: string) {
    const response = await this.client.post('/team-management/assign-role', {
      userIds,
      role,
    });
    return response.data;
  }

  // Meeting endpoints
  async getMeetings(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const response = await this.client.get('/meetings', { params });
    return response.data;
  }

  async getMeeting(id: string) {
    const response = await this.client.get(`/meetings/${id}`);
    return response.data;
  }

  async createMeeting(data: {
    title: string;
    description?: string;
    scheduledStartAt: string;
    scheduledEndAt: string;
    meetingUrl?: string;
    platform?: string;
    attendees?: string[];
  }) {
    const response = await this.client.post('/meetings', data);
    return response.data;
  }

  async updateMeeting(id: string, data: Partial<{
    title: string;
    description: string;
    scheduledStartAt: string;
    scheduledEndAt: string;
    status: string;
  }>) {
    const response = await this.client.patch(`/meetings/${id}`, data);
    return response.data;
  }

  async deleteMeeting(id: string) {
    return this.client.delete(`/meetings/${id}`);
  }

  async deleteMeetings(ids: string[]) {
    return this.client.post('/meetings/batch-delete', { ids });
  }

  async getMeetingDetail(id: string) {
    const response = await this.client.get(`/meetings/${id}/detail`);
    return response.data;
  }

  async exportMeetings(params: {
    meetingIds: string[];
    format: 'csv' | 'json' | 'pdf';
  }) {
    const response = await this.client.post('/meetings/export', params, {
      responseType: 'blob',
    });
    return response.data;
  }

  async startRecording(meetingId: string) {
    return this.client.post(`/meetings/${meetingId}/record`);
  }

  async stopRecording(meetingId: string) {
    return this.client.post(`/meetings/${meetingId}/stop-recording`);
  }

  // Transcript endpoints
  async getTranscript(meetingId: string) {
    const response = await this.client.get(`/meetings/${meetingId}/transcript`);
    return response.data;
  }

  async updateTranscript(meetingId: string, content: string) {
    const response = await this.client.put(`/meetings/${meetingId}/transcript`, {
      content,
    });
    return response.data;
  }

  async downloadTranscript(meetingId: string, format: 'pdf' | 'txt' | 'docx' = 'pdf') {
    const response = await this.client.get(`/meetings/${meetingId}/transcript/download`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  }

  async searchTranscripts(query: string, params?: {
    page?: number;
    limit?: number;
  }) {
    const response = await this.client.get('/transcripts/search', {
      params: { q: query, ...params },
    });
    return response.data;
  }

  // AI Analysis endpoints
  async getAnalysis(meetingId: string) {
    const response = await this.client.get(`/meetings/${meetingId}/analysis`);
    return response.data;
  }

  async regenerateAnalysis(meetingId: string) {
    return this.client.post(`/meetings/${meetingId}/analysis/regenerate`);
  }

  // Summary endpoints
  async getMeetingSummary(meetingId: string) {
    const response = await this.client.get(`/meetings/${meetingId}/summary`);
    return response.data;
  }

  async updateMeetingSummary(meetingId: string, data: { overview?: string }) {
    const response = await this.client.patch(`/meetings/${meetingId}/summary`, data);
    return response.data;
  }

  async regenerateMeetingSummary(meetingId: string) {
    const response = await this.client.post(`/meetings/${meetingId}/regenerate-summary`);
    return response.data;
  }

  async exportSummary(meetingId: string, format: 'pdf' | 'docx' | 'markdown' | 'txt') {
    const response = await this.client.get(`/meetings/${meetingId}/summary/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  }

  async emailSummary(meetingId: string, recipients: string[]) {
    return this.client.post(`/meetings/${meetingId}/summary/email`, { recipients });
  }

  async shareSummaryToSlack(meetingId: string, channel?: string) {
    return this.client.post(`/meetings/${meetingId}/summary/share/slack`, { channel });
  }

  async shareSummaryToTeams(meetingId: string, channel?: string) {
    return this.client.post(`/meetings/${meetingId}/summary/share/teams`, { channel });
  }

  // Action Items endpoints
  async getActionItems(meetingId: string) {
    const response = await this.client.get(`/meetings/${meetingId}/action-items`);
    return response.data;
  }

  async updateActionItem(
    meetingId: string,
    actionItemId: string,
    data: {
      status?: 'pending' | 'in_progress' | 'completed';
      assignee?: string;
      dueDate?: string;
      priority?: 'low' | 'medium' | 'high';
    }
  ) {
    const response = await this.client.patch(
      `/meetings/${meetingId}/action-items/${actionItemId}`,
      data
    );
    return response.data;
  }

  async exportActionItem(meetingId: string, actionItemId: string, integration: string) {
    return this.client.post(`/meetings/${meetingId}/action-items/${actionItemId}/export`, {
      integration,
    });
  }

  // Integration endpoints
  async getIntegrations() {
    const response = await this.client.get('/integrations');
    return response.data;
  }

  async initiateIntegrationOAuth(type: string) {
    const response = await this.client.get(`/integrations/${type}/oauth/initiate`);
    return response.data;
  }

  async connectIntegration(type: string, authCode: string) {
    return this.client.post(`/integrations/${type}/connect`, { authCode });
  }

  async disconnectIntegration(type: string) {
    return this.client.post(`/integrations/${type}/disconnect`);
  }

  async getIntegrationStatus(type: string) {
    const response = await this.client.get(`/integrations/${type}/status`);
    return response.data;
  }

  async updateIntegrationSettings(type: string, settings: any) {
    const response = await this.client.put(`/integrations/${type}/settings`, settings);
    return response.data;
  }

  // Analytics endpoints
  async getAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
  }) {
    const response = await this.client.get('/analytics', { params });
    return response.data;
  }

  async getMeetingStats() {
    const response = await this.client.get('/analytics/meetings');
    return response.data;
  }

  async getUserStats() {
    const response = await this.client.get('/analytics/users');
    return response.data;
  }

  // File upload
  async uploadFile(file: File, type: 'avatar' | 'logo' | 'attachment') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await this.client.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  // Recording endpoints
  async getRecordings(params?: {
    page?: number;
    limit?: number;
    status?: 'processing' | 'completed' | 'failed';
  }) {
    const response = await this.client.get('/recordings', { params });
    return response.data;
  }

  async getRecording(id: string) {
    const response = await this.client.get(`/recordings/${id}`);
    return response.data;
  }

  async uploadRecording(file: File, options?: {
    title?: string;
    language?: string;
    autoTranscribe?: boolean;
  }) {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.title) formData.append('title', options.title);
    if (options?.language) formData.append('language', options.language);
    if (options?.autoTranscribe !== undefined) {
      formData.append('autoTranscribe', String(options.autoTranscribe));
    }

    const response = await this.client.post('/recordings/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  async deleteRecording(id: string) {
    const response = await this.client.delete(`/recordings/${id}`);
    return response.data;
  }

  // Webhook endpoints
  async getWebhooks() {
    const response = await this.client.get('/webhooks');
    return response.data;
  }

  async createWebhook(data: {
    url: string;
    events: string[];
    active?: boolean;
  }) {
    const response = await this.client.post('/webhooks', data);
    return response.data;
  }

  async updateWebhook(id: string, data: Partial<{
    url: string;
    events: string[];
    active: boolean;
  }>) {
    const response = await this.client.patch(`/webhooks/${id}`, data);
    return response.data;
  }

  async deleteWebhook(id: string) {
    return this.client.delete(`/webhooks/${id}`);
  }

  // API Keys
  async getApiKeys() {
    const response = await this.client.get('/api-keys');
    return response.data;
  }

  async createApiKey(name: string) {
    const response = await this.client.post('/api-keys', { name });
    return response.data;
  }

  async revokeApiKey(id: string) {
    return this.client.delete(`/api-keys/${id}`);
  }

  // Billing
  async getBillingInfo() {
    const response = await this.client.get('/billing');
    return response.data;
  }

  async getSubscription() {
    const response = await this.client.get('/billing/subscription');
    return response.data;
  }

  async createSubscription(data: {
    tier: string;
    interval?: 'month' | 'year';
    paymentMethodId?: string;
  }) {
    const response = await this.client.post('/billing/subscription', data);
    return response.data;
  }

  async cancelSubscription() {
    const response = await this.client.post('/billing/subscription/cancel');
    return response.data;
  }

  async resumeSubscription() {
    const response = await this.client.post('/billing/subscription/resume');
    return response.data;
  }

  async getPlans() {
    const response = await this.client.get('/billing/plans');
    return response.data;
  }

  async getUsage(params?: { startDate?: string; endDate?: string }) {
    const response = await this.client.get('/billing/usage', { params });
    return response.data;
  }

  async getInvoices() {
    const response = await this.client.get('/billing/invoices');
    return response.data;
  }

  async getPaymentMethods() {
    const response = await this.client.get('/billing/payment-methods');
    return response.data;
  }

  async addPaymentMethod(paymentMethodId: string) {
    const response = await this.client.post('/billing/payment-methods', {
      paymentMethodId,
    });
    return response.data;
  }

  async removePaymentMethod(paymentMethodId: string) {
    const response = await this.client.delete(`/billing/payment-methods/${paymentMethodId}`);
    return response.data;
  }

  async updatePaymentMethod(paymentMethodId: string) {
    return this.client.post('/billing/payment-method', { paymentMethodId });
  }

  // Topic Tracker endpoints
  async getTopics(params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }) {
    const response = await this.client.get('/topics', { params });
    return response.data;
  }

  async getTopic(id: string) {
    const response = await this.client.get(`/topics/${id}`);
    return response.data;
  }

  async createTopic(data: {
    keyword: string;
    name?: string;
    description?: string;
    alertThreshold?: number;
    alertEnabled?: boolean;
    alertRecipients?: string[];
  }) {
    const response = await this.client.post('/topics', data);
    return response.data;
  }

  async updateTopic(id: string, data: Partial<{
    keyword: string;
    name: string;
    description: string;
    alertThreshold: number;
    alertEnabled: boolean;
    alertRecipients: string[];
    isActive: boolean;
  }>) {
    const response = await this.client.patch(`/topics/${id}`, data);
    return response.data;
  }

  async deleteTopic(id: string) {
    return this.client.delete(`/topics/${id}`);
  }

  async getTopicMentions(id: string, params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const response = await this.client.get(`/topics/${id}/mentions`, { params });
    return response.data;
  }

  async getTopicTrends(id: string, params?: {
    period?: '7d' | '30d' | '90d' | 'custom';
    startDate?: string;
    endDate?: string;
  }) {
    const response = await this.client.get(`/topics/${id}/trends`, { params });
    return response.data;
  }

  async getTopicAlerts(id: string, params?: {
    page?: number;
    limit?: number;
  }) {
    const response = await this.client.get(`/topics/${id}/alerts`, { params });
    return response.data;
  }

  async getTopicCorrelations(id: string) {
    const response = await this.client.get(`/topics/${id}/correlations`);
    return response.data;
  }

  async configureTopicAlert(id: string, data: {
    type: 'mention_spike' | 'first_mention' | 'sentiment_change';
    threshold: number;
    enabled: boolean;
    recipients: string[];
  }) {
    const response = await this.client.post(`/topics/${id}/alerts/configure`, data);
    return response.data;
  }

  // Notification endpoints
  async getNotifications(params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }) {
    const response = await this.client.get('/notifications', { params });
    return response.data;
  }

  async markNotificationAsRead(id: string) {
    const response = await this.client.patch(`/notifications/${id}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead() {
    const response = await this.client.post('/notifications/read-all');
    return response.data;
  }

  async registerDeviceToken(data: {
    token: string;
    platform: 'ios' | 'android' | 'web';
    deviceId?: string;
    appVersion?: string;
  }) {
    const response = await this.client.post('/notifications/register', data);
    return response.data;
  }

  async unregisterDeviceToken(token: string) {
    const response = await this.client.delete('/notifications/register', {
      data: { token }
    });
    return response.data;
  }

  async getDeviceTokens() {
    const response = await this.client.get('/notifications/tokens');
    return response.data;
  }

  // AI Apps endpoints
  async getAIApps(params?: {
    page?: number;
    pageSize?: number;
    category?: string;
    search?: string;
    tags?: string;
    isPremium?: boolean;
    isNew?: boolean;
    isTrending?: boolean;
    isFeatured?: boolean;
    sortBy?: 'rating' | 'name' | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  }) {
    const response = await this.client.get('/ai-apps', { params });
    return response.data;
  }

  async getAIAppCategories() {
    const response = await this.client.get('/ai-apps/categories');
    return response.data;
  }

  async getAIAppsFeatured() {
    const response = await this.client.get('/ai-apps/featured');
    return response.data;
  }

  async getAIAppsTrending() {
    const response = await this.client.get('/ai-apps/trending');
    return response.data;
  }

  async getAIApp(slug: string) {
    const response = await this.client.get(`/ai-apps/${slug}`);
    return response.data;
  }

  async getAIAppPrompt(slug: string) {
    const response = await this.client.get(`/ai-apps/${slug}/prompt`);
    return response.data;
  }

  async getAIAppsStats() {
    const response = await this.client.get('/ai-apps/stats/summary');
    return response.data;
  }

  // Generic HTTP methods for custom endpoints
  async get(url: string, config?: any) {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post(url: string, data?: any, config?: any) {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put(url: string, data?: any, config?: any) {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async patch(url: string, data?: any, config?: any) {
    const response = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete(url: string, config?: any) {
    const response = await this.client.delete(url, config);
    return response.data;
  }
}

// Create singleton instance
const apiClient = new ApiClient();
export default apiClient;
