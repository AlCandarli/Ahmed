const express = require('express');
const router = express.Router();
const LectureChat = require('../models/LectureChat');
const { authenticateToken } = require('../middleware/auth');

// حفظ محادثة جديدة أو تحديث موجودة
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { sessionId, messages, topic, subject } = req.body;
    const userId = req.user._id;

    console.log('💬 حفظ محادثة المحاضرة:', { userId, sessionId, messageCount: messages?.length });

    if (!sessionId || !messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        message: 'معرف الجلسة والرسائل مطلوبة'
      });
    }

    // البحث عن محادثة موجودة أو إنشاء جديدة
    let chat = await LectureChat.findOne({ userId, sessionId });

    if (chat) {
      // تحديث المحادثة الموجودة
      chat.messages = messages;
      if (topic) chat.topic = topic;
      if (subject) chat.subject = subject;
      chat.lastActivity = new Date();
    } else {
      // إنشاء محادثة جديدة
      chat = new LectureChat({
        userId,
        sessionId,
        messages,
        topic: topic || '',
        subject: subject || ''
      });
    }

    await chat.save();

    console.log('✅ تم حفظ محادثة المحاضرة بنجاح');

    res.json({
      success: true,
      message: 'تم حفظ المحادثة بنجاح',
      data: {
        chatId: chat._id,
        messageCount: chat.messageCount,
        duration: chat.duration,
        complexity: chat.complexity
      }
    });

  } catch (error) {
    console.error('❌ خطأ في حفظ محادثة المحاضرة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حفظ المحادثة',
      error: error.message
    });
  }
});

// جلب محادثات المستخدم
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, subject, complexity } = req.query;

    console.log('📖 جلب محادثات المستخدم:', { userId, page, limit });

    const query = { userId };
    if (subject) query.subject = subject;
    if (complexity) query.complexity = complexity;

    const chats = await LectureChat.find(query)
      .sort({ lastActivity: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('sessionId topic subject messageCount duration complexity lastActivity createdAt');

    const total = await LectureChat.countDocuments(query);

    res.json({
      success: true,
      data: {
        chats,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: chats.length,
          totalRecords: total
        }
      }
    });

  } catch (error) {
    console.error('❌ خطأ في جلب محادثات المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المحادثات',
      error: error.message
    });
  }
});

// جلب محادثة محددة
router.get('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    console.log('📖 جلب محادثة محددة:', { userId, sessionId });

    const chat = await LectureChat.findOne({ userId, sessionId });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة'
      });
    }

    res.json({
      success: true,
      data: chat
    });

  } catch (error) {
    console.error('❌ خطأ في جلب المحادثة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المحادثة',
      error: error.message
    });
  }
});

// حذف محادثة
router.delete('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    console.log('🗑️ حذف محادثة:', { userId, sessionId });

    const result = await LectureChat.deleteOne({ userId, sessionId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة'
      });
    }

    console.log('✅ تم حذف المحادثة بنجاح');

    res.json({
      success: true,
      message: 'تم حذف المحادثة بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في حذف المحادثة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف المحادثة',
      error: error.message
    });
  }
});

// إحصائيات محادثات المستخدم
router.get('/stats/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    console.log('📊 جلب إحصائيات محادثات المستخدم:', { userId });

    const stats = await LectureChat.getUserStats(userId);

    // إحصائيات إضافية
    const recentChats = await LectureChat.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('topic subject messageCount duration complexity createdAt');

    const subjectStats = await LectureChat.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
      { $group: { _id: '$subject', count: { $sum: 1 }, avgDuration: { $avg: '$duration' } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        ...stats,
        recentChats,
        subjectStats
      }
    });

  } catch (error) {
    console.error('❌ خطأ في جلب إحصائيات المحادثات:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات',
      error: error.message
    });
  }
});

// تحديث موضوع المحادثة
router.patch('/:sessionId/topic', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { topic, subject } = req.body;
    const userId = req.user._id;

    console.log('✏️ تحديث موضوع المحادثة:', { userId, sessionId, topic });

    const chat = await LectureChat.findOneAndUpdate(
      { userId, sessionId },
      { 
        topic: topic || '',
        subject: subject || '',
        lastActivity: new Date()
      },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة'
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث الموضوع بنجاح',
      data: {
        topic: chat.topic,
        subject: chat.subject
      }
    });

  } catch (error) {
    console.error('❌ خطأ في تحديث موضوع المحادثة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الموضوع',
      error: error.message
    });
  }
});

// تصدير المحادثات
router.get('/export/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { format = 'json' } = req.query;

    console.log('📤 تصدير محادثات المستخدم:', { userId, format });

    const chats = await LectureChat.find({ userId })
      .sort({ createdAt: -1 })
      .select('-__v');

    if (format === 'csv') {
      // تحويل إلى CSV
      const csv = chats.map(chat => ({
        sessionId: chat.sessionId,
        topic: chat.topic,
        subject: chat.subject,
        messageCount: chat.messageCount,
        duration: chat.duration,
        complexity: chat.complexity,
        createdAt: chat.createdAt
      }));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=lecture_chats.csv');
      
      // تحويل بسيط إلى CSV
      const csvContent = [
        Object.keys(csv[0] || {}).join(','),
        ...csv.map(row => Object.values(row).join(','))
      ].join('\n');

      res.send(csvContent);
    } else {
      res.json({
        success: true,
        data: chats
      });
    }

  } catch (error) {
    console.error('❌ خطأ في تصدير المحادثات:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تصدير المحادثات',
      error: error.message
    });
  }
});

module.exports = router;
