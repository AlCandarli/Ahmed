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

// خدمة جمع البيانات
export const dataCollectionService = {
  // حفظ محادثة من قسم المحاضرات
  async saveLectureChat(data: {
    message: string;
    response: string;
    sessionId?: string;
    metadata?: any;
  }) {
    try {
      const userId = localStorage.getItem('userId') || 'demo-user';
      const response = await api.post('/data/lecture-chat', {
        userId,
        ...data
      });
      return response.data;
    } catch (error) {
      console.error('خطأ في حفظ محادثة المحاضرة:', error);
      return { success: false, error: error.message };
    }
  },

  // حفظ نتيجة اختبار من قسم الأسئلة
  async saveQuestionResult(data: {
    questions: Array<{
      title: string;
      content: string;
      options: string[];
      correctAnswer: number;
      userAnswer: number;
      score: number;
      timeSpent?: number;
    }>;
    totalScore: number;
    correctAnswers: number;
    totalQuestions: number;
    timeSpent: number;
    difficulty?: string;
    category?: string;
    sessionId?: string;
  }) {
    try {
      const userId = localStorage.getItem('userId') || 'demo-user';
      const response = await api.post('/data/question-result', {
        userId,
        ...data
      });
      return response.data;
    } catch (error) {
      console.error('خطأ في حفظ نتيجة الاختبار:', error);
      return { success: false, error: error.message };
    }
  },

  // حفظ إنجاز مهمة من قسم المهام
  async saveTaskCompletion(data: {
    taskTitle: string;
    taskDescription: string;
    category: string;
    language: string;
    difficulty: string;
    solution: string;
    points: number;
    score: number;
    timeSpent: number;
    feedback?: string;
    sessionId?: string;
  }) {
    try {
      const userId = localStorage.getItem('userId') || 'demo-user';
      const response = await api.post('/data/task-completion', {
        userId,
        ...data
      });
      return response.data;
    } catch (error) {
      console.error('خطأ في حفظ إنجاز المهمة:', error);
      return { success: false, error: error.message };
    }
  },

  // حفظ تقرير مُنشأ من قسم التقارير
  async saveReportGeneration(data: {
    title: string;
    content: string;
    template: string;
    style: string;
    pageCount: number;
    language: string;
    generationTime: number;
    aiModel: string;
    sessionId?: string;
  }) {
    try {
      const userId = localStorage.getItem('userId') || 'demo-user';
      const response = await api.post('/data/report-generation', {
        userId,
        ...data
      });
      return response.data;
    } catch (error) {
      console.error('خطأ في حفظ التقرير:', error);
      return { success: false, error: error.message };
    }
  },

  // تحديث وقت الدراسة
  async updateStudyTime(section: string, duration: number) {
    try {
      const userId = localStorage.getItem('userId') || 'demo-user';
      const response = await api.post('/data/update-study-time', {
        userId,
        section,
        duration
      });
      return response.data;
    } catch (error) {
      console.error('خطأ في تحديث وقت الدراسة:', error);
      return { success: false, error: error.message };
    }
  },

  // دالة مساعدة لتوليد session ID
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // دالة مساعدة لحساب النقاط بناءً على الأداء
  calculatePoints(score: number, difficulty: string, timeSpent: number): number {
    let basePoints = 0;
    
    // نقاط أساسية حسب الدرجة
    if (score >= 90) basePoints = 100;
    else if (score >= 80) basePoints = 80;
    else if (score >= 70) basePoints = 60;
    else if (score >= 60) basePoints = 40;
    else basePoints = 20;

    // مضاعف الصعوبة
    const difficultyMultiplier = {
      'easy': 1,
      'medium': 1.5,
      'hard': 2,
      'expert': 2.5
    };

    // مكافأة السرعة (إذا أنجز في وقت أقل من المتوقع)
    const expectedTime = 300000; // 5 دقائق متوقعة
    const speedBonus = timeSpent < expectedTime ? 1.2 : 1;

    return Math.round(basePoints * (difficultyMultiplier[difficulty] || 1) * speedBonus);
  },

  // دالة مساعدة لحساب الدرجة بناءً على الإجابات الصحيحة
  calculateScore(correctAnswers: number, totalQuestions: number): number {
    return Math.round((correctAnswers / totalQuestions) * 100);
  },

  // دالة مساعدة لتحديد مستوى الصعوبة بناءً على الأداء
  suggestDifficulty(averageScore: number, completedTasks: number): string {
    if (completedTasks < 5) return 'easy';
    if (averageScore >= 90) return 'hard';
    if (averageScore >= 75) return 'medium';
    return 'easy';
  },

  // دالة مساعدة لتوليد feedback ذكي
  generateFeedback(score: number, timeSpent: number, difficulty: string, language: string = 'ar'): string {
    const isArabic = language === 'ar';
    
    if (score >= 90) {
      return isArabic 
        ? `أداء ممتاز! حققت ${score}% في مستوى ${difficulty}. استمر في هذا التميز!`
        : `Excellent performance! You scored ${score}% on ${difficulty} level. Keep up the great work!`;
    } else if (score >= 75) {
      return isArabic
        ? `أداء جيد جداً! حققت ${score}%. يمكنك تحسين الأداء أكثر بالممارسة.`
        : `Very good performance! You scored ${score}%. You can improve further with practice.`;
    } else if (score >= 60) {
      return isArabic
        ? `أداء مقبول. حققت ${score}%. ركز على نقاط الضعف وحاول مرة أخرى.`
        : `Acceptable performance. You scored ${score}%. Focus on weak points and try again.`;
    } else {
      return isArabic
        ? `تحتاج إلى مزيد من الممارسة. حققت ${score}%. لا تستسلم وحاول مرة أخرى!`
        : `Need more practice. You scored ${score}%. Don't give up and try again!`;
    }
  },

  // دالة لتتبع الوقت المستغرق
  createTimeTracker() {
    const startTime = Date.now();
    
    return {
      getElapsedTime: () => Date.now() - startTime,
      getElapsedSeconds: () => Math.round((Date.now() - startTime) / 1000),
      getElapsedMinutes: () => Math.round((Date.now() - startTime) / 60000)
    };
  }
};

// تصدير الخدمة كافتراضي
export default dataCollectionService;
