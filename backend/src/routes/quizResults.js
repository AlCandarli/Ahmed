const express = require('express');
const router = express.Router();
const QuizResult = require('../models/QuizResult');
const { authenticateToken } = require('../middleware/auth');

// حفظ نتيجة اختبار جديدة
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const {
      sessionId,
      questions,
      totalQuestions,
      correctAnswers,
      difficulty,
      subject,
      sourceFile
    } = req.body;
    
    const userId = req.user.id;

    console.log('📝 حفظ نتيجة اختبار:', { 
      userId, 
      sessionId, 
      totalQuestions, 
      correctAnswers, 
      difficulty 
    });

    if (!sessionId || !questions || !Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        message: 'معرف الجلسة والأسئلة مطلوبة'
      });
    }

    // التحقق من وجود نتيجة سابقة لنفس الجلسة
    const existingResult = await QuizResult.findOne({ userId, sessionId });
    if (existingResult) {
      return res.status(400).json({
        success: false,
        message: 'تم حفظ نتيجة هذا الاختبار مسبقاً'
      });
    }

    // إنشاء نتيجة جديدة
    const quizResult = new QuizResult({
      userId,
      sessionId,
      questions,
      totalQuestions,
      correctAnswers,
      difficulty,
      subject: subject || '',
      sourceFile: sourceFile || {}
    });

    await quizResult.save();

    console.log('✅ تم حفظ نتيجة الاختبار بنجاح');

    res.json({
      success: true,
      message: 'تم حفظ نتيجة الاختبار بنجاح',
      data: {
        resultId: quizResult._id,
        score: quizResult.score,
        performance: quizResult.performance,
        insights: quizResult.insights
      }
    });

  } catch (error) {
    console.error('❌ خطأ في حفظ نتيجة الاختبار:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حفظ نتيجة الاختبار',
      error: error.message
    });
  }
});

// جلب نتائج المستخدم
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, difficulty, subject, minScore } = req.query;

    console.log('📖 جلب نتائج المستخدم:', { userId, page, limit });

    const query = { userId };
    if (difficulty) query.difficulty = difficulty;
    if (subject) query.subject = subject;
    if (minScore) query.score = { $gte: parseInt(minScore) };

    const results = await QuizResult.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-questions.explanation -questions.metadata');

    const total = await QuizResult.countDocuments(query);

    res.json({
      success: true,
      data: {
        results,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: results.length,
          totalRecords: total
        }
      }
    });

  } catch (error) {
    console.error('❌ خطأ في جلب نتائج المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب النتائج',
      error: error.message
    });
  }
});

// جلب نتيجة محددة
router.get('/:resultId', authenticateToken, async (req, res) => {
  try {
    const { resultId } = req.params;
    const userId = req.user.id;

    console.log('📖 جلب نتيجة محددة:', { userId, resultId });

    const result = await QuizResult.findOne({ _id: resultId, userId });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'النتيجة غير موجودة'
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ خطأ في جلب النتيجة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب النتيجة',
      error: error.message
    });
  }
});

// إحصائيات نتائج المستخدم
router.get('/stats/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('📊 جلب إحصائيات نتائج المستخدم:', { userId });

    const stats = await QuizResult.getUserStats(userId);

    // إحصائيات إضافية
    const recentResults = await QuizResult.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('score difficulty subject totalQuestions correctAnswers createdAt');

    const difficultyStats = await QuizResult.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
      { 
        $group: { 
          _id: '$difficulty', 
          count: { $sum: 1 }, 
          avgScore: { $avg: '$score' },
          bestScore: { $max: '$score' }
        } 
      },
      { $sort: { avgScore: -1 } }
    ]);

    const subjectStats = await QuizResult.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
      { 
        $group: { 
          _id: '$subject', 
          count: { $sum: 1 }, 
          avgScore: { $avg: '$score' },
          totalQuestions: { $sum: '$totalQuestions' },
          totalCorrect: { $sum: '$correctAnswers' }
        } 
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        ...stats,
        recentResults,
        difficultyStats,
        subjectStats
      }
    });

  } catch (error) {
    console.error('❌ خطأ في جلب إحصائيات النتائج:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات',
      error: error.message
    });
  }
});

// تقرير الأداء
router.get('/performance/report', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    console.log('📈 جلب تقرير الأداء:', { userId, days });

    const report = await QuizResult.getPerformanceReport(userId, parseInt(days));

    // تحليل الاتجاهات
    const trends = {
      improving: false,
      declining: false,
      stable: true
    };

    if (report.length >= 3) {
      const recent = report.slice(-3);
      const scores = recent.map(r => r.dailyAvgScore);
      
      if (scores[2] > scores[1] && scores[1] > scores[0]) {
        trends.improving = true;
        trends.stable = false;
      } else if (scores[2] < scores[1] && scores[1] < scores[0]) {
        trends.declining = true;
        trends.stable = false;
      }
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
    console.error('❌ خطأ في جلب تقرير الأداء:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب تقرير الأداء',
      error: error.message
    });
  }
});

// حذف نتيجة
router.delete('/:resultId', authenticateToken, async (req, res) => {
  try {
    const { resultId } = req.params;
    const userId = req.user.id;

    console.log('🗑️ حذف نتيجة:', { userId, resultId });

    const result = await QuizResult.deleteOne({ _id: resultId, userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'النتيجة غير موجودة'
      });
    }

    console.log('✅ تم حذف النتيجة بنجاح');

    res.json({
      success: true,
      message: 'تم حذف النتيجة بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في حذف النتيجة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف النتيجة',
      error: error.message
    });
  }
});

// مقارنة الأداء
router.get('/compare/performance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period1 = 7, period2 = 14 } = req.query;

    console.log('🔄 مقارنة الأداء:', { userId, period1, period2 });

    const now = new Date();
    const period1Start = new Date(now.getTime() - period1 * 24 * 60 * 60 * 1000);
    const period2Start = new Date(now.getTime() - period2 * 24 * 60 * 60 * 1000);

    const [currentPeriod, previousPeriod] = await Promise.all([
      QuizResult.aggregate([
        { 
          $match: { 
            userId: require('mongoose').Types.ObjectId(userId),
            createdAt: { $gte: period1Start }
          } 
        },
        {
          $group: {
            _id: null,
            avgScore: { $avg: '$score' },
            totalQuizzes: { $sum: 1 },
            totalQuestions: { $sum: '$totalQuestions' },
            totalCorrect: { $sum: '$correctAnswers' }
          }
        }
      ]),
      QuizResult.aggregate([
        { 
          $match: { 
            userId: require('mongoose').Types.ObjectId(userId),
            createdAt: { $gte: period2Start, $lt: period1Start }
          } 
        },
        {
          $group: {
            _id: null,
            avgScore: { $avg: '$score' },
            totalQuizzes: { $sum: 1 },
            totalQuestions: { $sum: '$totalQuestions' },
            totalCorrect: { $sum: '$correctAnswers' }
          }
        }
      ])
    ]);

    const current = currentPeriod[0] || { avgScore: 0, totalQuizzes: 0 };
    const previous = previousPeriod[0] || { avgScore: 0, totalQuizzes: 0 };

    const comparison = {
      scoreChange: current.avgScore - previous.avgScore,
      quizChange: current.totalQuizzes - previous.totalQuizzes,
      improvement: current.avgScore > previous.avgScore
    };

    res.json({
      success: true,
      data: {
        current,
        previous,
        comparison,
        periods: {
          current: `آخر ${period1} أيام`,
          previous: `${period2}-${period1} أيام مضت`
        }
      }
    });

  } catch (error) {
    console.error('❌ خطأ في مقارنة الأداء:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في مقارنة الأداء',
      error: error.message
    });
  }
});

module.exports = router;
