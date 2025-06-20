/**
 * خدمة إدارة التخزين المحلي والحالة الآمنة
 * Secure Local Storage and State Management Service
 */

import { encryptLocalStorage, decryptLocalStorage, logSecurityEvent } from './security';

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: 'ar' | 'en';
  sidebarCollapsed: boolean;
  lastActiveSection: string;
}

export interface UserSession {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    level: string;
    stats: {
      totalPoints: number;
      completedTasks: number;
      answeredQuestions: number;
    };
  };
  loginTime: string;
  lastActivity: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  section: string;
  metadata?: any;
}

export interface UserData {
  lectures: any[];
  questions: any[];
  tasks: any[];
  reports: any[];
  analytics: any[];
  chats: ChatMessage[];
  preferences: UserPreferences;
  session: UserSession | null;
}

class StorageService {
  private readonly STORAGE_KEYS = {
    USER_SESSION: 'ai_edu_user_session',
    USER_PREFERENCES: 'ai_edu_user_preferences',
    USER_DATA: 'ai_edu_user_data',
    CHAT_MESSAGES: 'ai_edu_chat_messages',
    LAST_SYNC: 'ai_edu_last_sync'
  };

  private readonly CHAT_RETENTION_DAYS = 14; // أسبوعين
  private readonly SENSITIVE_KEYS = ['USER_SESSION', 'USER_DATA']; // المفاتيح الحساسة التي تحتاج تشفير

  /**
   * حفظ آمن للبيانات الحساسة
   */
  private secureSetItem(key: string, data: any): void {
    try {
      const keyName = Object.keys(this.STORAGE_KEYS).find(k => this.STORAGE_KEYS[k as keyof typeof this.STORAGE_KEYS] === key);

      if (keyName && this.SENSITIVE_KEYS.includes(keyName)) {
        // تشفير البيانات الحساسة
        encryptLocalStorage(key, data);
        logSecurityEvent('SECURE_DATA_STORED', { key: keyName });
      } else {
        // حفظ عادي للبيانات غير الحساسة
        localStorage.setItem(key, JSON.stringify(data));
      }
    } catch (error) {
      logSecurityEvent('STORAGE_SAVE_ERROR', { key, error: error.message });
      throw error;
    }
  }

  /**
   * استرجاع آمن للبيانات الحساسة
   */
  private secureGetItem(key: string): any {
    try {
      const keyName = Object.keys(this.STORAGE_KEYS).find(k => this.STORAGE_KEYS[k as keyof typeof this.STORAGE_KEYS] === key);

      if (keyName && this.SENSITIVE_KEYS.includes(keyName)) {
        // فك تشفير البيانات الحساسة
        const data = decryptLocalStorage(key);
        if (data) {
          logSecurityEvent('SECURE_DATA_RETRIEVED', { key: keyName });
        }
        return data;
      } else {
        // استرجاع عادي للبيانات غير الحساسة
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      }
    } catch (error) {
      logSecurityEvent('STORAGE_RETRIEVE_ERROR', { key, error: error.message });
      return null;
    }
  }

  /**
   * حذف آمن للبيانات
   */
  private secureRemoveItem(key: string): void {
    try {
      localStorage.removeItem(key);
      const keyName = Object.keys(this.STORAGE_KEYS).find(k => this.STORAGE_KEYS[k as keyof typeof this.STORAGE_KEYS] === key);
      if (keyName) {
        logSecurityEvent('SECURE_DATA_REMOVED', { key: keyName });
      }
    } catch (error) {
      logSecurityEvent('STORAGE_REMOVE_ERROR', { key, error: error.message });
    }
  }

  /**
   * حفظ جلسة المستخدم بشكل آمن
   */
  saveUserSession(session: UserSession): void {
    try {
      // إضافة معلومات أمنية إضافية
      const secureSession = {
        ...session,
        deviceFingerprint: this.generateDeviceFingerprint(),
        createdAt: new Date().toISOString(),
        ipAddress: this.getClientIP()
      };

      this.secureSetItem(this.STORAGE_KEYS.USER_SESSION, secureSession);
      this.updateLastActivity();

      logSecurityEvent('USER_SESSION_SAVED', { userId: session.user.id });
    } catch (error) {
      console.error('خطأ في حفظ جلسة المستخدم:', error);
      logSecurityEvent('USER_SESSION_SAVE_ERROR', { error: error.message });
    }
  }

  /**
   * الحصول على جلسة المستخدم بشكل آمن
   */
  getUserSession(): UserSession | null {
    try {
      const session = this.secureGetItem(this.STORAGE_KEYS.USER_SESSION);
      if (session) {
        // التحقق من انتهاء صلاحية الجلسة (7 أيام)
        const loginTime = new Date(session.loginTime);
        const now = new Date();
        const daysDiff = (now.getTime() - loginTime.getTime()) / (1000 * 3600 * 24);

        if (daysDiff > 7) {
          logSecurityEvent('SESSION_EXPIRED', { userId: session.user?.id });
          this.clearUserSession();
          return null;
        }

        // التحقق من Device Fingerprint
        const currentFingerprint = this.generateDeviceFingerprint();
        if (session.deviceFingerprint && session.deviceFingerprint !== currentFingerprint) {
          logSecurityEvent('DEVICE_FINGERPRINT_MISMATCH', {
            userId: session.user?.id,
            stored: session.deviceFingerprint,
            current: currentFingerprint
          });
          // يمكن إضافة تحذير للمستخدم هنا
        }

        logSecurityEvent('USER_SESSION_RETRIEVED', { userId: session.user?.id });
        return session;
      }
      return null;
    } catch (error) {
      console.error('خطأ في الحصول على جلسة المستخدم:', error);
      logSecurityEvent('USER_SESSION_RETRIEVE_ERROR', { error: error.message });
      return null;
    }
  }

  /**
   * مسح جلسة المستخدم بشكل آمن
   */
  clearUserSession(): void {
    const session = this.getUserSession();
    if (session?.user?.id) {
      logSecurityEvent('USER_SESSION_CLEARED', { userId: session.user.id });
    }
    this.secureRemoveItem(this.STORAGE_KEYS.USER_SESSION);
  }

  /**
   * إنشاء بصمة الجهاز
   */
  private generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx!.textBaseline = 'top';
    ctx!.font = '14px Arial';
    ctx!.fillText('Device fingerprint', 2, 2);

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
      navigator.hardwareConcurrency || 0,
      navigator.deviceMemory || 0
    ].join('|');

    // إنشاء hash بسيط
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // تحويل إلى 32bit integer
    }

    return hash.toString(36);
  }

  /**
   * الحصول على IP العميل (تقريبي)
   */
  private getClientIP(): string {
    // في بيئة الإنتاج، يمكن استخدام خدمة خارجية للحصول على IP
    return 'unknown';
  }

  /**
   * حفظ تفضيلات المستخدم
   */
  saveUserPreferences(preferences: UserPreferences): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferences));
      this.syncPreferencesToServer(preferences);
    } catch (error) {
      console.error('خطأ في حفظ التفضيلات:', error);
    }
  }

  /**
   * الحصول على تفضيلات المستخدم
   */
  getUserPreferences(): UserPreferences {
    try {
      const preferences = localStorage.getItem(this.STORAGE_KEYS.USER_PREFERENCES);
      if (preferences) {
        return JSON.parse(preferences);
      }
    } catch (error) {
      console.error('خطأ في الحصول على التفضيلات:', error);
    }

    // التفضيلات الافتراضية
    return {
      theme: 'light',
      language: 'ar',
      sidebarCollapsed: false,
      lastActiveSection: 'lectures'
    };
  }

  /**
   * حفظ رسالة محادثة
   */
  saveChatMessage(message: ChatMessage): void {
    try {
      const messages = this.getChatMessages();
      messages.push(message);
      
      // تنظيف الرسائل القديمة
      const cleanedMessages = this.cleanOldMessages(messages);
      
      localStorage.setItem(this.STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(cleanedMessages));
      this.syncChatToServer(message);
    } catch (error) {
      console.error('خطأ في حفظ رسالة المحادثة:', error);
    }
  }

  /**
   * الحصول على رسائل المحادثة
   */
  getChatMessages(section?: string): ChatMessage[] {
    try {
      const messages = localStorage.getItem(this.STORAGE_KEYS.CHAT_MESSAGES);
      if (messages) {
        const parsedMessages = JSON.parse(messages);
        const cleanedMessages = this.cleanOldMessages(parsedMessages);
        
        if (section) {
          return cleanedMessages.filter(msg => msg.section === section);
        }
        
        return cleanedMessages;
      }
      return [];
    } catch (error) {
      console.error('خطأ في الحصول على رسائل المحادثة:', error);
      return [];
    }
  }

  /**
   * تنظيف الرسائل القديمة (أكثر من أسبوعين)
   */
  private cleanOldMessages(messages: ChatMessage[]): ChatMessage[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.CHAT_RETENTION_DAYS);
    
    return messages.filter(message => {
      const messageDate = new Date(message.timestamp);
      return messageDate > cutoffDate;
    });
  }

  /**
   * حفظ بيانات المستخدم بشكل آمن
   */
  saveUserData(key: keyof UserData, data: any): void {
    try {
      const userData = this.getUserData();
      userData[key] = data;
      userData.lastModified = new Date().toISOString();

      this.secureSetItem(this.STORAGE_KEYS.USER_DATA, userData);
      this.syncDataToServer(key, data);

      logSecurityEvent('USER_DATA_SAVED', { dataType: key });
    } catch (error) {
      console.error('خطأ في حفظ بيانات المستخدم:', error);
      logSecurityEvent('USER_DATA_SAVE_ERROR', { dataType: key, error: error.message });
    }
  }

  /**
   * الحصول على بيانات المستخدم بشكل آمن
   */
  getUserData(): UserData {
    try {
      const data = this.secureGetItem(this.STORAGE_KEYS.USER_DATA);
      if (data) {
        logSecurityEvent('USER_DATA_RETRIEVED');
        return data;
      }
    } catch (error) {
      console.error('خطأ في الحصول على بيانات المستخدم:', error);
      logSecurityEvent('USER_DATA_RETRIEVE_ERROR', { error: error.message });
    }

    return {
      lectures: [],
      questions: [],
      tasks: [],
      reports: [],
      analytics: [],
      chats: [],
      preferences: this.getUserPreferences(),
      session: null,
      lastModified: new Date().toISOString()
    };
  }

  /**
   * تحديث آخر نشاط
   */
  updateLastActivity(): void {
    const session = this.getUserSession();
    if (session) {
      session.lastActivity = new Date().toISOString();
      this.saveUserSession(session);
    }
  }

  /**
   * مزامنة التفضيلات مع الخادم
   */
  private async syncPreferencesToServer(preferences: UserPreferences): Promise<void> {
    const session = this.getUserSession();
    if (!session) return;

    try {
      await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        },
        body: JSON.stringify({ preferences })
      });
    } catch (error) {
      console.error('خطأ في مزامنة التفضيلات:', error);
    }
  }

  /**
   * مزامنة رسالة المحادثة مع الخادم
   */
  private async syncChatToServer(message: ChatMessage): Promise<void> {
    const session = this.getUserSession();
    if (!session) return;

    try {
      await fetch('/api/analytics/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        },
        body: JSON.stringify({
          activityType: 'chatMessage',
          increment: 1,
          metadata: {
            section: message.section,
            messageType: message.type,
            timestamp: message.timestamp
          }
        })
      });
    } catch (error) {
      console.error('خطأ في مزامنة المحادثة:', error);
    }
  }

  /**
   * مزامنة البيانات مع الخادم
   */
  private async syncDataToServer(key: string, data: any): Promise<void> {
    const session = this.getUserSession();
    if (!session) return;

    try {
      await fetch('/api/analytics/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        },
        body: JSON.stringify({
          activityType: `${key}Updated`,
          increment: 1,
          metadata: {
            dataType: key,
            timestamp: new Date().toISOString()
          }
        })
      });
    } catch (error) {
      console.error('خطأ في مزامنة البيانات:', error);
    }
  }

  /**
   * مزامنة جميع البيانات مع الخادم
   */
  async syncAllDataToServer(): Promise<void> {
    const session = this.getUserSession();
    if (!session) return;

    try {
      const userData = this.getUserData();
      const preferences = this.getUserPreferences();
      const chatMessages = this.getChatMessages();

      // مزامنة التفضيلات
      await this.syncPreferencesToServer(preferences);

      // مزامنة إحصائيات الاستخدام
      await fetch('/api/analytics/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        },
        body: JSON.stringify({
          activityType: 'dataSync',
          increment: 1,
          metadata: {
            lecturesCount: userData.lectures.length,
            questionsCount: userData.questions.length,
            tasksCount: userData.tasks.length,
            reportsCount: userData.reports.length,
            chatMessagesCount: chatMessages.length,
            syncTime: new Date().toISOString()
          }
        })
      });

      localStorage.setItem(this.STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    } catch (error) {
      console.error('خطأ في مزامنة البيانات:', error);
    }
  }

  /**
   * تنظيف البيانات المحلية بشكل آمن
   */
  clearAllData(): void {
    const session = this.getUserSession();
    if (session?.user?.id) {
      logSecurityEvent('ALL_DATA_CLEARED', { userId: session.user.id });
    }

    Object.values(this.STORAGE_KEYS).forEach(key => {
      this.secureRemoveItem(key);
    });

    // تنظيف إضافي للبيانات الحساسة
    sessionStorage.clear();

    // إزالة cookies إذا كانت موجودة
    document.cookie.split(";").forEach(cookie => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
  }

  /**
   * الحصول على آخر وقت مزامنة
   */
  getLastSyncTime(): Date | null {
    try {
      const lastSync = localStorage.getItem(this.STORAGE_KEYS.LAST_SYNC);
      return lastSync ? new Date(lastSync) : null;
    } catch (error) {
      return null;
    }
  }
}

// إنشاء مثيل واحد من الخدمة
export const storageService = new StorageService();

// تصدير الأنواع
export default storageService;
