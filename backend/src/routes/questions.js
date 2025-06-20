const express = require('express');
const { Question, Lecture } = require('../models');
const { authenticateToken, checkOwnership } = require('../middleware/auth');
const { validateQuestionCreation, validateQuestionAnswer, validateObjectId, validatePagination } = require('../middleware/validation');
const aiService = require('../services/aiService');

const router = express.Router();

/**
 * توليد أسئلة من محاضرة
 * POST /api/questions/generate
 */
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { lectureId, questionCount = 5, difficulty = 'medium', questionTypes = ['multiple_choice', 'true_false'] } = req.body;

    if (!lectureId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المحاضرة مطلوب'
      });
    }

    // التحقق من وجود المحاضرة وملكيتها
    const lecture = await Lecture.findOne({ _id: lectureId, userId: req.user._id });
    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'المحاضرة غير موجودة'
      });
    }

    if (!lecture.isProcessed) {
      return res.status(400).json({
        success: false,
        message: 'المحاضرة لم تتم معالجتها بعد'
      });
    }

    // توليد الأسئلة باستخدام الذكاء الاصطناعي
    const questionsResult = await aiService.generateQuestions(lecture.content, {
      questionCount: Math.min(questionCount, 10), // الحد الأقصى 10 أسئلة
      difficulty,
      questionTypes,
      language: req.user.preferences.language || 'ar'
    });

    if (!questionsResult.success) {
      return res.status(500).json({
        success: false,
        message: 'فشل في توليد الأسئلة',
        error: questionsResult.error
      });
    }

    let generatedQuestions;
    try {
      const parsedResult = JSON.parse(questionsResult.content);
      generatedQuestions = parsedResult.questions || [];
    } catch (parseError) {
      return res.status(500).json({
        success: false,
        message: 'خطأ في تحليل الأسئلة المولدة'
      });
    }

    // حفظ الأسئلة في قاعدة البيانات
    const savedQuestions = [];
    for (const questionData of generatedQuestions) {
      try {
        const question = new Question({
          userId: req.user._id,
          lectureId: lecture._id,
          questionText: questionData.questionText,
          questionType: questionData.questionType,
          options: questionData.options || [],
          correctAnswer: questionData.correctAnswer,
          explanation: questionData.explanation,
          difficulty: questionData.difficulty || difficulty,
          topic: questionData.topic,
          keywords: questionData.keywords || [],
          generationSource: 'ai',
          aiMetadata: {
            model: questionsResult.model,
            confidence: 0.8,
            processingTime: questionsResult.metadata.processingTime
          }
        });

        await question.save();
        savedQuestions.push(question.getStats());
      } catch (saveError) {
        console.error('خطأ في حفظ السؤال:', saveError);
      }
    }

    res.status(201).json({
      success: true,
      message: `تم توليد ${savedQuestions.length} سؤال بنجاح`,
      data: {
        questions: savedQuestions,
        lecture: lecture.getSummary()
      }
    });

  } catch (error) {
    console.error('خطأ في توليد الأسئلة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * الحصول على قائمة الأسئلة
 * GET /api/questions
 */
router.get('/', authenticateToken, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { lectureId, difficulty, questionType, answered } = req.query;

    // بناء الاستعلام
    let query = { userId: req.user._id };

    if (lectureId) {
      query.lectureId = lectureId;
    }

    if (difficulty) {
      query.difficulty = difficulty;
    }

    if (questionType) {
      query.questionType = questionType;
    }

    if (answered !== undefined) {
      query.isAnswered = answered === 'true';
    }

    // الحصول على الأسئلة
    const questions = await Question.find(query)
      .populate('lectureId', 'title')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    // عدد الأسئلة الإجمالي
    const total = await Question.countDocuments(query);

    res.json({
      success: true,
      data: {
        questions: questions.map(q => ({
          ...q.getStats(),
          lecture: q.lectureId
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('خطأ في الحصول على الأسئلة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * الحصول على سؤال محدد
 * GET /api/questions/:id
 */
router.get('/:id', authenticateToken, validateObjectId(), checkOwnership(Question), async (req, res) => {
  try {
    const question = req.resource;

    res.json({
      success: true,
      data: {
        question
      }
    });

  } catch (error) {
    console.error('خطأ في الحصول على السؤال:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * الإجابة على سؤال
 * POST /api/questions/:id/answer
 */
router.post('/:id/answer', authenticateToken, validateObjectId(), validateQuestionAnswer, checkOwnership(Question), async (req, res) => {
  try {
    const question = req.resource;
    const { userAnswer, timeSpent = 0 } = req.body;

    // التحقق من عدم الإجابة مسبقاً
    if (question.isAnswered) {
      return res.status(400).json({
        success: false,
        message: 'تم الإجابة على هذا السؤال مسبقاً'
      });
    }

    // الإجابة على السؤال
    const isCorrect = question.answerQuestion(userAnswer, timeSpent);
    await question.save();

    // حساب النقاط المكتسبة
    let pointsEarned = 0;
    if (isCorrect) {
      pointsEarned = question.points;
      req.user.addPoints(pointsEarned);
      await req.user.save();
    }

    res.json({
      success: true,
      message: isCorrect ? 'إجابة صحيحة!' : 'إجابة خاطئة',
      data: {
        isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        pointsEarned,
        totalPoints: req.user.stats.totalPoints,
        question: question.getStats()
      }
    });

  } catch (error) {
    console.error('خطأ في الإجابة على السؤال:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * تقييم سؤال
 * POST /api/questions/:id/rate
 */
router.post('/:id/rate', authenticateToken, validateObjectId(), checkOwnership(Question), async (req, res) => {
  try {
    const question = req.resource;
    const { difficulty, quality, feedback } = req.body;

    if (!difficulty || !quality) {
      return res.status(400).json({
        success: false,
        message: 'تقييم الصعوبة والجودة مطلوبان'
      });
    }

    if (difficulty < 1 || difficulty > 5 || quality < 1 || quality > 5) {
      return res.status(400).json({
        success: false,
        message: 'التقييم يجب أن يكون بين 1 و 5'
      });
    }

    // إضافة التقييم
    question.rateQuestion(difficulty, quality, feedback);
    await question.save();

    res.json({
      success: true,
      message: 'تم تقييم السؤال بنجاح'
    });

  } catch (error) {
    console.error('خطأ في تقييم السؤال:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * حذف سؤال
 * DELETE /api/questions/:id
 */
router.delete('/:id', authenticateToken, validateObjectId(), checkOwnership(Question), async (req, res) => {
  try {
    const question = req.resource;

    await Question.findByIdAndDelete(question._id);

    res.json({
      success: true,
      message: 'تم حذف السؤال بنجاح'
    });

  } catch (error) {
    console.error('خطأ في حذف السؤال:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * إحصائيات الأسئلة
 * GET /api/questions/stats/summary
 */
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // إحصائيات عامة
    const totalQuestions = await Question.countDocuments({ userId });
    const answeredQuestions = await Question.countDocuments({ userId, isAnswered: true });
    const correctAnswers = await Question.countDocuments({ userId, isCorrect: true });

    // إحصائيات حسب الصعوبة
    const difficultyStats = await Question.aggregate([
      { $match: { userId } },
      { $group: { _id: '$difficulty', count: { $sum: 1 } } }
    ]);

    // إحصائيات حسب النوع
    const typeStats = await Question.aggregate([
      { $match: { userId } },
      { $group: { _id: '$questionType', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalQuestions,
          answeredQuestions,
          correctAnswers,
          successRate: answeredQuestions > 0 ? (correctAnswers / answeredQuestions) * 100 : 0
        },
        difficultyStats,
        typeStats
      }
    });

  } catch (error) {
    console.error('خطأ في الحصول على إحصائيات الأسئلة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * توليد أسئلة من محتوى نصي مباشر
 * POST /api/questions/generate-from-content
 */
router.post('/generate-from-content', async (req, res) => {
  try {
    const { content, questionCount = 5, difficulty = 'medium', language = 'ar' } = req.body;

    if (!content || content.trim().length < 100) {
      return res.status(400).json({
        success: false,
        message: 'المحتوى قصير جداً. يجب أن يحتوي على 100 حرف على الأقل'
      });
    }

    console.log('🤖 توليد أسئلة من المحتوى المباشر...');
    console.log('📊 المعاملات:', {
      contentLength: content.length,
      questionCount,
      difficulty,
      language
    });

    // تحليل المحتوى أولاً للحصول على فهم أعمق
    console.log('🔍 تحليل المحتوى للحصول على فهم أعمق...');
    let analysisData = {};

    try {
      const analysisResult = await aiService.analyzeLectureContent(content, {}, {
        language,
        maxKeywords: 15
      });

      if (analysisResult.success) {
        try {
          analysisData = JSON.parse(analysisResult.data || analysisResult.content);
          console.log('✅ تم تحليل المحتوى بنجاح:', {
            mainTopic: analysisData.classification?.mainTopic,
            academicField: analysisData.classification?.academicField,
            keywordsCount: analysisData.keywords?.length
          });
        } catch (parseError) {
          console.warn('⚠️ فشل في تحليل JSON للتحليل، سيتم المتابعة بدون تحليل متقدم');
        }
      }
    } catch (analysisError) {
      console.warn('⚠️ فشل في تحليل المحتوى، سيتم المتابعة بدون تحليل متقدم:', analysisError.message);
    }

    // كشف لغة المحتوى لتوليد أسئلة بنفس اللغة
    const detectedLanguage = aiService.detectContentLanguage(content);
    const contentLanguage = detectedLanguage === 'en' ? 'en' : detectedLanguage === 'mixed' ? 'mixed' : 'ar';

    console.log('🌐 لغة المحتوى المكتشفة:', detectedLanguage, '- سيتم توليد أسئلة بلغة:', contentLanguage);

    // توليد الأسئلة الذكية باستخدام الذكاء الاصطناعي المتقدم
    console.log('🧠 توليد أسئلة ذكية ومتقدمة بلغة المحتوى...');
    const questionsResult = await aiService.generateIntelligentQuestions(content, analysisData, {
      questionCount: Math.min(questionCount, 10), // الحد الأقصى 10 أسئلة
      difficulty,
      questionTypes: ['multiple_choice'],
      language: contentLanguage // استخدام لغة المحتوى
    });

    if (!questionsResult.success) {
      console.error('❌ فشل في توليد الأسئلة:', questionsResult.error);
      return res.status(500).json({
        success: false,
        message: 'فشل في توليد الأسئلة',
        error: questionsResult.error
      });
    }

    let generatedQuestions;
    let questionMetadata = {};

    try {
      const parsedResult = JSON.parse(questionsResult.data || questionsResult.content);
      generatedQuestions = parsedResult.questions || parsedResult || [];
      questionMetadata = parsedResult.metadata || {};

      console.log('📊 معلومات الأسئلة المولدة:', {
        questionsCount: generatedQuestions.length,
        contentDomain: questionMetadata.contentDomain,
        cognitiveDistribution: questionMetadata.cognitiveDistribution
      });

    } catch (parseError) {
      console.error('❌ خطأ في تحليل الأسئلة المولدة:', parseError);
      console.log('📄 النص الذي فشل في التحليل:', (questionsResult.data || questionsResult.content)?.substring(0, 500));

      return res.status(500).json({
        success: false,
        message: 'خطأ في تحليل الأسئلة المولدة',
        error: parseError.message
      });
    }

    if (!Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'لم يتم توليد أي أسئلة صالحة'
      });
    }

    console.log('✅ تم توليد الأسئلة الذكية بنجاح:', generatedQuestions.length, 'سؤال');

    // إضافة معلومات إضافية لكل سؤال
    const enhancedQuestions = generatedQuestions.map((q, index) => ({
      ...q,
      id: `intelligent_q_${Date.now()}_${index}`,
      generatedAt: new Date().toISOString(),
      sourceAnalysis: analysisData.classification ? {
        mainTopic: analysisData.classification.mainTopic,
        academicField: analysisData.classification.academicField,
        difficulty: analysisData.classification.difficulty
      } : null
    }));

    res.json({
      success: true,
      message: 'تم توليد الأسئلة الذكية بنجاح',
      data: enhancedQuestions,
      metadata: {
        questionCount: enhancedQuestions.length,
        difficulty,
        language,
        contentLength: content.length,
        contentDomain: questionMetadata.contentDomain || 'general',
        cognitiveDistribution: questionMetadata.cognitiveDistribution || {},
        analysisData: analysisData.classification ? {
          mainTopic: analysisData.classification.mainTopic,
          academicField: analysisData.classification.academicField,
          keywordsCount: analysisData.keywords?.length || 0
        } : null,
        generationType: 'intelligent_ai_generated',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('💥 خطأ في توليد الأسئلة من المحتوى:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      error: error.message
    });
  }
});

module.exports = router;
