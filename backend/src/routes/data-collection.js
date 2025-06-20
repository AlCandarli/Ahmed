const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Session = require('../models/Session');
const Question = require('../models/Question');
const Task = require('../models/Task');
const Report = require('../models/Report');
const Chat = require('../models/Chat');

/**
 * حفظ محادثة من قسم المحاضرات
 */
router.post('/lecture-chat', async (req, res) => {
  try {
    const { userId, message, response, sessionId, metadata } = req.body;

    const chat = new Chat({
      userId,
      section: 'lectures',
      message,
      response,
      sessionId,
      metadata: {
        ...metadata,
        timestamp: new Date(),
        userAgent: req.headers['user-agent']
      }
    });

    await chat.save();

    // تحديث إحصائيات المستخدم
    await User.findByIdAndUpdate(userId, {
      $inc: { 'stats.totalSessions': 1 },
      lastActive: new Date()
    });

    res.json({
      success: true,
      message: 'تم حفظ المحادثة بنجاح',
      chatId: chat._id
    });

  } catch (error) {
    console.error('خطأ في حفظ محادثة المحاضرة:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في حفظ المحادثة',
      error: error.message
    });
  }
});

/**
 * حفظ نتيجة اختبار من قسم الأسئلة
 */
router.post('/question-result', async (req, res) => {
  try {
    const { 
      userId, 
      questions, 
      totalScore, 
      correctAnswers, 
      totalQuestions,
      timeSpent,
      difficulty,
      category,
      sessionId 
    } = req.body;

    // حفظ كل سؤال منفرد
    const savedQuestions = [];
    for (const q of questions) {
      const question = new Question({
        userId,
        title: q.title,
        content: q.content,
        options: q.options,
        correctAnswer: q.correctAnswer,
        userAnswer: q.userAnswer,
        answered: true,
        score: q.score,
        difficulty: difficulty || 'medium',
        category: category || 'general',
        timeSpent: q.timeSpent || 0,
        attempts: 1
      });

      const saved = await question.save();
      savedQuestions.push(saved._id);
    }

    // تحديث إحصائيات المستخدم
    const user = await User.findById(userId);
    if (user) {
      const newAverageScore = Math.round(
        ((user.stats.averageScore * user.stats.generatedQuestions) + totalScore) / 
        (user.stats.generatedQuestions + 1)
      );

      await User.findByIdAndUpdate(userId, {
        $inc: { 
          'stats.generatedQuestions': totalQuestions,
          'stats.totalSessions': 1
        },
        $set: {
          'stats.averageScore': newAverageScore,
          lastActive: new Date()
        }
      });
    }

    // تسجيل الجلسة
    await Session.create({
      userId,
      section: 'questions',
      duration: Math.round(timeSpent / 60), // تحويل إلى دقائق
      activities: [{
        type: 'quiz_completed',
        action: 'completed_quiz',
        timestamp: new Date(),
        data: {
          totalQuestions,
          correctAnswers,
          totalScore,
          difficulty,
          category
        }
      }],
      metadata: {
        questionIds: savedQuestions,
        totalScore,
        correctAnswers,
        totalQuestions
      }
    });

    res.json({
      success: true,
      message: 'تم حفظ نتيجة الاختبار بنجاح',
      data: {
        totalScore,
        correctAnswers,
        totalQuestions,
        questionIds: savedQuestions
      }
    });

  } catch (error) {
    console.error('خطأ في حفظ نتيجة الاختبار:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في حفظ نتيجة الاختبار',
      error: error.message
    });
  }
});

/**
 * حفظ نقاط وإنجاز مهمة من قسم المهام
 */
router.post('/task-completion', async (req, res) => {
  try {
    const {
      userId,
      taskTitle,
      taskDescription,
      category,
      language,
      difficulty,
      solution,
      points,
      score,
      timeSpent,
      feedback,
      sessionId
    } = req.body;

    // حفظ المهمة
    const task = new Task({
      userId,
      title: taskTitle,
      description: taskDescription,
      category,
      language,
      difficulty,
      points,
      completed: true,
      solution,
      feedback,
      score,
      timeSpent: Math.round(timeSpent / 60), // تحويل إلى دقائق
      attempts: 1,
      lastAttempt: new Date()
    });

    await task.save();

    // تحديث إحصائيات المستخدم
    await User.findByIdAndUpdate(userId, {
      $inc: { 
        'stats.completedTasks': 1,
        'stats.totalPoints': points,
        'stats.totalSessions': 1
      },
      lastActive: new Date()
    });

    // تسجيل الجلسة
    await Session.create({
      userId,
      section: 'tasks',
      duration: Math.round(timeSpent / 60),
      activities: [{
        type: 'task_completed',
        action: 'completed_task',
        timestamp: new Date(),
        data: {
          taskTitle,
          category,
          language,
          difficulty,
          points,
          score
        }
      }],
      metadata: {
        taskId: task._id,
        points,
        score,
        difficulty,
        category,
        language
      }
    });

    res.json({
      success: true,
      message: 'تم حفظ إنجاز المهمة بنجاح',
      data: {
        taskId: task._id,
        points,
        score,
        totalPoints: (await User.findById(userId)).stats.totalPoints
      }
    });

  } catch (error) {
    console.error('خطأ في حفظ إنجاز المهمة:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في حفظ إنجاز المهمة',
      error: error.message
    });
  }
});

/**
 * حفظ تقرير مُنشأ من قسم التقارير
 */
router.post('/report-generation', async (req, res) => {
  try {
    const {
      userId,
      title,
      content,
      template,
      style,
      pageCount,
      language,
      generationTime,
      aiModel,
      sessionId
    } = req.body;

    // حساب عدد الكلمات والأقسام
    const wordCount = content.split(/\s+/).length;
    const sections = content.split(/\n\s*\n/).length;
    const readingTime = Math.round(wordCount / 200); // متوسط 200 كلمة في الدقيقة

    // حفظ التقرير
    const report = new Report({
      userId,
      title,
      content,
      template,
      style,
      pageCount,
      wordCount,
      readingTime,
      sections,
      language,
      generationTime: Math.round(generationTime / 1000), // تحويل إلى ثوان
      aiModel
    });

    await report.save();

    // تحديث إحصائيات المستخدم
    await User.findByIdAndUpdate(userId, {
      $inc: { 
        'stats.generatedReports': 1,
        'stats.totalSessions': 1
      },
      lastActive: new Date()
    });

    // تسجيل الجلسة
    await Session.create({
      userId,
      section: 'reports',
      duration: Math.round(generationTime / 60000), // تحويل إلى دقائق
      activities: [{
        type: 'report_generated',
        action: 'generated_report',
        timestamp: new Date(),
        data: {
          title,
          template,
          style,
          pageCount,
          wordCount,
          language
        }
      }],
      metadata: {
        reportId: report._id,
        wordCount,
        pageCount,
        template,
        style,
        language,
        aiModel
      }
    });

    res.json({
      success: true,
      message: 'تم حفظ التقرير بنجاح',
      data: {
        reportId: report._id,
        wordCount,
        readingTime,
        sections
      }
    });

  } catch (error) {
    console.error('خطأ في حفظ التقرير:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في حفظ التقرير',
      error: error.message
    });
  }
});

/**
 * تحديث وقت الدراسة للمستخدم
 */
router.post('/update-study-time', async (req, res) => {
  try {
    const { userId, section, duration } = req.body;

    await User.findByIdAndUpdate(userId, {
      $inc: { 'stats.totalStudyTime': Math.round(duration / 60) }, // تحويل إلى دقائق
      lastActive: new Date()
    });

    res.json({
      success: true,
      message: 'تم تحديث وقت الدراسة'
    });

  } catch (error) {
    console.error('خطأ في تحديث وقت الدراسة:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث وقت الدراسة',
      error: error.message
    });
  }
});

module.exports = router;
