import {
  AttendanceRecord,
  AttendanceSettings,
  AttendanceStatus,
  Bus,
  FinalReport,
  LocationVerificationRequest,
  LocationVerificationResponse,
  Notification,
  SessionInfo,
  Student,
  User,
  CampusCheckpoint,
} from '../types';

const API_BASE = '/api';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('bus_token');
  }

  public setToken(token: string | null) {
    if (token) {
      localStorage.setItem('bus_token', token);
    } else {
      localStorage.removeItem('bus_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
    }

    return data as T;
  }

  // Auth & First-time Setup
  async getSetupStatus(): Promise<{ needsSetup: boolean }> {
    return this.request<{ needsSetup: boolean }>('/auth/setup-status');
  }

  async setupAdmin(data: { name: string; email: string; password: string }): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>('/auth/setup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.token);
    return res;
  }

  /**
   * @deprecated Legacy direct signup is deprecated for security. Use requestOtp & verifyOtp.
   */
  async signupStudent(data: {
    name: string;
    registerNumber: string;
    password: string;
    email?: string;
    phone?: string;
    preferredBusId?: string;
  }): Promise<{ message: string; student: any }> {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAvailableBuses(): Promise<{ success: boolean; buses: Array<{ id: string; busNumber: string; routeName: string; hasIncharge: boolean; inchargeName: string }> }> {
    return this.request('/auth/available-buses');
  }

  async requestOtp(data: {
    role?: 'STUDENT' | 'INCHARGE';
    name: string;
    registerNumber?: string;
    email: string;
    password: string;
    phone?: string;
    preferredBusId?: string;
    busNumber?: string;
    routeName?: string;
  }): Promise<{ success: boolean; message: string; expiresInSeconds?: number }> {
    return this.request('/auth/signup/request-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyOtp(
    email: string,
    otp: string
  ): Promise<{ success: boolean; message: string; role?: 'STUDENT' | 'INCHARGE'; student?: any; user?: any }> {
    return this.request('/auth/signup/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  async uploadMedia(
    fileDataUri: string,
    folder?: string
  ): Promise<{ success: boolean; secureUrl: string; publicId: string }> {
    return this.request('/media/upload', {
      method: 'POST',
      body: JSON.stringify({ fileDataUri, folder }),
    });
  }

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(res.token);
    return res;
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // Admin: Student Approvals
  async getPendingApprovals(): Promise<Student[]> {
    return this.request<Student[]>('/admin/approvals');
  }

  async approveStudent(id: string, busId: string): Promise<{ message: string; student: Student }> {
    return this.request(`/admin/approvals/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ busId }),
    });
  }

  async rejectStudent(id: string, reason?: string): Promise<{ message: string; student: Student }> {
    return this.request(`/admin/approvals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Admin: Bus In-Charge Approvals
  async getPendingIncharges(): Promise<{ success: boolean; incharges: User[] }> {
    return this.request('/admin/incharges/pending');
  }

  async approveIncharge(id: string, busNumber?: string): Promise<{ success: boolean; message: string; user: User }> {
    return this.request(`/admin/incharges/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ busNumber }),
    });
  }

  async rejectIncharge(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/admin/incharges/${id}/reject`, {
      method: 'POST',
    });
  }

  // Attendance & Session
  async getSessionInfo(): Promise<SessionInfo> {
    return this.request<SessionInfo>('/attendance/session');
  }

  async verifyLocation(req: LocationVerificationRequest): Promise<LocationVerificationResponse> {
    return this.request<LocationVerificationResponse>('/attendance/verify-location', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async getMobileBiometricChallenge(): Promise<{ challenge: string }> {
    return this.request<{ challenge: string }>('/attendance/mobile/challenge');
  }

  async registerMobileBiometric(payload: {
    credentialId: string;
    rawId?: string;
    transports?: string[];
  }): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/attendance/mobile/register-biometric', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getMobileBiometricCredential(): Promise<{
    credential: { studentId: string; credentialId: string; rawId?: string; transports?: string[]; registeredAt: string } | null;
  }> {
    return this.request<{
      credential: { studentId: string; credentialId: string; rawId?: string; transports?: string[]; registeredAt: string } | null;
    }>('/attendance/mobile/credential');
  }

  async unregisterMobileBiometric(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/attendance/mobile/unregister-biometric', {
      method: 'POST',
    });
  }

  async verifyMobile(req: {
    busId?: string;
    method: 'FACE_GPS' | 'PHONE_BIOMETRIC_GPS';
    latitude: number;
    longitude: number;
    accuracy?: number;
    selfieBase64?: string;
    faceDescriptor?: number[];
    biometricPayload?: any;
  }): Promise<{
    status: AttendanceStatus;
    message: string;
    record?: AttendanceRecord;
    distanceMeters?: number;
    faceConfidence?: number;
    selfieUrl?: string;
  }> {
    return this.request('/attendance/verify-mobile', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async enrollFace(
    selfieBase64: string,
    faceDescriptor?: number[],
    faceDescriptorLeft?: number[],
    faceDescriptorRight?: number[],
    faceEnrollmentQuality?: number
  ): Promise<{ success: boolean; message: string; profilePhotoUrl: string; photoUrl?: string; student?: Student }> {
    return this.request('/attendance/enroll-face', {
      method: 'POST',
      body: JSON.stringify({
        selfieBase64,
        faceDescriptor,
        faceDescriptorLeft,
        faceDescriptorRight,
        faceEnrollmentQuality,
      }),
    });
  }

  async resetFace(studentId?: string): Promise<{ success: boolean; message: string; student: Student }> {
    return this.request('/attendance/reset-face', {
      method: 'POST',
      body: JSON.stringify({ studentId }),
    });
  }

  async getMyStatus(): Promise<{
    todayRecord: AttendanceRecord | null;
    student: Student | null;
    bus: Bus | null;
    sessionInfo: SessionInfo;
    history: AttendanceRecord[];
  }> {
    return this.request('/attendance/my-status');
  }

  // Admin: Students
  async getStudents(filters?: { search?: string; busId?: string; active?: string }): Promise<(Student & { bus: Bus | null })[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.busId) params.append('busId', filters.busId);
    if (filters?.active !== undefined) params.append('active', filters.active);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/admin/students${qs}`);
  }

  async createStudent(data: Partial<Student> & { registerNumber: string; name: string; busId: string }): Promise<Student> {
    return this.request<Student>('/admin/students', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateStudent(id: string, data: Partial<Student>): Promise<Student> {
    return this.request<Student>(`/admin/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteStudent(id: string): Promise<{ message: string }> {
    return this.request(`/admin/students/${id}`, {
      method: 'DELETE',
    });
  }

  // Admin: Buses
  async getBuses(): Promise<(Bus & { studentsCount: number; inchargeName: string })[]> {
    return this.request('/admin/buses');
  }

  async getIncharges(): Promise<User[]> {
    return this.request<User[]>('/admin/incharges');
  }

  async createBus(data: Omit<Bus, 'id'>): Promise<Bus> {
    return this.request('/admin/buses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBus(id: string, data: Partial<Bus>): Promise<Bus> {
    return this.request(`/admin/buses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Admin: Live & History Attendance
  async getTodayAttendance(): Promise<{
    date: string;
    sessionInfo: SessionInfo;
    stats: { total: number; present: number; notPresent: number; percentage: number };
    roster: Array<{
      studentId: string;
      registerNumber: string;
      name: string;
      busId: string;
      busNumber: string;
      routeName: string;
      status: string;
      distanceMeters: number | null;
      accuracyMeters: number | null;
      verifiedAt: string | null;
      verificationMethod: string | null;
      overrideReason: string | null;
      recordId: string | null;
    }>;
    buses: Bus[];
  }> {
    return this.request('/admin/attendance/today');
  }

  async getAttendanceHistory(filters?: {
    date?: string;
    busId?: string;
    studentId?: string;
    status?: string;
  }): Promise<
    Array<
      AttendanceRecord & {
        studentName: string;
        registerNumber: string;
        busNumber: string;
        routeName: string;
      }
    >
  > {
    const params = new URLSearchParams();
    if (filters?.date) params.append('date', filters.date);
    if (filters?.busId) params.append('busId', filters.busId);
    if (filters?.studentId) params.append('studentId', filters.studentId);
    if (filters?.status) params.append('status', filters.status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/admin/attendance/history${qs}`);
  }

  async adminOverride(data: {
    studentId: string;
    date?: string;
    newStatus: string;
    reason: string;
  }): Promise<{ message: string; record: AttendanceRecord }> {
    return this.request('/admin/override', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Admin: Settings
  async getSettings(): Promise<AttendanceSettings> {
    return this.request<AttendanceSettings>('/admin/settings');
  }

  async updateSettings(settings: Partial<AttendanceSettings>): Promise<AttendanceSettings> {
    return this.request<AttendanceSettings>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Campus Checkpoints
  async getCheckpoints(): Promise<CampusCheckpoint[]> {
    return this.request<CampusCheckpoint[]>('/checkpoints');
  }

  async createCheckpoint(data: Omit<CampusCheckpoint, 'id' | 'createdAt'>): Promise<CampusCheckpoint> {
    return this.request<CampusCheckpoint>('/checkpoints', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteCheckpoint(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/checkpoints/${id}`, {
      method: 'DELETE',
    });
  }

  // Admin: Reports & Notifications
  async getReports(): Promise<FinalReport[]> {
    return this.request<FinalReport[]>('/admin/reports');
  }

  async getReportByDate(date: string): Promise<FinalReport> {
    return this.request<FinalReport>(`/admin/reports/${date}`);
  }

  async getNotifications(): Promise<{ notifications: Notification[]; unreadCount: number }> {
    return this.request('/admin/notifications');
  }

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    return this.request(`/admin/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    return this.request('/admin/notifications/read-all', {
      method: 'PUT',
    });
  }

  async clearAllNotifications(): Promise<{ success: boolean; message?: string }> {
    return this.request('/admin/notifications/clear-all', {
      method: 'DELETE',
    });
  }

  async deleteNotification(id: string): Promise<{ success: boolean; message?: string }> {
    return this.request(`/admin/notifications/${id}`, {
      method: 'DELETE',
    });
  }

  // Bus Incharge
  async getInchargeAttendance(): Promise<{
    bus: Bus;
    date: string;
    sessionInfo: SessionInfo;
    stats: { total: number; present: number; notPresent: number; percentage: number };
    roster: Array<{
      studentId: string;
      registerNumber: string;
      name: string;
      status: string;
      distanceMeters: number | null;
      accuracyMeters: number | null;
      verifiedAt: string | null;
      verificationMethod: string | null;
      selfieImageUrl?: string | null;
      faceMatchConfidence?: number | null;
      deviceBiometricPassed?: boolean | null;
    }>;
  }> {
    return this.request('/incharge/attendance');
  }

  // Cron triggering helper
  async triggerCron(endpoint: 'open-session' | 'close-session' | 'generate-report'): Promise<any> {
    return this.request(`/cron/${endpoint}`, {
      method: 'POST',
    });
  }
}

export const api = new ApiClient();
