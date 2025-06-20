const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const { authenticateToken } = require('../middleware/auth');

// حفظ رسالة محادثة
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { userId, message } = req.body;

    console.log('📝 حفظ رسالة محادثة:', {
      userId,
      messageId: message.id,
      section: message.section,
      type: message.type
    });

    const chat = new Chat({
      userId,
      sessionId: req.user?.sessionId || 'default_session',
      messageId: message.id,
      type: message.type,
      content: message.content,
      section: message.section,
      timestamp: message.timestamp,
      metadata: message.metadata || {}
    });

    await chat.save();

    console.log('✅ تم حفظ الرسالة بنجاح');
    res.json({
      success: true,
      message: 'تم حفظ الرسالة بنجاح',
      data: chat
    });

  } catch (error) {
    console.error('❌ خطأ في حفظ الرسالة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حفظ الرسالة',
      error: error.message
    });
  }
});

// جلب محادثات المستخدم
router.get('/messages/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { section } = req.query;

    // التحقق من صحة userId
    if (!userId || userId === 'undefined' || userId === 'null') {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم غير صحيح'
      });
    }

    console.log('📖 جلب محادثات المستخدم:', { userId, section });

    let query = { userId };
    if (section) {
      query.section = section;
    }

    const messages = await Chat.find(query)
      .sort({ timestamp: 1 })
      .limit(100); // آخر 100 رسالة

    console.log(`✅ تم جلب ${messages.length} رسالة`);
    res.json({
      success: true,
      data: messages
    });

  } catch (error) {
    console.error('❌ خطأ في جلب المحادثات:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المحادثات',
      error: error.message
    });
  }
});

// حذف محادثات قديمة (أكثر من أسبوعين)
router.delete('/cleanup', authenticateToken, async (req, res) => {
  try {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const result = await Chat.deleteMany({
      timestamp: { $lt: twoWeeksAgo.toISOString() }
    });

    console.log(`🗑️ تم حذف ${result.deletedCount} رسالة قديمة`);
    res.json({
      success: true,
      message: `تم حذف ${result.deletedCount} رسالة قديمة`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('❌ خطأ في تنظيف المحادثات:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تنظيف المحادثات',
      error: error.message
    });
  }
});

module.exports = router;
