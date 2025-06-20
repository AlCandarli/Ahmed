/**
 * خدمة API للتواصل مع Backend
 * API Service for Backend Communication
 */

import { storageService, UserSession } from './storage';
import {
  sanitizeInput,
  logSecurityEvent,
  isValidURL,
  sanitizeHTML,
  encryptLocalStorage,
  decryptLocalStorage
} from './security';

const API_BASE_URL = 'http://localhost:5000/api';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

class ApiService {
  private baseURL: string;
  private csrfToken: string = '';

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.initializeSecurity();
  }

  /**
   * تهيئة الأمان
   */
  private async initializeSecurity(): Promise<void> {
    try {
      // الحصول على CSRF Token
      const response = await fetch(`${this.baseURL}/csrf-token`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        this.csrfToken = data.csrfToken;
      }
    } catch (error) {
      logSecurityEvent('CSRF_TOKEN_INIT_ERROR', error);
    }
  }

  /**
   * تنظيف البيانات المرسلة
   */
  private sanitizeRequestData(data: any): any {
    if (typeof data === 'string') {
      return sanitizeInput(data);
    } else if (Array.isArray(data)) {
      return data.map(item => this.sanitizeRequestData(item));
    } else if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[sanitizeInput(key)] = this.sanitizeRequestData(value);
      }
      return sanitized;
    }
    return data;
  }

  /**
   * تنظيف البيانات المستلمة
   */
  private sanitizeResponseData(data: any): any {
    if (typeof data === 'string') {
      return sanitizeHTML(data);
    } else if (Array.isArray(data)) {
      return data.map(item => this.sanitizeResponseData(item));
    } else if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeResponseData(value);
      }
      return sanitized;
    }
    return data;
  }

  /**
   * إرسال طلب HTTP آمن
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    // التحقق من صحة URL
    if (!isValidURL(url)) {
      logSecurityEvent('INVALID_URL_ATTEMPT', { url });
      return {
        success: false,
        message: 'رابط غير صحيح',
        error: 'Invalid URL'
      };
    }

    // إضافة رمز المصادقة إذا كان متوفراً
    const session = storageService.getUserSession();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest', // حماية من CSRF
      ...options.headers,
    };

    if (session?.token) {
      headers.Authorization = `Bearer ${session.token}`;
    }

    // إضافة CSRF Token للطلبات غير GET
    if (options.method && options.method !== 'GET' && this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    // تنظيف البيانات المرسلة
    if (options.body && typeof options.body === 'string') {
      try {
        const bodyData = JSON.parse(options.body);
        const sanitizedData = this.sanitizeRequestData(bodyData);
        options.body = JSON.stringify(sanitizedData);
      } catch (error) {
        logSecurityEvent('REQUEST_BODY_SANITIZATION_ERROR', error);
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      // تنظيف البيانات المستلمة من XSS
      const sanitizedData = this.sanitizeResponseData(data);

      // إذا كان الرمز منتهي الصلاحية، حاول تحديثه
      if (response.status === 401 && session?.refreshToken) {
        const refreshed = await this.refreshToken(session.refreshToken);
        if (refreshed) {
          // إعادة المحاولة مع الرمز الجديد
          headers.Authorization = `Bearer ${refreshed.token}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });
          const retryData = await retryResponse.json();
          return this.sanitizeResponseData(retryData);
        }
      }

      // تسجيل الأنشطة المشبوهة
      if (response.status >= 400) {
        logSecurityEvent('API_ERROR_RESPONSE', {
          status: response.status,
          endpoint,
          message: sanitizedData.message
        });
      }

      return sanitizedData;
    } catch (error) {
      console.error('خطأ في API:', error);
      return {
        success: false,
        message: 'خطأ في الاتصال بالخادم',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * تحديث رمز المصادقة
   */
  private async refreshToken(refreshToken: string): Promise<UserSession | null> {
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();
      
      if (data.success) {
        const session = storageService.getUserSession();
        if (session) {
          session.token = data.data.token;
          session.refreshToken = data.data.refreshToken;
          storageService.saveUserSession(session);
          return session;
        }
      }
      
      return null;
    } catch (error) {
      console.error('خطأ في تحديث الرمز:', error);
      return null;
    }
  }

  // ==================== المصادقة ====================

  /**
   * تسجيل مستخدم جديد
   */
  async register(userData: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): Promise<ApiResponse<{ user: any; token: string; refreshToken: string }>> {
    const response = await this.request<{ user: any; token: string; refreshToken: string }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(userData),
      }
    );

    if (response.success && response.data) {
      const session: UserSession = {
        token: response.data.token,
        refreshToken: response.data.refreshToken,
        user: response.data.user,
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      };

      // حفظ الجلسة بشكل آمن
      storageService.saveUserSession(session);

      // تسجيل نجاح التسجيل
      logSecurityEvent('USER_REGISTRATION_SUCCESS', { userId: response.data.user.id });
    }

    return response;
  }

  /**
   * تسجيل الدخول
   */
  async login(credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse<{ user: any; token: string; refreshToken: string }>> {
    const response = await this.request<{ user: any; token: string; refreshToken: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(credentials),
      }
    );

    if (response.success && response.data) {
      const session: UserSession = {
        token: response.data.token,
        refreshToken: response.data.refreshToken,
        user: response.data.user,
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      };

      // حفظ الجلسة بشكل آمن
      storageService.saveUserSession(session);

      // تسجيل نجاح تسجيل الدخول
      logSecurityEvent('USER_LOGIN_SUCCESS', { userId: response.data.user.id });

      // بدء جلسة في التحليلات
      await this.startAnalyticsSession();
    } else if (!response.success) {
      // تسجيل فشل تسجيل الدخول
      logSecurityEvent('USER_LOGIN_FAILED', {
        email: credentials.email,
        message: response.message
      });
    }

    return response;
  }

  /**
   * تسجيل الخروج
   */
  async logout(): Promise<ApiResponse> {
    const session = storageService.getUserSession();

    const response = await this.request('/auth/logout', {
      method: 'POST',
    });

    // تسجيل تسجيل الخروج
    if (session?.user?.id) {
      logSecurityEvent('USER_LOGOUT', { userId: session.user.id });
    }

    // إنهاء الجلسة في التحليلات
    await this.endAnalyticsSession();

    // مسح البيانات المحلية بشكل آمن
    storageService.clearUserSession();

    return response;
  }

  /**
   * تسجيل الخروج من جميع الأجهزة
   */
  async logoutAll(): Promise<ApiResponse> {
    const session = storageService.getUserSession();

    const response = await this.request('/auth/logout-all', {
      method: 'POST',
    });

    // تسجيل تسجيل الخروج من جميع الأجهزة
    if (session?.user?.id) {
      logSecurityEvent('USER_LOGOUT_ALL_DEVICES', { userId: session.user.id });
    }

    // إنهاء الجلسة في التحليلات
    await this.endAnalyticsSession();

    // مسح البيانات المحلية بشكل آمن
    storageService.clearUserSession();

    return response;
  }

  /**
   * الحصول على المستخدم الحالي
   */
  async getCurrentUser(): Promise<ApiResponse<{ user: any }>> {
    return this.request('/auth/me');
  }

  // ==================== المحاضرات ====================

  /**
   * رفع محاضرة جديدة
   */
  async uploadLecture(formData: FormData): Promise<ApiResponse<{ lecture: any }>> {
    const session = storageService.getUserSession();
    const headers: HeadersInit = {};

    if (session?.token) {
      headers.Authorization = `Bearer ${session.token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}/lectures`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        // حفظ المحاضرة محلياً
        const lectures = storageService.getUserData().lectures;
        lectures.push(data.data.lecture);
        storageService.saveUserData('lectures', lectures);
      }
      
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'خطأ في رفع المحاضرة',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * الحصول على قائمة المحاضرات
   */
  async getLectures(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ApiResponse<{ lectures: any[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const response = await this.request(`/lectures?${queryParams.toString()}`);
    
    if (response.success && response.data) {
      // حفظ المحاضرات محلياً
      storageService.saveUserData('lectures', response.data.lectures);
    }
    
    return response;
  }

  // ==================== الأسئلة ====================

  /**
   * توليد أسئلة من محاضرة
   */
  async generateQuestions(data: {
    lectureId: string;
    questionCount: number;
    difficulty: string;
    questionTypes: string[];
  }): Promise<ApiResponse<{ questions: any[] }>> {
    const response = await this.request('/questions/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.success && response.data) {
      // حفظ الأسئلة محلياً
      const questions = storageService.getUserData().questions;
      questions.push(...response.data.questions);
      storageService.saveUserData('questions', questions);
    }

    return response;
  }

  /**
   * الإجابة على سؤال
   */
  async answerQuestion(questionId: string, data: {
    userAnswer: string;
    timeSpent: number;
  }): Promise<ApiResponse<{ isCorrect: boolean; pointsEarned: number }>> {
    return this.request(`/questions/${questionId}/answer`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== المهام ====================

  /**
   * الحصول على قائمة المهام
   */
  async getTasks(params?: {
    category?: string;
    difficulty?: string;
    language?: string;
  }): Promise<ApiResponse<{ tasks: any[] }>> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.difficulty) queryParams.append('difficulty', params.difficulty);
    if (params?.language) queryParams.append('language', params.language);

    const response = await this.request(`/tasks?${queryParams.toString()}`);
    
    if (response.success && response.data) {
      // حفظ المهام محلياً
      storageService.saveUserData('tasks', response.data.tasks);
    }
    
    return response;
  }

  /**
   * إرسال حل للمهمة
   */
  async submitTaskSolution(taskId: string, code: string): Promise<ApiResponse<{ result: string; score: number }>> {
    return this.request(`/tasks/${taskId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  // ==================== التحليلات ====================

  /**
   * بدء جلسة تحليلات
   */
  async startAnalyticsSession(): Promise<void> {
    try {
      await this.request('/analytics/session/start', {
        method: 'POST',
        body: JSON.stringify({
          deviceInfo: {
            browser: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
          }
        }),
      });
    } catch (error) {
      console.error('خطأ في بدء جلسة التحليلات:', error);
    }
  }

  /**
   * إنهاء جلسة تحليلات
   */
  async endAnalyticsSession(): Promise<void> {
    try {
      await this.request('/analytics/session/end', {
        method: 'POST',
      });
    } catch (error) {
      console.error('خطأ في إنهاء جلسة التحليلات:', error);
    }
  }

  /**
   * تحديث النشاط
   */
  async updateActivity(activityType: string, metadata?: any): Promise<void> {
    try {
      await this.request('/analytics/activity', {
        method: 'POST',
        body: JSON.stringify({
          activityType,
          increment: 1,
          metadata,
        }),
      });
    } catch (error) {
      console.error('خطأ في تحديث النشاط:', error);
    }
  }

  /**
   * الحصول على التحليلات اليومية
   */
  async getDailyAnalytics(): Promise<ApiResponse<any>> {
    return this.request('/analytics/daily');
  }

  /**
   * الحصول على تحليل الأداء الذكي
   */
  async getPerformanceInsights(period: number = 30): Promise<ApiResponse<any>> {
    return this.request(`/analytics/insights?period=${period}`);
  }
}

// إنشاء مثيل واحد من الخدمة
export const apiService = new ApiService();

export default apiService;
