/**
 * مهام التنظيف التلقائي
 * Automatic Cleanup Tasks
 */

const { Chat, Analytics } = require('../models');

/**
 * تنظيف المحادثات المنتهية الصلاحية
 */
async function cleanupExpiredChats() {
  try {
    console.log('🧹 بدء تنظيف المحادثات المنتهية الصلاحية...');
    
    const result = await Chat.cleanupExpiredChats();
    
    console.log(`✅ تم حذف ${result.deletedCount} محادثة منتهية الصلاحية`);
    
    return {
      success: true,
      deletedCount: result.deletedCount,
      message: `تم حذف ${result.deletedCount} محادثة منتهية الصلاحية`
    };
  } catch (error) {
    console.error('❌ خطأ في تنظيف المحادثات:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * تنظيف التحليلات القديمة (أكثر من 6 أشهر)
 */
async function cleanupOldAnalytics() {
  try {
    console.log('🧹 بدء تنظيف التحليلات القديمة...');
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const result = await Analytics.deleteMany({
      date: { $lt: sixMonthsAgo }
    });
    
    console.log(`✅ تم حذف ${result.deletedCount} سجل تحليلات قديم`);
    
    return {
      success: true,
      deletedCount: result.deletedCount,
      message: `تم حذف ${result.deletedCount} سجل تحليلات قديم`
    };
  } catch (error) {
    console.error('❌ خطأ في تنظيف التحليلات:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * تشغيل جميع مهام التنظيف
 */
async function runAllCleanupTasks() {
  console.log('🚀 بدء تشغيل جميع مهام التنظيف...');
  
  const results = {
    chats: await cleanupExpiredChats(),
    analytics: await cleanupOldAnalytics(),
    timestamp: new Date().toISOString()
  };
  
  console.log('✅ انتهاء جميع مهام التنظيف');
  
  return results;
}

/**
 * جدولة مهام التنظيف التلقائي
 */
function scheduleCleanupTasks() {
  // تشغيل التنظيف كل 24 ساعة
  const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 ساعة بالميلي ثانية
  
  console.log('⏰ جدولة مهام التنظيف التلقائي...');
  
  // تشغيل فوري
  runAllCleanupTasks();
  
  // جدولة التشغيل المتكرر
  setInterval(() => {
    runAllCleanupTasks();
  }, CLEANUP_INTERVAL);
  
  console.log(`✅ تم جدولة مهام التنظيف للتشغيل كل ${CLEANUP_INTERVAL / (60 * 60 * 1000)} ساعة`);
}

/**
 * إحصائيات التخزين
 */
async function getStorageStats() {
  try {
    const stats = await Promise.all([
      Chat.countDocuments(),
      Chat.countDocuments({ status: 'active' }),
      Chat.countDocuments({ status: 'archived' }),
      Chat.countDocuments({ status: 'deleted' }),
      Analytics.countDocuments()
    ]);
    
    const [totalChats, activeChats, archivedChats, deletedChats, totalAnalytics] = stats;
    
    // حساب حجم البيانات التقريبي
    const avgChatSize = 5; // KB تقريبي لكل محادثة
    const avgAnalyticsSize = 2; // KB تقريبي لكل سجل تحليلات
    
    const estimatedSize = {
      chats: totalChats * avgChatSize,
      analytics: totalAnalytics * avgAnalyticsSize,
      total: (totalChats * avgChatSize) + (totalAnalytics * avgAnalyticsSize)
    };
    
    return {
      counts: {
        totalChats,
        activeChats,
        archivedChats,
        deletedChats,
        totalAnalytics
      },
      estimatedSizeKB: estimatedSize,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('خطأ في الحصول على إحصائيات التخزين:', error);
    return null;
  }
}

/**
 * تنظيف يدوي للمحادثات حسب المستخدم
 */
async function cleanupUserChats(userId, olderThanDays = 14) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const result = await Chat.updateMany(
      {
        userId,
        createdAt: { $lt: cutoffDate },
        status: { $ne: 'deleted' }
      },
      {
        status: 'deleted'
      }
    );
    
    return {
      success: true,
      modifiedCount: result.modifiedCount,
      message: `تم حذف ${result.modifiedCount} محادثة للمستخدم`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * استعادة المحادثات المحذوفة (خلال 7 أيام)
 */
async function restoreDeletedChats(userId, withinDays = 7) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - withinDays);
    
    const result = await Chat.updateMany(
      {
        userId,
        status: 'deleted',
        updatedAt: { $gte: cutoffDate }
      },
      {
        status: 'archived'
      }
    );
    
    return {
      success: true,
      restoredCount: result.modifiedCount,
      message: `تم استعادة ${result.modifiedCount} محادثة`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  cleanupExpiredChats,
  cleanupOldAnalytics,
  runAllCleanupTasks,
  scheduleCleanupTasks,
  getStorageStats,
  cleanupUserChats,
  restoreDeletedChats
};
