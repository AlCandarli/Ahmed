const express = require('express');
const { Task } = require('../models');
const { authenticateToken, authorize, optionalAuth } = require('../middleware/auth');
const { validateTaskCreation, validateTaskSubmission, validateObjectId, validatePagination } = require('../middleware/validation');
const aiService = require('../services/aiService');

const router = express.Router();

/**
 * الحصول على قائمة المهام
 * GET /api/tasks
 */
router.get('/', optionalAuth, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { category, language, difficulty, search } = req.query;

    // بناء الاستعلام
    let query = { isActive: true, isPublic: true };

    if (category) {
      query.category = category;
    }

    if (language) {
      query.language = language;
    }

    if (difficulty) {
      query.difficulty = difficulty;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // الحصول على المهام
    const tasks = await Task.find(query)
      .select('-solution -submissions') // استبعاد الحل والمحاولات
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    // عدد المهام الإجمالي
    const total = await Task.countDocuments(query);

    // إضافة معلومات المستخدم إذا كان مسجل دخول
    const tasksWithUserInfo = tasks.map(task => {
      const taskData = task.getTaskStats();
      
      if (req.user) {
        const userSubmission = task.getBestSubmission(req.user._id);
        taskData.userSubmission = userSubmission ? {
          result: userSubmission.result,
          score: userSubmission.score,
          submittedAt: userSubmission.submittedAt
        } : null;
      }
      
      return taskData;
    });

    res.json({
      success: true,
      data: {
        tasks: tasksWithUserInfo,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('خطأ في الحصول على المهام:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * الحصول على مهمة محددة
 * GET /api/tasks/:id
 */
router.get('/:id', optionalAuth, validateObjectId(), async (req, res) => {
  try {
    const task = await Task.findOne({ 
      _id: req.params.id, 
      isActive: true, 
      isPublic: true 
    }).select('-solution');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'المهمة غير موجودة'
      });
    }

    const taskData = {
      ...task.toObject(),
      testCases: task.testCases.map(tc => ({
        input: tc.input,
        description: tc.description,
        // إخفاء المخرجات المتوقعة
        expectedOutput: tc.isHidden ? undefined : tc.expectedOutput
      }))
    };

    // إضافة معلومات المستخدم إذا كان مسجل دخول
    if (req.user) {
      const userSubmission = task.getBestSubmission(req.user._id);
      taskData.userSubmission = userSubmission;
    }

    res.json({
      success: true,
      data: {
        task: taskData
      }
    });

  } catch (error) {
    console.error('خطأ في الحصول على المهمة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * إرسال حل للمهمة
 * POST /api/tasks/:id/submit
 */
router.post('/:id/submit', authenticateToken, validateObjectId(), validateTaskSubmission, async (req, res) => {
  try {
    const { code } = req.body;
    
    const task = await Task.findOne({ 
      _id: req.params.id, 
      isActive: true, 
      isPublic: true 
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'المهمة غير موجودة'
      });
    }

    // محاكاة تشغيل الكود (في التطبيق الحقيقي، يجب استخدام sandbox آمن)
    const testResults = await executeCode(code, task.testCases, task.language);
    
    // حساب النتيجة
    const passedTests = testResults.filter(result => result.passed).length;
    const totalTests = testResults.length;
    const score = Math.round((passedTests / totalTests) * 100);
    const result = passedTests === totalTests ? 'passed' : 'failed';

    // حساب النقاط المكتسبة
    let pointsEarned = 0;
    if (result === 'passed') {
      pointsEarned = task.points;
      req.user.addPoints(pointsEarned);
      req.user.updateStats('completedTasks', 1);
      await req.user.save();
    }

    // إضافة المحاولة
    const submission = task.addSubmission(
      req.user._id,
      code,
      result,
      score,
      Date.now(), // وقت التنفيذ (محاكاة)
      testResults
    );

    await task.save();

    res.json({
      success: true,
      message: result === 'passed' ? 'تم حل المهمة بنجاح!' : 'المهمة لم تمر جميع الاختبارات',
      data: {
        result,
        score,
        passedTests,
        totalTests,
        pointsEarned,
        testResults: testResults.map(tr => ({
          passed: tr.passed,
          error: tr.error,
          // إخفاء المخرجات الفعلية للاختبارات المخفية
          actualOutput: tr.isHidden ? undefined : tr.actualOutput
        })),
        submission: {
          id: submission._id,
          submittedAt: submission.submittedAt,
          result: submission.result,
          score: submission.score
        }
      }
    });

  } catch (error) {
    console.error('خطأ في إرسال الحل:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * طلب مساعدة في المهمة
 * POST /api/tasks/:id/help
 */
router.post('/:id/help', authenticateToken, validateObjectId(), async (req, res) => {
  try {
    const { code, error } = req.body;
    
    const task = await Task.findOne({ 
      _id: req.params.id, 
      isActive: true, 
      isPublic: true 
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'المهمة غير موجودة'
      });
    }

    // طلب المساعدة من الذكاء الاصطناعي
    const helpResult = await aiService.helpWithCodingTask(
      task.description,
      code || task.starterCode,
      error,
      {
        language: req.user.preferences.language || 'ar',
        programmingLanguage: task.language
      }
    );

    if (!helpResult.success) {
      return res.status(500).json({
        success: false,
        message: 'فشل في الحصول على المساعدة'
      });
    }

    let helpData;
    try {
      helpData = JSON.parse(helpResult.content);
    } catch (parseError) {
      return res.status(500).json({
        success: false,
        message: 'خطأ في تحليل المساعدة'
      });
    }

    res.json({
      success: true,
      data: {
        help: helpData
      }
    });

  } catch (error) {
    console.error('خطأ في طلب المساعدة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * تقييم مهمة
 * POST /api/tasks/:id/rate
 */
router.post('/:id/rate', authenticateToken, validateObjectId(), async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'التقييم يجب أن يكون بين 1 و 5'
      });
    }

    const task = await Task.findOne({ 
      _id: req.params.id, 
      isActive: true, 
      isPublic: true 
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'المهمة غير موجودة'
      });
    }

    // إضافة التقييم
    task.addRating(req.user._id, rating, feedback);
    await task.save();

    res.json({
      success: true,
      message: 'تم تقييم المهمة بنجاح'
    });

  } catch (error) {
    console.error('خطأ في تقييم المهمة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * إنشاء مهمة جديدة (للمديرين فقط)
 * POST /api/tasks
 */
router.post('/', authenticateToken, authorize('admin'), validateTaskCreation, async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      createdBy: req.user._id
    };

    const task = new Task(taskData);
    await task.save();

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المهمة بنجاح',
      data: {
        task: task.getTaskStats()
      }
    });

  } catch (error) {
    console.error('خطأ في إنشاء المهمة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * دالة محاكاة تشغيل الكود
 * في التطبيق الحقيقي، يجب استخدام sandbox آمن
 */
async function executeCode(code, testCases, language) {
  const results = [];
  
  for (const testCase of testCases) {
    try {
      // محاكاة تشغيل الكود
      // في التطبيق الحقيقي، يجب استخدام Docker أو sandbox آمن
      
      let passed = false;
      let actualOutput = '';
      let error = null;

      // محاكاة بسيطة للتحقق من الكود
      if (language === 'javascript') {
        // محاكاة تشغيل JavaScript
        if (code.includes('function') && code.includes('return')) {
          passed = Math.random() > 0.3; // محاكاة نجاح 70%
          actualOutput = passed ? testCase.expectedOutput : 'خطأ في النتيجة';
        } else {
          error = 'الكود يجب أن يحتوي على دالة';
        }
      } else {
        // محاكاة للغات أخرى
        passed = Math.random() > 0.4; // محاكاة نجاح 60%
        actualOutput = passed ? testCase.expectedOutput : 'خطأ في النتيجة';
      }

      results.push({
        testCaseIndex: testCases.indexOf(testCase),
        passed,
        actualOutput,
        error,
        isHidden: testCase.isHidden
      });

    } catch (execError) {
      results.push({
        testCaseIndex: testCases.indexOf(testCase),
        passed: false,
        actualOutput: '',
        error: execError.message,
        isHidden: testCase.isHidden
      });
    }
  }

  return results;
}

module.exports = router;
