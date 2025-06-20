const express = require('express');
const router = express.Router();

/**
 * الحصول على إحصائيات الموقع العامة
 */
router.get('/site', async (req, res) => {
  try {
    // إحصائيات حقيقية من قاعدة البيانات
    const stats = {
      totalUsers: await getTotalUsers(),
      totalSessions: await getTotalSessions(),
      totalQuestions: await getTotalQuestions(),
      totalTasks: await getTotalTasks(),
      totalReports: await getTotalReports(),
      activeUsers: await getActiveUsers(),
      completionRate: await getCompletionRate(),
      averageScore: await getAverageScore(),
      dailyStats: await getDailyStats(),
      weeklyGrowth: await getWeeklyGrowth(),
      topPerformers: await getTopPerformers(),
      sectionUsage: await getSectionUsage()
    };

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('خطأ في جلب إحصائيات الموقع:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الإحصائيات',
      error: error.message
    });
  }
});

/**
 * الحصول على إحصائيات المستخدم الشخصية
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const userStats = {
      totalSessions: await getUserSessions(userId),
      studyTime: await getUserStudyTime(userId),
      questionsAnswered: await getUserQuestions(userId),
      tasksCompleted: await getUserTasks(userId),
      reportsGenerated: await getUserReports(userId),
      averageScore: await getUserAverageScore(userId),
      weeklyProgress: await getUserWeeklyProgress(userId),
      sectionProgress: await getUserSectionProgress(userId),
      achievements: await getUserAchievements(userId),
      rank: await getUserRank(userId)
    };

    res.json({
      success: true,
      data: userStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('خطأ في جلب إحصائيات المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب إحصائيات المستخدم',
      error: error.message
    });
  }
});

// دوال مساعدة للإحصائيات
async function getTotalUsers() {
  try {
    const User = require('../models/User');
    return await User.countDocuments();
  } catch (error) {
    return 0;
  }
}

async function getTotalSessions() {
  try {
    const Session = require('../models/Session');
    return await Session.countDocuments();
  } catch (error) {
    return 0;
  }
}

async function getTotalQuestions() {
  try {
    const Question = require('../models/Question');
    return await Question.countDocuments();
  } catch (error) {
    return 0;
  }
}

async function getTotalTasks() {
  try {
    const Task = require('../models/Task');
    return await Task.countDocuments();
  } catch (error) {
    return 0;
  }
}

async function getTotalReports() {
  try {
    const Report = require('../models/Report');
    return await Report.countDocuments();
  } catch (error) {
    return 0;
  }
}

async function getActiveUsers() {
  try {
    const User = require('../models/User');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return await User.countDocuments({ lastActive: { $gte: thirtyDaysAgo } });
  } catch (error) {
    return 0;
  }
}

async function getCompletionRate() {
  try {
    const Task = require('../models/Task');
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ completed: true });
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  } catch (error) {
    return 0;
  }
}

async function getAverageScore() {
  try {
    const Question = require('../models/Question');
    const result = await Question.aggregate([
      { $match: { score: { $exists: true } } },
      { $group: { _id: null, avgScore: { $avg: '$score' } } }
    ]);
    return result.length > 0 ? Math.round(result[0].avgScore) : 0;
  } catch (error) {
    return 0;
  }
}

async function getDailyStats() {
  try {
    const User = require('../models/User');
    const today = new Date();
    const last7Days = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      
      const count = await User.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });
      
      last7Days.push(count);
    }
    
    return last7Days;
  } catch (error) {
    return [0, 0, 0, 0, 0, 0, 0];
  }
}

async function getWeeklyGrowth() {
  try {
    const User = require('../models/User');
    const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const lastWeek = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    
    const thisWeekUsers = await User.countDocuments({ createdAt: { $gte: thisWeek } });
    const lastWeekUsers = await User.countDocuments({ 
      createdAt: { $gte: lastWeek, $lt: thisWeek } 
    });
    
    if (lastWeekUsers === 0) return thisWeekUsers > 0 ? 100 : 0;
    return Math.round(((thisWeekUsers - lastWeekUsers) / lastWeekUsers) * 100);
  } catch (error) {
    return 0;
  }
}

async function getTopPerformers() {
  try {
    const User = require('../models/User');
    return await User.find()
      .sort({ totalPoints: -1 })
      .limit(5)
      .select('name totalPoints averageScore')
      .lean();
  } catch (error) {
    return [];
  }
}

async function getSectionUsage() {
  try {
    const Session = require('../models/Session');
    const result = await Session.aggregate([
      { $group: { 
        _id: '$section', 
        count: { $sum: 1 },
        totalTime: { $sum: '$duration' }
      }},
      { $sort: { count: -1 } }
    ]);
    
    const sections = {
      lectures: 0,
      questions: 0,
      tasks: 0,
      reports: 0,
      analytics: 0
    };
    
    result.forEach(item => {
      if (sections.hasOwnProperty(item._id)) {
        sections[item._id] = item.count;
      }
    });
    
    return sections;
  } catch (error) {
    return {
      lectures: 0,
      questions: 0,
      tasks: 0,
      reports: 0,
      analytics: 0
    };
  }
}

// دوال إحصائيات المستخدم
async function getUserSessions(userId) {
  try {
    const Session = require('../models/Session');
    return await Session.countDocuments({ userId });
  } catch (error) {
    return 0;
  }
}

async function getUserStudyTime(userId) {
  try {
    const Session = require('../models/Session');
    const result = await Session.aggregate([
      { $match: { userId } },
      { $group: { _id: null, totalTime: { $sum: '$duration' } } }
    ]);
    return result.length > 0 ? result[0].totalTime : 0;
  } catch (error) {
    return 0;
  }
}

async function getUserQuestions(userId) {
  try {
    const Question = require('../models/Question');
    return await Question.countDocuments({ userId, answered: true });
  } catch (error) {
    return 0;
  }
}

async function getUserTasks(userId) {
  try {
    const Task = require('../models/Task');
    return await Task.countDocuments({ userId, completed: true });
  } catch (error) {
    return 0;
  }
}

async function getUserReports(userId) {
  try {
    const Report = require('../models/Report');
    return await Report.countDocuments({ userId });
  } catch (error) {
    return 0;
  }
}

async function getUserAverageScore(userId) {
  try {
    const Question = require('../models/Question');
    const result = await Question.aggregate([
      { $match: { userId, score: { $exists: true } } },
      { $group: { _id: null, avgScore: { $avg: '$score' } } }
    ]);
    return result.length > 0 ? Math.round(result[0].avgScore) : 0;
  } catch (error) {
    return 0;
  }
}

async function getUserWeeklyProgress(userId) {
  try {
    const Session = require('../models/Session');
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      
      const sessions = await Session.countDocuments({
        userId,
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });
      
      last7Days.push(sessions);
    }
    
    return last7Days;
  } catch (error) {
    return [0, 0, 0, 0, 0, 0, 0];
  }
}

async function getUserSectionProgress(userId) {
  try {
    const Session = require('../models/Session');
    const result = await Session.aggregate([
      { $match: { userId } },
      { $group: { 
        _id: '$section', 
        count: { $sum: 1 }
      }}
    ]);
    
    const sections = {
      lectures: 0,
      questions: 0,
      tasks: 0,
      reports: 0
    };
    
    result.forEach(item => {
      if (sections.hasOwnProperty(item._id)) {
        sections[item._id] = item.count;
      }
    });
    
    // تحويل إلى نسب مئوية
    const total = Object.values(sections).reduce((sum, count) => sum + count, 0);
    if (total > 0) {
      Object.keys(sections).forEach(key => {
        sections[key] = Math.round((sections[key] / total) * 100);
      });
    }
    
    return sections;
  } catch (error) {
    return {
      lectures: 0,
      questions: 0,
      tasks: 0,
      reports: 0
    };
  }
}

async function getUserAchievements(userId) {
  try {
    const Achievement = require('../models/Achievement');
    return await Achievement.find({ userId }).lean();
  } catch (error) {
    return [];
  }
}

async function getUserRank(userId) {
  try {
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) return 0;
    
    const rank = await User.countDocuments({ 
      totalPoints: { $gt: user.totalPoints } 
    });
    
    return rank + 1;
  } catch (error) {
    return 0;
  }
}

module.exports = router;
