const express = require('express');
const router = express.Router();
const TaskProgress = require('../models/TaskProgress');
const { authenticateToken } = require('../middleware/auth');

// حفظ تقدم مهمة جديدة أو تحديث موجودة
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const {
      taskId,
      taskTitle,
      taskDescription,
      language,
      difficulty,
      category,
      status,
      code,
      output,
      isCorrect,
      feedback,
      timeSpent,
      maxPoints
    } = req.body;
    
    const userId = req.user.id;

    console.log('🎯 حفظ تقدم المهمة:', { 
      userId, 
      taskId, 
      status, 
      isCorrect,
      timeSpent 
    });

    if (!taskId || !taskTitle || !language || !difficulty || !category) {
      return res.status(400).json({
        success: false,
        message: 'معرف المهمة والعنوان واللغة والصعوبة والفئة مطلوبة'
      });
    }

    // البحث عن تقدم موجود أو إنشاء جديد
    let progress = await TaskProgress.findOne({ userId, taskId });

    if (progress) {
      // تحديث التقدم الموجود
      if (status) progress.status = status;
      
      // إضافة محاولة جديدة إذا تم تقديم كود
      if (code !== undefined) {
        const attemptNumber = progress.attempts.length + 1;
        progress.attempts.push({
          attemptNumber,
          code,
          output: output || '',
          isCorrect: isCorrect || false,
          feedback: feedback || '',
          timeSpent: timeSpent || 0,
          timestamp: new Date()
        });
      }
    } else {
      // إنشاء تقدم جديد
      progress = new TaskProgress({
        userId,
        taskId,
        taskTitle,
        taskDescription: taskDescription || '',
        language,
        difficulty,
        category,
        status: status || 'not_started',
        maxPoints: maxPoints || 100,
        attempts: code !== undefined ? [{
          attemptNumber: 1,
          code,
          output: output || '',
          isCorrect: isCorrect || false,
          feedback: feedback || '',
          timeSpent: timeSpent || 0,
          timestamp: new Date()
        }] : []
      });
    }

    await progress.save();

    console.log('✅ تم حفظ تقدم المهمة بنجاح');

    res.json({
      success: true,
      message: 'تم حفظ تقدم المهمة بنجاح',
      data: {
        progressId: progress._id,
        status: progress.status,
        totalAttempts: progress.totalAttempts,
        pointsEarned: progress.pointsEarned,
        performance: progress.performance,
        insights: progress.insights
      }
    });

  } catch (error) {
    console.error('❌ خطأ في حفظ تقدم المهمة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حفظ تقدم المهمة',
      error: error.message
    });
  }
});

// جلب تقدم المهام للمستخدم
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { 
      page = 1, 
      limit = 10, 
      language, 
      difficulty, 
      category, 
      status 
    } = req.query;

    console.log('📖 جلب تقدم المهام للمستخدم:', { userId, page, limit });

    const query = { userId };
    if (language) query.language = language;
    if (difficulty) query.difficulty = difficulty;
    if (category) query.category = category;
    if (status) query.status = status;

    const progress = await TaskProgress.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-attempts.code -attempts.output');

    const total = await TaskProgress.countDocuments(query);

    res.json({
      success: true,
      data: {
        progress,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: progress.length,
          totalRecords: total
        }
      }
    });

  } catch (error) {
    console.error('❌ خطأ في جلب تقدم المهام:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب تقدم المهام',
      error: error.message
    });
  }
});

// جلب تقدم مهمة محددة
router.get('/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    console.log('📖 جلب تقدم مهمة محددة:', { userId, taskId });

    const progress = await TaskProgress.findOne({ userId, taskId });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'تقدم المهمة غير موجود'
      });
    }

    res.json({
      success: true,
      data: progress
    });

  } catch (error) {
    console.error('❌ خطأ في جلب تقدم المهمة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب تقدم المهمة',
      error: error.message
    });
  }
});

// إحصائيات تقدم المهام للمستخدم
router.get('/stats/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('📊 جلب إحصائيات تقدم المهام:', { userId });

    const stats = await TaskProgress.getUserStats(userId);

    // إحصائيات إضافية
    const recentProgress = await TaskProgress.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('taskTitle language difficulty status pointsEarned totalAttempts updatedAt');

    const languageStats = await TaskProgress.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
      { 
        $group: { 
          _id: '$language', 
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalPoints: { $sum: '$pointsEarned' },
          avgPerformance: { $avg: '$performance.problemSolving' }
        } 
      },
      { $sort: { totalTasks: -1 } }
    ]);

    const difficultyStats = await TaskProgress.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
      { 
        $group: { 
          _id: '$difficulty', 
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          avgAttempts: { $avg: '$totalAttempts' },
          avgPoints: { $avg: '$pointsEarned' }
        } 
      },
      { $sort: { totalTasks: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        ...stats,
        recentProgress,
        languageStats,
        difficultyStats
      }
    });

  } catch (error) {
    console.error('❌ خطأ في جلب إحصائيات تقدم المهام:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات',
      error: error.message
    });
  }
});

// إضافة تلميح لمهمة
router.post('/:taskId/hint', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { hintText } = req.body;
    const userId = req.user.id;

    console.log('💡 إضافة تلميح للمهمة:', { userId, taskId });

    if (!hintText) {
      return res.status(400).json({
        success: false,
        message: 'نص التلميح مطلوب'
      });
    }

    const progress = await TaskProgress.findOne({ userId, taskId });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'تقدم المهمة غير موجود'
      });
    }

    // إضافة التلميح للمحاولة الأخيرة
    if (progress.attempts.length > 0) {
      const lastAttempt = progress.attempts[progress.attempts.length - 1];
      lastAttempt.hints.push({
        hintText,
        timestamp: new Date()
      });

      await progress.save();

      res.json({
        success: true,
        message: 'تم إضافة التلميح بنجاح'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'لا توجد محاولات لإضافة التلميح إليها'
      });
    }

  } catch (error) {
    console.error('❌ خطأ في إضافة التلميح:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة التلميح',
      error: error.message
    });
  }
});

// حذف تقدم مهمة
router.delete('/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    console.log('🗑️ حذف تقدم المهمة:', { userId, taskId });

    const result = await TaskProgress.deleteOne({ userId, taskId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'تقدم المهمة غير موجود'
      });
    }

    console.log('✅ تم حذف تقدم المهمة بنجاح');

    res.json({
      success: true,
      message: 'تم حذف تقدم المهمة بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في حذف تقدم المهمة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف تقدم المهمة',
      error: error.message
    });
  }
});

// تقرير الأداء الشامل
router.get('/performance/comprehensive', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    console.log('📈 جلب تقرير الأداء الشامل:', { userId, days });

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const report = await TaskProgress.aggregate([
      { 
        $match: { 
          userId: require('mongoose').Types.ObjectId(userId),
          updatedAt: { $gte: startDate }
        } 
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" }
          },
          dailyTasks: { $sum: 1 },
          dailyCompleted: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          dailyPoints: { $sum: '$pointsEarned' },
          avgPerformance: { $avg: '$performance.problemSolving' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // تحليل الاتجاهات
    const trends = {
      productivity: 'stable',
      performance: 'stable',
      consistency: 'stable'
    };

    if (report.length >= 7) {
      const recent = report.slice(-7);
      const completionRates = recent.map(r => r.dailyCompleted / r.dailyTasks);
      const performances = recent.map(r => r.avgPerformance);

      // تحليل الإنتاجية
      const avgCompletion = completionRates.reduce((a, b) => a + b, 0) / completionRates.length;
      if (avgCompletion > 0.7) trends.productivity = 'improving';
      else if (avgCompletion < 0.3) trends.productivity = 'declining';

      // تحليل الأداء
      const avgPerformance = performances.reduce((a, b) => a + b, 0) / performances.length;
      if (avgPerformance > 75) trends.performance = 'improving';
      else if (avgPerformance < 50) trends.performance = 'declining';
    }

    res.json({
      success: true,
      data: {
        report,
        trends,
        period: `${days} أيام`
      }
    });

  } catch (error) {
    console.error('❌ خطأ في جلب تقرير الأداء الشامل:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب تقرير الأداء',
      error: error.message
    });
  }
});

module.exports = router;
