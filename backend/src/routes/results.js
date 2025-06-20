const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');

// نماذج قاعدة البيانات
const QuestionResult = require('../models/QuestionResult');
const TaskResult = require('../models/TaskResult');

// حفظ نتيجة الأسئلة
router.post('/questions', authenticateToken, async (req, res) => {
  try {
    const { userId, questions, answers, score, totalQuestions, difficulty, section } = req.body;

    console.log('📝 حفظ نتيجة الأسئلة:', {
      userId,
      score,
      totalQuestions,
      difficulty
    });

    const questionResult = new QuestionResult({
      userId,
      questions,
      answers,
      score,
      totalQuestions,
      difficulty,
      section: section || 'questions',
      percentage: Math.round((score / totalQuestions) * 100),
      completedAt: new Date()
    });

    await questionResult.save();

    console.log('✅ تم حفظ نتيجة الأسئلة بنجاح');
    res.json({
      success: true,
      message: 'تم حفظ النتيجة بنجاح',
      data: questionResult
    });

  } catch (error) {
    console.error('❌ خطأ في حفظ نتيجة الأسئلة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حفظ النتيجة',
      error: error.message
    });
  }
});

// حفظ نتيجة المهام
router.post('/tasks', authenticateToken, async (req, res) => {
  try {
    const { userId, taskId, taskTitle, solution, isCorrect, points, feedback, language, difficulty } = req.body;

    console.log('📝 حفظ نتيجة المهمة:', {
      userId,
      taskId,
      isCorrect,
      points
    });

    const taskResult = new TaskResult({
      userId,
      taskId,
      taskTitle,
      solution,
      isCorrect,
      points: isCorrect ? points : 0,
      feedback,
      language,
      difficulty,
      completedAt: new Date()
    });

    await taskResult.save();

    console.log('✅ تم حفظ نتيجة المهمة بنجاح');
    res.json({
      success: true,
      message: 'تم حفظ النتيجة بنجاح',
      data: taskResult
    });

  } catch (error) {
    console.error('❌ خطأ في حفظ نتيجة المهمة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حفظ النتيجة',
      error: error.message
    });
  }
});

// جلب نتائج الأسئلة للمستخدم
router.get('/questions/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;

    const results = await QuestionResult.find({ userId })
      .sort({ completedAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('❌ خطأ في جلب نتائج الأسئلة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب النتائج',
      error: error.message
    });
  }
});

// جلب نتائج المهام للمستخدم
router.get('/tasks/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;

    const results = await TaskResult.find({ userId })
      .sort({ completedAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('❌ خطأ في جلب نتائج المهام:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب النتائج',
      error: error.message
    });
  }
});

// إحصائيات المستخدم
router.get('/stats/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // إحصائيات الأسئلة
    const questionStats = await QuestionResult.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: '$totalQuestions' },
          totalCorrect: { $sum: '$score' },
          averageScore: { $avg: '$percentage' },
          totalAttempts: { $sum: 1 }
        }
      }
    ]);

    // إحصائيات المهام
    const taskStats = await TaskResult.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          completedTasks: { $sum: { $cond: ['$isCorrect', 1, 0] } },
          totalPoints: { $sum: '$points' },
          averagePoints: { $avg: '$points' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        questions: questionStats[0] || {},
        tasks: taskStats[0] || {}
      }
    });

  } catch (error) {
    console.error('❌ خطأ في جلب الإحصائيات:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات',
      error: error.message
    });
  }
});

module.exports = router;
