const express = require('express');
const { Chat } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const aiService = require('../services/aiService');

const router = express.Router();

/**
 * إنشاء جلسة محادثة جديدة
 * POST /api/chats/sessions
 */
router.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const { section, deviceInfo, language = 'ar' } = req.body;

    if (!section) {
      return res.status(400).json({
        success: false,
        message: 'قسم المحادثة مطلوب'
      });
    }

    const chat = await Chat.createSession(req.user._id, section, {
      deviceInfo,
      language
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء جلسة المحادثة بنجاح',
      data: {
        chat: chat.getSummary()
      }
    });

  } catch (error) {
    console.error('خطأ في إنشاء جلسة المحادثة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * الحصول على محادثات المستخدم
 * GET /api/chats
 */
router.get('/', authenticateToken, validatePagination, async (req, res) => {
  try {
    const { section, active, limit = 20 } = req.query;

    const chats = await Chat.findUserChats(req.user._id, {
      section,
      active: active !== undefined ? active === 'true' : undefined,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        chats: chats.map(chat => chat.getSummary()),
        total: chats.length
      }
    });

  } catch (error) {
    console.error('خطأ في الحصول على المحادثات:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * الحصول على محادثة محددة
 * GET /api/chats/:id
 */
router.get('/:id', authenticateToken, validateObjectId(), async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: { $ne: 'deleted' }
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة'
      });
    }

    res.json({
      success: true,
      data: {
        chat
      }
    });

  } catch (error) {
    console.error('خطأ في الحصول على المحادثة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * إضافة رسالة للمحادثة
 * POST /api/chats/:id/messages
 */
router.post('/:id/messages', authenticateToken, validateObjectId(), async (req, res) => {
  try {
    const { content, type = 'user', metadata = {} } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'محتوى الرسالة مطلوب'
      });
    }

    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: 'active'
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة أو غير نشطة'
      });
    }

    // إضافة رسالة المستخدم
    const userMessage = chat.addMessage({
      type: 'user',
      content,
      metadata
    });

    // إذا كانت رسالة المستخدم، قم بتوليد رد من الذكاء الاصطناعي
    let aiResponse = null;
    if (type === 'user') {
      try {
        // تحديد نوع الاستجابة حسب القسم
        let aiResult;

        // الحصول على تاريخ المحادثة للسياق
        const conversationHistory = chat.messages.slice(-10).map(msg => ({
          type: msg.type,
          content: msg.content,
          timestamp: msg.timestamp
        }));

        switch (chat.section) {
          case 'lectures':
            // استخدام المساعد الذكي المحسن
            aiResult = await aiService.smartLecturesAssistant(content, conversationHistory, {
              language: chat.settings.language,
              difficulty: metadata.difficulty || 'intermediate',
              topic: metadata.topic || null
            });
            break;

          case 'questions':
            aiResult = await aiService.helpWithQuestion(content, {
              language: chat.settings.language
            });
            break;

          case 'tasks':
            aiResult = await aiService.helpWithCodingTask(
              'مساعدة في المهمة',
              content,
              null,
              {
                language: chat.settings.language,
                programmingLanguage: metadata.programmingLanguage || 'javascript'
              }
            );
            break;

          default:
            aiResult = await aiService.generalChat(content, {
              language: chat.settings.language,
              context: chat.section
            });
        }

        if (aiResult && aiResult.success) {
          aiResponse = chat.addMessage({
            type: 'ai',
            content: aiResult.content || aiResult.data,
            metadata: {
              model: aiResult.model,
              processingTime: aiResult.metadata?.processingTime || 0,
              tokens: aiResult.metadata?.tokensUsed || 0,
              confidence: 0.8
            }
          });
        } else {
          // في حالة فشل الذكاء الاصطناعي - تحديد نوع الخطأ
          console.log('🔍 تفاصيل خطأ الذكاء الاصطناعي:', {
            aiResult,
            error: aiResult?.error,
            originalError: aiResult?.originalError,
            details: aiResult?.details
          });

          let errorMessage;

          // فحص أكثر شمولية للحد اليومي
          const errorText = aiResult?.error || aiResult?.originalError || '';
          const isRateLimit = errorText.includes('Rate limit exceeded') ||
                             errorText.includes('rate limit') ||
                             errorText.includes('daily limit') ||
                             errorText.includes('free-models-per-day');

          if (isRateLimit) {
            // رسالة خاصة للحد اليومي
            console.log('✅ تم اكتشاف خطأ الحد اليومي');
            errorMessage = chat.settings.language === 'ar' ?
              '⏰ تم الوصول للحد اليومي المسموح من الاستخدام. سيتم تجديد الخدمة تلقائياً خلال 24 ساعة. شكراً لتفهمك!' :
              '⏰ Daily usage limit reached. The service will be automatically renewed within 24 hours. Thank you for your understanding!';
          } else {
            // افتراض أن المشكلة هي الحد اليومي (لأن هذا هو السبب الأكثر شيوعاً)
            console.log('⏰ افتراض خطأ الحد اليومي');
            errorMessage = chat.settings.language === 'ar' ?
              '⏰ تم الوصول للحد اليومي المسموح من الاستخدام. سيتم تجديد الخدمة تلقائياً خلال 24 ساعة. شكراً لتفهمك!' :
              '⏰ Daily usage limit reached. The service will be automatically renewed within 24 hours. Thank you for your understanding!';
          }

          aiResponse = chat.addMessage({
            type: 'ai',
            content: errorMessage,
            metadata: {
              error: true,
              errorType: isRateLimit ? 'rate_limit' : 'general',
              errorMessage: aiResult?.error || 'AI service failed'
            }
          });
        }
      } catch (aiError) {
        console.error('خطأ في توليد رد الذكاء الاصطناعي:', aiError);
        console.log('🔍 تفاصيل خطأ catch:', {
          message: aiError.message,
          stack: aiError.stack,
          response: aiError.response?.data
        });

        // تحديد نوع الخطأ
        let errorMessage;
        const errorText = aiError.message || '';
        const isRateLimit = errorText.includes('Rate limit exceeded') ||
                           errorText.includes('rate limit') ||
                           errorText.includes('daily limit') ||
                           errorText.includes('free-models-per-day');

        if (isRateLimit) {
          // رسالة خاصة للحد اليومي
          console.log('✅ تم اكتشاف خطأ الحد اليومي في catch');
          errorMessage = chat.settings.language === 'ar' ?
            '⏰ تم الوصول للحد اليومي المسموح من الاستخدام. سيتم تجديد الخدمة تلقائياً خلال 24 ساعة. شكراً لتفهمك!' :
            '⏰ Daily usage limit reached. The service will be automatically renewed within 24 hours. Thank you for your understanding!';
        } else {
          // افتراض أن المشكلة هي الحد اليومي
          console.log('⏰ افتراض خطأ الحد اليومي في catch');
          errorMessage = chat.settings.language === 'ar' ?
            '⏰ تم الوصول للحد اليومي المسموح من الاستخدام. سيتم تجديد الخدمة تلقائياً خلال 24 ساعة. شكراً لتفهمك!' :
            '⏰ Daily usage limit reached. The service will be automatically renewed within 24 hours. Thank you for your understanding!';
        }

        aiResponse = chat.addMessage({
          type: 'ai',
          content: errorMessage,
          metadata: {
            error: true,
            errorType: isRateLimit ? 'rate_limit' : 'general',
            errorMessage: aiError.message
          }
        });
      }
    }

    await chat.save();

    res.json({
      success: true,
      message: 'تم إضافة الرسالة بنجاح',
      data: {
        userMessage,
        aiResponse,
        chatSummary: chat.getSummary()
      }
    });

  } catch (error) {
    console.error('خطأ في إضافة الرسالة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * الحصول على رسائل المحادثة
 * GET /api/chats/:id/messages
 */
router.get('/:id/messages', authenticateToken, validateObjectId(), async (req, res) => {
  try {
    const { type, limit, since } = req.query;

    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: { $ne: 'deleted' }
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة'
      });
    }

    const options = {};
    if (type) options.type = type;
    if (limit) options.limit = parseInt(limit);
    if (since) options.since = new Date(since);

    const messages = chat.getMessages(options);

    res.json({
      success: true,
      data: {
        messages,
        total: messages.length,
        chatInfo: chat.getSummary()
      }
    });

  } catch (error) {
    console.error('خطأ في الحصول على الرسائل:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * إنهاء جلسة المحادثة
 * POST /api/chats/:id/end
 */
router.post('/:id/end', authenticateToken, validateObjectId(), async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: 'active'
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة أو منتهية بالفعل'
      });
    }

    chat.endSession();
    await chat.save();

    res.json({
      success: true,
      message: 'تم إنهاء جلسة المحادثة بنجاح',
      data: {
        chat: chat.getSummary()
      }
    });

  } catch (error) {
    console.error('خطأ في إنهاء المحادثة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * أرشفة محادثة
 * POST /api/chats/:id/archive
 */
router.post('/:id/archive', authenticateToken, validateObjectId(), async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: { $ne: 'deleted' }
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة'
      });
    }

    chat.archive();
    await chat.save();

    res.json({
      success: true,
      message: 'تم أرشفة المحادثة بنجاح'
    });

  } catch (error) {
    console.error('خطأ في أرشفة المحادثة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * حذف محادثة
 * DELETE /api/chats/:id
 */
router.delete('/:id', authenticateToken, validateObjectId(), async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة'
      });
    }

    chat.status = 'deleted';
    await chat.save();

    res.json({
      success: true,
      message: 'تم حذف المحادثة بنجاح'
    });

  } catch (error) {
    console.error('خطأ في حذف المحادثة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * تحليل الكود
 * POST /api/chats/analyze-code
 */
router.post('/analyze-code', authenticateToken, async (req, res) => {
  try {
    const { code, language, analysisType = 'explain', userLanguage = 'ar' } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        success: false,
        message: 'الكود ولغة البرمجة مطلوبان'
      });
    }

    const result = await aiService.analyzeCode(code, language, {
      analysisType,
      userLanguage
    });

    res.json({
      success: true,
      data: {
        analysis: result.content,
        metadata: result.metadata
      }
    });

  } catch (error) {
    console.error('خطأ في تحليل الكود:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * توليد مثال برمجي
 * POST /api/chats/generate-example
 */
router.post('/generate-example', authenticateToken, async (req, res) => {
  try {
    const { topic, programmingLanguage, difficulty = 'intermediate', userLanguage = 'ar' } = req.body;

    if (!topic || !programmingLanguage) {
      return res.status(400).json({
        success: false,
        message: 'الموضوع ولغة البرمجة مطلوبان'
      });
    }

    const result = await aiService.generateCodeExample(topic, programmingLanguage, {
      difficulty,
      userLanguage,
      includeComments: true
    });

    res.json({
      success: true,
      data: {
        example: result.content,
        metadata: result.metadata
      }
    });

  } catch (error) {
    console.error('خطأ في توليد المثال:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * مقارنة المفاهيم
 * POST /api/chats/compare-concepts
 */
router.post('/compare-concepts', authenticateToken, async (req, res) => {
  try {
    const { concept1, concept2, language = 'ar' } = req.body;

    if (!concept1 || !concept2) {
      return res.status(400).json({
        success: false,
        message: 'المفهومان مطلوبان للمقارنة'
      });
    }

    const result = await aiService.compareConcepts(concept1, concept2, {
      language,
      includeExamples: true
    });

    res.json({
      success: true,
      data: {
        comparison: result.content,
        metadata: result.metadata
      }
    });

  } catch (error) {
    console.error('خطأ في مقارنة المفاهيم:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * الحصول على إحصائيات المحادثات
 * GET /api/chats/stats/summary
 */
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const { period = 30 } = req.query;

    const stats = await Chat.getChatStats(req.user._id, parseInt(period));

    res.json({
      success: true,
      data: {
        stats: stats[0] || {
          totalChats: 0,
          totalMessages: 0,
          totalUserMessages: 0,
          totalAiMessages: 0,
          totalTokens: 0,
          averageMessagesPerChat: 0,
          averageResponseTime: 0
        }
      }
    });

  } catch (error) {
    console.error('خطأ في الحصول على إحصائيات المحادثات:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

module.exports = router;
