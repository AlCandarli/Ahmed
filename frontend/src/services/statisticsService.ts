import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

// إنشاء instance من axios مع الإعدادات الأساسية
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// إضافة token للطلبات إذا كان متوفراً
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// خدمة الإحصائيات
export const statisticsService = {
  // الحصول على إحصائيات الموقع العامة
  async getSiteStatistics() {
    try {
      const response = await api.get('/statistics/site');
      return response.data;
    } catch (error) {
      console.error('خطأ في جلب إحصائيات الموقع:', error);
      // إرجاع بيانات افتراضية في حالة الخطأ
      return {
        success: true,
        data: {
          totalUsers: 0,
          totalSessions: 0,
          totalQuestions: 0,
          totalTasks: 0,
          totalReports: 0,
          activeUsers: 0,
          completionRate: 0,
          averageScore: 0,
          dailyStats: [0, 0, 0, 0, 0, 0, 0],
          weeklyGrowth: 0,
          topPerformers: [],
          sectionUsage: {
            lectures: 0,
            questions: 0,
            tasks: 0,
            reports: 0,
            analytics: 0
          }
        }
      };
    }
  },

  // الحصول على إحصائيات المستخدم الشخصية
  async getUserStatistics(userId: string) {
    try {
      const response = await api.get(`/statistics/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('خطأ في جلب إحصائيات المستخدم:', error);
      // إرجاع بيانات افتراضية في حالة الخطأ
      return {
        success: true,
        data: {
          totalSessions: 0,
          studyTime: 0,
          questionsAnswered: 0,
          tasksCompleted: 0,
          reportsGenerated: 0,
          averageScore: 0,
          weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
          sectionProgress: {
            lectures: 0,
            questions: 0,
            tasks: 0,
            reports: 0
          },
          achievements: [],
          rank: 0
        }
      };
    }
  },

  // تسجيل جلسة جديدة
  async recordSession(sessionData: {
    section: string;
    duration?: number;
    activities?: any[];
    metadata?: any;
  }) {
    try {
      const response = await api.post('/statistics/session', sessionData);
      return response.data;
    } catch (error) {
      console.error('خطأ في تسجيل الجلسة:', error);
      return { success: false };
    }
  },

  // تسجيل إجابة سؤال
  async recordQuestionAnswer(questionData: {
    title: string;
    content: string;
    options: string[];
    correctAnswer: number;
    userAnswer: number;
    score: number;
    difficulty: string;
    timeSpent: number;
  }) {
    try {
      const response = await api.post('/statistics/question', questionData);
      return response.data;
    } catch (error) {
      console.error('خطأ في تسجيل إجابة السؤال:', error);
      return { success: false };
    }
  },

  // تسجيل إكمال مهمة
  async recordTaskCompletion(taskData: {
    title: string;
    description: string;
    category: string;
    language: string;
    difficulty: string;
    points: number;
    solution: string;
    score: number;
    timeSpent: number;
  }) {
    try {
      const response = await api.post('/statistics/task', taskData);
      return response.data;
    } catch (error) {
      console.error('خطأ في تسجيل إكمال المهمة:', error);
      return { success: false };
    }
  },

  // تسجيل إنشاء تقرير
  async recordReportGeneration(reportData: {
    title: string;
    content: string;
    template: string;
    style: string;
    pageCount: number;
    wordCount: number;
    readingTime: number;
    sections: number;
    language: string;
    generationTime: number;
    aiModel: string;
  }) {
    try {
      const response = await api.post('/statistics/report', reportData);
      return response.data;
    } catch (error) {
      console.error('خطأ في تسجيل إنشاء التقرير:', error);
      return { success: false };
    }
  },

  // تحديث آخر نشاط للمستخدم
  async updateLastActive() {
    try {
      const response = await api.put('/statistics/last-active');
      return response.data;
    } catch (error) {
      console.error('خطأ في تحديث آخر نشاط:', error);
      return { success: false };
    }
  },

  // الحصول على الإنجازات
  async getAchievements(userId: string) {
    try {
      const response = await api.get(`/statistics/achievements/${userId}`);
      return response.data;
    } catch (error) {
      console.error('خطأ في جلب الإنجازات:', error);
      return { success: true, data: [] };
    }
  }
};

// تصدير الخدمة كافتراضي
export default statisticsService;
