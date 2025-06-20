const express = require('express');
const { Analytics } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');
const aiService = require('../services/aiService');
const LectureChat = require('../models/LectureChat');
const QuizResult = require('../models/QuizResult');
const TaskProgress = require('../models/TaskProgress');

const router = express.Router();

/**
 * الحصول على التحليلات اليومية
 * GET /api/analytics/daily
 */
router.get('/daily', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    let analytics = await Analytics.findOne({
      userId: req.user._id,
      date: targetDate
    });

    if (!analytics) {
      // إنشاء سجل جديد إذا لم يكن موجوداً
      analytics = new Analytics({
        userId: req.user._id,
        date: targetDate
      });
      await analytics.save();
    }

    res.json({
      success: true,
      data: {
        analytics: analytics.getDailySummary()
      }
    });

  } catch (error) {
    console.error('خطأ في الحصول على التحليلات اليومية:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * الحصول على التحليلات لفترة معينة
 * GET /api/analytics/range
 */
router.get('/range', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'تاريخ البداية والنهاية مطلوبان'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const analyticsData = await Analytics.getUserAnalytics(req.user._id, start, end);

    // تجميع البيانات حسب الفترة المطلوبة
    let groupedData = [];
    if (groupBy === 'week') {
      groupedData = groupAnalyticsByWeek(analyticsData.analytics);
    } else if (groupBy === 'month') {
      groupedData = groupAnalyticsByMonth(analyticsData.analytics);
    } else {
      groupedData = analyticsData.analytics;
    }

    res.json({
      success: true,
      data: {
        analytics: groupedData,
        summary: analyticsData.summary,
        period: {
          startDate: start,
          endDate: end,
          groupBy
        }
      }
    });

  } catch (error) {
    console.error('خطأ في الحصول على تحليلات الفترة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * تحديث النشاط اليومي
 * POST /api/analytics/activity
 */
router.post('/activity', authenticateToken, async (req, res) => {
  try {
    const { activityType, increment = 1, metadata = {} } = req.body;

    if (!activityType) {
      return res.status(400).json({
        success: false,
        message: 'نوع النشاط مطلوب'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // البحث عن سجل اليوم أو إنشاء واحد جديد
    let analytics = await Analytics.findOne({
      userId: req.user._id,
      date: today
    });

    if (!analytics) {
      analytics = new Analytics({
        userId: req.user._id,
        date: today
      });
    }

    // تحديث النشاط
    analytics.updateActivity(activityType, increment);

    // تحديث الأنماط إذا كانت متوفرة
    if (metadata.category) {
      analytics.updatePattern('categoryPerformance', metadata.category, increment);
    }

    if (metadata.language) {
      analytics.updatePattern('languageUsage', metadata.language, increment);
    }

    if (metadata.difficulty) {
      analytics.updatePattern('preferredDifficulty', metadata.difficulty, increment);
    }

    // تحديث توزيع الوقت
    const hour = new Date().getHours();
    let timeSlot = 'morning';
    if (hour >= 12 && hour < 18) timeSlot = 'afternoon';
    else if (hour >= 18 && hour < 24) timeSlot = 'evening';
    else if (hour >= 0 && hour < 6) timeSlot = 'night';

    analytics.updatePattern('timeDistribution', timeSlot, 1);

    await analytics.save();

    res.json({
      success: true,
      message: 'تم تحديث النشاط بنجاح',
      data: {
        analytics: analytics.getDailySummary()
      }
    });

  } catch (error) {
    console.error('خطأ في تحديث النشاط:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * بدء جلسة جديدة
 * POST /api/analytics/session/start
 */
router.post('/session/start', authenticateToken, async (req, res) => {
  try {
    const { deviceInfo = {} } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let analytics = await Analytics.findOne({
      userId: req.user._id,
      date: today
    });

    if (!analytics) {
      analytics = new Analytics({
        userId: req.user._id,
        date: today
      });
    }

    // بدء جلسة جديدة
    const session = analytics.startSession();

    // تحديث معلومات الجهاز
    if (Object.keys(deviceInfo).length > 0) {
      analytics.deviceInfo = {
        ...analytics.deviceInfo,
        ...deviceInfo
      };
    }

    await analytics.save();

    res.json({
      success: true,
      message: 'تم بدء الجلسة بنجاح',
      data: {
        sessionId: session._id,
        startTime: session.startTime
      }
    });

  } catch (error) {
    console.error('خطأ في بدء الجلسة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * إنهاء الجلسة الحالية
 * POST /api/analytics/session/end
 */
router.post('/session/end', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const analytics = await Analytics.findOne({
      userId: req.user._id,
      date: today
    });

    if (!analytics) {
      return res.status(404).json({
        success: false,
        message: 'لا توجد جلسة نشطة'
      });
    }

    // إنهاء الجلسة الحالية
    analytics.endCurrentSession();
    await analytics.save();

    res.json({
      success: true,
      message: 'تم إنهاء الجلسة بنجاح'
    });

  } catch (error) {
    console.error('خطأ في إنهاء الجلسة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * الحصول على تحليل الأداء الذكي المحسن
 * GET /api/analytics/insights
 */
router.get('/insights', authenticateToken, async (req, res) => {
  try {
    const { period = 30 } = req.query; // 30 يوم افتراضياً
    const userId = req.user._id || req.user.id;

    console.log('🧠 بدء التحليل الذكي للمستخدم:', { userId, period });

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    // جمع البيانات من جميع المصادر
    const [lectureStats, quizStats, taskStats] = await Promise.all([
      LectureChat.getUserStats(userId),
      QuizResult.getUserStats(userId),
      TaskProgress.getUserStats(userId)
    ]);

    // الحصول على البيانات التفصيلية الحديثة
    const [recentChats, recentQuizzes, recentTasks] = await Promise.all([
      LectureChat.find({ userId, createdAt: { $gte: startDate } })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('messageCount duration complexity subject tags'),
      QuizResult.find({ userId, createdAt: { $gte: startDate } })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('score difficulty subject performance insights'),
      TaskProgress.find({ userId, createdAt: { $gte: startDate } })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('status pointsEarned language difficulty performance insights')
    ]);

    // إعداد بيانات شاملة للتحليل
    const comprehensiveData = {
      userProfile: {
        name: req.user.name || 'المستخدم',
        period: `${period} أيام`
      },
      lectureData: {
        stats: lectureStats,
        recentActivity: recentChats.map(chat => ({
          messageCount: chat.messageCount,
          duration: chat.duration,
          complexity: chat.complexity,
          subject: chat.subject,
          topics: chat.tags
        }))
      },
      quizData: {
        stats: quizStats,
        recentResults: recentQuizzes.map(quiz => ({
          score: quiz.score,
          difficulty: quiz.difficulty,
          subject: quiz.subject,
          performance: quiz.performance,
          strengths: quiz.insights?.strengths || [],
          weaknesses: quiz.insights?.weaknesses || []
        }))
      },
      taskData: {
        stats: taskStats,
        recentProgress: recentTasks.map(task => ({
          status: task.status,
          points: task.pointsEarned,
          language: task.language,
          difficulty: task.difficulty,
          performance: task.performance,
          strengths: task.insights?.strengths || [],
          improvements: task.insights?.improvements || []
        }))
      },
      overallMetrics: {
        totalActiveDays: period,
        engagementScore: calculateEngagementScore(lectureStats, quizStats, taskStats),
        learningVelocity: calculateLearningVelocity(recentChats, recentQuizzes, recentTasks),
        consistencyScore: calculateConsistencyScore(recentChats, recentQuizzes, recentTasks)
      }
    };

    console.log('📊 البيانات المجمعة للتحليل:', {
      lectures: lectureStats.totalChats,
      quizzes: quizStats.totalQuizzes,
      tasks: taskStats.totalTasks
    });

    // طلب التحليل المحسن من الذكاء الاصطناعي
    const analysisResult = await aiService.analyzeComprehensivePerformance(comprehensiveData, {
      language: 'ar',
      includeRecommendations: true,
      includePersonalizedPlan: true
    });

    let insights = {};
    if (analysisResult.success) {
      try {
        insights = typeof analysisResult.content === 'string'
          ? JSON.parse(analysisResult.content)
          : analysisResult.content;
      } catch (parseError) {
        console.error('❌ خطأ في تحليل نتيجة الذكاء الاصطناعي:', parseError);
        insights = generateFallbackInsights(comprehensiveData);
      }
    } else {
      console.warn('⚠️ فشل التحليل الذكي، استخدام التحليل الاحتياطي');
      insights = generateFallbackInsights(comprehensiveData);
    }

    console.log('✅ تم إنجاز التحليل الذكي بنجاح');

    res.json({
      success: true,
      data: {
        insights,
        rawData: {
          lectures: lectureStats,
          quizzes: quizStats,
          tasks: taskStats,
          engagement: comprehensiveData.overallMetrics
        },
        period: {
          days: period,
          startDate,
          endDate
        }
      }
    });

  } catch (error) {
    console.error('❌ خطأ في الحصول على تحليل الأداء:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم',
      error: error.message
    });
  }
});

/**
 * التحليل الشامل الجديد - يجمع كل البيانات
 * GET /api/analytics/comprehensive
 */
router.get('/comprehensive', authenticateToken, async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const userId = req.user._id || req.user.id;

    console.log('📈 بدء التحليل الشامل:', { userId, period });

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    // جمع جميع البيانات بالتوازي
    const [
      lectureStats,
      quizStats,
      taskStats,
      lectureReport,
      quizReport,
      taskReport
    ] = await Promise.all([
      LectureChat.getUserStats(userId),
      QuizResult.getUserStats(userId),
      TaskProgress.getUserStats(userId),
      LectureChat.find({ userId, createdAt: { $gte: startDate } })
        .sort({ createdAt: -1 })
        .select('messageCount duration complexity subject createdAt'),
      QuizResult.getPerformanceReport(userId, period),
      TaskProgress.find({ userId, updatedAt: { $gte: startDate } })
        .sort({ updatedAt: -1 })
        .select('status pointsEarned language difficulty updatedAt')
    ]);

    // حساب المؤشرات المتقدمة
    const analytics = {
      summary: {
        totalActiveDays: period,
        lecturesEngagement: lectureStats.totalChats,
        quizzesPerformance: Math.round(quizStats.avgScore || 0),
        tasksCompletion: Math.round((taskStats.completedTasks / Math.max(taskStats.totalTasks, 1)) * 100),
        overallScore: calculateOverallScore(lectureStats, quizStats, taskStats)
      },
      trends: {
        lectures: analyzeTrend(lectureReport, 'messageCount'),
        quizzes: analyzeTrend(quizReport, 'dailyAvgScore'),
        tasks: analyzeTrend(taskReport, 'pointsEarned')
      },
      insights: {
        strengths: identifyStrengths(lectureStats, quizStats, taskStats),
        improvements: identifyImprovements(lectureStats, quizStats, taskStats),
        recommendations: generateRecommendations(lectureStats, quizStats, taskStats)
      },
      detailed: {
        lectures: {
          stats: lectureStats,
          recentActivity: lectureReport.slice(0, 7)
        },
        quizzes: {
          stats: quizStats,
          performanceReport: quizReport.slice(0, 7)
        },
        tasks: {
          stats: taskStats,
          recentProgress: taskReport.slice(0, 7)
        }
      }
    };

    console.log('✅ تم إنجاز التحليل الشامل');

    res.json({
      success: true,
      data: analytics,
      period: {
        days: period,
        startDate,
        endDate
      }
    });

  } catch (error) {
    console.error('❌ خطأ في التحليل الشامل:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في التحليل الشامل',
      error: error.message
    });
  }
});

/**
 * الحصول على الإنجازات
 * GET /api/analytics/achievements
 */
router.get('/achievements', authenticateToken, async (req, res) => {
  try {
    const { period = 30 } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    const analytics = await Analytics.find({
      userId: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    }).sort('-date');

    // جمع جميع الإنجازات
    const allAchievements = [];
    analytics.forEach(day => {
      day.achievements.forEach(achievement => {
        allAchievements.push({
          ...achievement.toObject(),
          date: day.date
        });
      });
    });

    // ترتيب الإنجازات حسب التاريخ
    allAchievements.sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt));

    res.json({
      success: true,
      data: {
        achievements: allAchievements,
        totalAchievements: allAchievements.length,
        totalPoints: allAchievements.reduce((sum, ach) => sum + ach.points, 0)
      }
    });

  } catch (error) {
    console.error('خطأ في الحصول على الإنجازات:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * دوال مساعدة للتحليل المحسن
 */

// حساب نقاط المشاركة
function calculateEngagementScore(lectureStats, quizStats, taskStats) {
  let score = 0;

  // نقاط المحادثات (40%)
  if (lectureStats.totalChats > 0) {
    score += Math.min((lectureStats.totalMessages / 100) * 40, 40);
  }

  // نقاط الاختبارات (35%)
  if (quizStats.totalQuizzes > 0) {
    score += Math.min((quizStats.avgScore / 100) * 35, 35);
  }

  // نقاط المهام (25%)
  if (taskStats.totalTasks > 0) {
    const completionRate = taskStats.completedTasks / taskStats.totalTasks;
    score += completionRate * 25;
  }

  return Math.round(score);
}

// حساب سرعة التعلم
function calculateLearningVelocity(recentChats, recentQuizzes, recentTasks) {
  const totalActivities = recentChats.length + recentQuizzes.length + recentTasks.length;
  const daysActive = 7; // آخر أسبوع

  return Math.round((totalActivities / daysActive) * 10) / 10;
}

// حساب نقاط الثبات
function calculateConsistencyScore(recentChats, recentQuizzes, recentTasks) {
  const activities = [
    ...recentChats.map(c => ({ date: c.createdAt || new Date(), type: 'chat' })),
    ...recentQuizzes.map(q => ({ date: q.createdAt || new Date(), type: 'quiz' })),
    ...recentTasks.map(t => ({ date: t.createdAt || new Date(), type: 'task' }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (activities.length < 3) return 0;

  // حساب التوزيع عبر الأيام
  const dayGroups = {};
  activities.forEach(activity => {
    const day = new Date(activity.date).toDateString();
    dayGroups[day] = (dayGroups[day] || 0) + 1;
  });

  const activeDays = Object.keys(dayGroups).length;
  const maxPossibleDays = 7;

  return Math.round((activeDays / maxPossibleDays) * 100);
}

// توليد تحليل احتياطي
function generateFallbackInsights(data) {
  const { lectureData, quizData, taskData, overallMetrics } = data;

  const insights = {
    overallPerformance: {
      score: overallMetrics.engagementScore,
      grade: getGradeFromScore(overallMetrics.engagementScore),
      summary: `أداء ${getPerformanceLevel(overallMetrics.engagementScore)} بنقاط مشاركة ${overallMetrics.engagementScore}/100`
    },
    strengths: [],
    weaknesses: [],
    recommendations: [],
    detailedAnalysis: {
      lectures: analyzeLecturePerformance(lectureData),
      quizzes: analyzeQuizPerformance(quizData),
      tasks: analyzeTaskPerformance(taskData)
    },
    personalizedPlan: generatePersonalizedPlan(data)
  };

  // تحليل نقاط القوة
  if (lectureData.stats.totalChats > 10) {
    insights.strengths.push('مشاركة نشطة في المحادثات التعليمية');
  }
  if (quizData.stats.avgScore > 75) {
    insights.strengths.push('أداء ممتاز في الاختبارات');
  }
  if (taskData.stats.completedTasks > 5) {
    insights.strengths.push('إنجاز جيد للمهام البرمجية');
  }
  if (overallMetrics.consistencyScore > 70) {
    insights.strengths.push('انتظام في الدراسة والتعلم');
  }

  // تحليل نقاط الضعف
  if (lectureData.stats.totalChats < 5) {
    insights.weaknesses.push('قلة المشاركة في المحادثات التعليمية');
    insights.recommendations.push('زيادة التفاعل مع نظام المحادثات لتحسين الفهم');
  }
  if (quizData.stats.avgScore < 60) {
    insights.weaknesses.push('انخفاض في درجات الاختبارات');
    insights.recommendations.push('مراجعة المواد الدراسية والتدرب على المزيد من الأسئلة');
  }
  if (taskData.stats.completedTasks < 3) {
    insights.weaknesses.push('قلة إنجاز المهام البرمجية');
    insights.recommendations.push('التركيز على حل المزيد من المهام البرمجية لتطوير المهارات');
  }
  if (overallMetrics.consistencyScore < 50) {
    insights.weaknesses.push('عدم انتظام في الدراسة');
    insights.recommendations.push('وضع جدول زمني ثابت للدراسة والالتزام به');
  }

  // توصيات عامة
  insights.recommendations.push('الاستمرار في التعلم والممارسة اليومية');
  insights.recommendations.push('تنويع أساليب التعلم بين المحادثات والاختبارات والمهام');

  return insights;
}

// دوال مساعدة إضافية
function getGradeFromScore(score) {
  if (score >= 90) return 'ممتاز';
  if (score >= 80) return 'جيد جداً';
  if (score >= 70) return 'جيد';
  if (score >= 60) return 'مقبول';
  return 'يحتاج تحسين';
}

function getPerformanceLevel(score) {
  if (score >= 80) return 'متقدم';
  if (score >= 60) return 'متوسط';
  return 'مبتدئ';
}

function analyzeLecturePerformance(lectureData) {
  const { stats, recentActivity } = lectureData;

  return {
    totalChats: stats.totalChats,
    avgDuration: stats.avgDuration,
    complexity: stats.complexityDistribution,
    subjects: stats.subjects,
    engagement: stats.totalMessages > 50 ? 'عالي' : stats.totalMessages > 20 ? 'متوسط' : 'منخفض'
  };
}

function analyzeQuizPerformance(quizData) {
  const { stats, recentResults } = quizData;

  return {
    totalQuizzes: stats.totalQuizzes,
    avgScore: stats.avgScore,
    bestScore: stats.bestScore,
    improvement: recentResults.length > 1 ?
      (recentResults[0].score > recentResults[recentResults.length - 1].score ? 'محسن' : 'ثابت') : 'غير محدد'
  };
}

function analyzeTaskPerformance(taskData) {
  const { stats, recentProgress } = taskData;

  return {
    totalTasks: stats.totalTasks,
    completedTasks: stats.completedTasks,
    totalPoints: stats.totalPoints,
    avgPerformance: stats.avgPerformance,
    languages: stats.languageDistribution,
    completionRate: stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0
  };
}

function generatePersonalizedPlan(data) {
  const plan = {
    daily: [],
    weekly: [],
    monthly: []
  };

  // خطة يومية
  plan.daily.push('قضاء 30 دقيقة في المحادثات التعليمية');
  plan.daily.push('حل سؤال واحد على الأقل');

  // خطة أسبوعية
  plan.weekly.push('إكمال 3-5 مهام برمجية');
  plan.weekly.push('مراجعة الأداء والتقدم');

  // خطة شهرية
  plan.monthly.push('تقييم شامل للأداء');
  plan.monthly.push('وضع أهداف جديدة للشهر القادم');

  return plan;
}

// دوال التحليل الشامل الجديدة
function calculateOverallScore(lectureStats, quizStats, taskStats) {
  let score = 0;
  let components = 0;

  // نقاط المحادثات (30%)
  if (lectureStats.totalChats > 0) {
    const lectureScore = Math.min((lectureStats.totalMessages / 50) * 30, 30);
    score += lectureScore;
    components++;
  }

  // نقاط الاختبارات (40%)
  if (quizStats.totalQuizzes > 0) {
    const quizScore = (quizStats.avgScore / 100) * 40;
    score += quizScore;
    components++;
  }

  // نقاط المهام (30%)
  if (taskStats.totalTasks > 0) {
    const taskScore = (taskStats.completedTasks / taskStats.totalTasks) * 30;
    score += taskScore;
    components++;
  }

  return components > 0 ? Math.round(score) : 0;
}

function analyzeTrend(data, field) {
  if (!data || data.length < 2) return 'مستقر';

  const values = data.map(item => item[field] || 0).filter(v => v > 0);
  if (values.length < 2) return 'مستقر';

  const recent = values.slice(0, Math.min(3, values.length));
  const older = values.slice(-Math.min(3, values.length));

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

  if (recentAvg > olderAvg * 1.1) return 'متحسن';
  if (recentAvg < olderAvg * 0.9) return 'متراجع';
  return 'مستقر';
}

function identifyStrengths(lectureStats, quizStats, taskStats) {
  const strengths = [];

  if (lectureStats.totalChats > 15) {
    strengths.push('مشاركة نشطة في المحادثات التعليمية');
  }
  if (lectureStats.avgDuration > 10) {
    strengths.push('قضاء وقت كافي في التعلم');
  }
  if (quizStats.avgScore > 80) {
    strengths.push('أداء ممتاز في الاختبارات');
  }
  if (quizStats.bestScore > 90) {
    strengths.push('قدرة على تحقيق درجات عالية');
  }
  if (taskStats.completedTasks > 10) {
    strengths.push('إنجاز جيد للمهام البرمجية');
  }
  if (taskStats.avgPerformance > 75) {
    strengths.push('مهارات برمجية متقدمة');
  }

  return strengths.length > 0 ? strengths : ['الاستمرار في التعلم'];
}

function identifyImprovements(lectureStats, quizStats, taskStats) {
  const improvements = [];

  if (lectureStats.totalChats < 5) {
    improvements.push('زيادة المشاركة في المحادثات التعليمية');
  }
  if (lectureStats.avgDuration < 5) {
    improvements.push('قضاء وقت أطول في كل جلسة تعليمية');
  }
  if (quizStats.avgScore < 60) {
    improvements.push('تحسين الأداء في الاختبارات');
  }
  if (taskStats.completedTasks < 3) {
    improvements.push('زيادة إنجاز المهام البرمجية');
  }
  if (taskStats.avgPerformance < 50) {
    improvements.push('تطوير المهارات البرمجية');
  }

  return improvements;
}

function generateRecommendations(lectureStats, quizStats, taskStats) {
  const recommendations = [];

  // توصيات المحادثات
  if (lectureStats.totalChats < 10) {
    recommendations.push('استخدم نظام المحادثات أكثر لطرح الأسئلة والحصول على التوضيحات');
  }

  // توصيات الاختبارات
  if (quizStats.avgScore < 70) {
    recommendations.push('راجع المواد قبل الاختبارات وتدرب على أسئلة مشابهة');
  }

  // توصيات المهام
  if (taskStats.completedTasks < 5) {
    recommendations.push('ابدأ بالمهام السهلة ثم تدرج للمهام الأصعب');
  }

  // توصيات عامة
  recommendations.push('حافظ على الانتظام في التعلم اليومي');
  recommendations.push('نوع بين أساليب التعلم المختلفة');

  if (recommendations.length === 2) {
    recommendations.push('ضع أهدافاً واضحة وقابلة للقياس');
  }

  return recommendations;
}

/**
 * دوال مساعدة لتجميع البيانات
 */
function groupAnalyticsByWeek(analytics) {
  const weeks = {};
  
  analytics.forEach(day => {
    const weekStart = new Date(day.date);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeks[weekKey]) {
      weeks[weekKey] = {
        weekStart,
        activities: { ...day.activities },
        performance: { ...day.performance }
      };
    } else {
      // جمع الأنشطة
      Object.keys(day.activities).forEach(key => {
        weeks[weekKey].activities[key] += day.activities[key];
      });
      
      // حساب متوسط الأداء
      weeks[weekKey].performance.totalAnswers += day.performance.totalAnswers;
      weeks[weekKey].performance.correctAnswers += day.performance.correctAnswers;
      weeks[weekKey].performance.pointsEarned += day.performance.pointsEarned;
    }
  });
  
  return Object.values(weeks);
}

function groupAnalyticsByMonth(analytics) {
  const months = {};
  
  analytics.forEach(day => {
    const monthKey = day.date.toISOString().substring(0, 7); // YYYY-MM
    
    if (!months[monthKey]) {
      months[monthKey] = {
        month: monthKey,
        activities: { ...day.activities },
        performance: { ...day.performance }
      };
    } else {
      // جمع الأنشطة
      Object.keys(day.activities).forEach(key => {
        months[monthKey].activities[key] += day.activities[key];
      });
      
      // حساب متوسط الأداء
      months[monthKey].performance.totalAnswers += day.performance.totalAnswers;
      months[monthKey].performance.correctAnswers += day.performance.correctAnswers;
      months[monthKey].performance.pointsEarned += day.performance.pointsEarned;
    }
  });
  
  return Object.values(months);
}

module.exports = router;
