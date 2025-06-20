const express = require('express');
const { Report } = require('../models');
const { authenticateToken, checkOwnership } = require('../middleware/auth');
const { validateReportCreation, validateObjectId, validatePagination } = require('../middleware/validation');
const aiService = require('../services/aiService');

const router = express.Router();

/**
 * إنشاء تقرير جديد
 * POST /api/reports
 */
router.post('/', authenticateToken, validateReportCreation, async (req, res) => {
  try {
    const { title, reportType = 'summary', dateRange, includedData = {} } = req.body;

    // التحقق من صحة التواريخ
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    
    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية'
      });
    }

    // إنشاء التقرير
    const report = new Report({
      userId: req.user._id,
      title,
      reportType,
      dateRange: { startDate, endDate },
      includedData: {
        lectures: includedData.lectures !== false,
        questions: includedData.questions !== false,
        tasks: includedData.tasks !== false,
        analytics: includedData.analytics !== false
      },
      settings: {
        includeCharts: true,
        includeRecommendations: true,
        language: req.user.preferences.language || 'ar',
        format: 'html'
      }
    });

    await report.save();

    // بدء توليد التقرير في الخلفية
    generateReportContent(report._id);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء التقرير وبدء التوليد',
      data: {
        report: report.getSummary()
      }
    });

  } catch (error) {
    console.error('خطأ في إنشاء التقرير:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * الحصول على قائمة التقارير
 * GET /api/reports
 */
router.get('/', authenticateToken, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { reportType, generationStatus } = req.query;

    // بناء الاستعلام
    let query = { userId: req.user._id };

    if (reportType) {
      query.reportType = reportType;
    }

    if (generationStatus) {
      query.generationStatus = generationStatus;
    }

    // الحصول على التقارير
    const reports = await Report.find(query)
      .select('-content') // استبعاد المحتوى الكامل
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    // عدد التقارير الإجمالي
    const total = await Report.countDocuments(query);

    res.json({
      success: true,
      data: {
        reports: reports.map(report => report.getSummary()),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('خطأ في الحصول على التقارير:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * الحصول على تقرير محدد
 * GET /api/reports/:id
 */
router.get('/:id', authenticateToken, validateObjectId(), checkOwnership(Report), async (req, res) => {
  try {
    const report = req.resource;

    // زيادة عدد المشاهدات
    report.incrementViewCount();
    await report.save();

    res.json({
      success: true,
      data: {
        report
      }
    });

  } catch (error) {
    console.error('خطأ في الحصول على التقرير:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * إعادة توليد تقرير
 * POST /api/reports/:id/regenerate
 */
router.post('/:id/regenerate', authenticateToken, validateObjectId(), checkOwnership(Report), async (req, res) => {
  try {
    const report = req.resource;

    // تحديث حالة التوليد
    report.updateGenerationStatus('pending');
    await report.save();

    // بدء التوليد
    generateReportContent(report._id);

    res.json({
      success: true,
      message: 'تم بدء إعادة توليد التقرير'
    });

  } catch (error) {
    console.error('خطأ في إعادة توليد التقرير:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * حذف تقرير
 * DELETE /api/reports/:id
 */
router.delete('/:id', authenticateToken, validateObjectId(), checkOwnership(Report), async (req, res) => {
  try {
    const report = req.resource;

    // حذف الملف إذا كان موجوداً
    if (report.fileUrl) {
      const fileService = require('../services/fileService');
      await fileService.deleteFile(report.fileUrl);
    }

    await Report.findByIdAndDelete(report._id);

    res.json({
      success: true,
      message: 'تم حذف التقرير بنجاح'
    });

  } catch (error) {
    console.error('خطأ في حذف التقرير:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * مشاركة تقرير
 * POST /api/reports/:id/share
 */
router.post('/:id/share', authenticateToken, validateObjectId(), checkOwnership(Report), async (req, res) => {
  try {
    const report = req.resource;
    const { isPublic = false, expiresIn = 7 } = req.body; // 7 أيام افتراضياً

    if (!report.isGenerated) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن مشاركة تقرير غير مكتمل'
      });
    }

    // إنشاء رمز المشاركة
    const crypto = require('crypto');
    const shareToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresIn);

    // تحديث إعدادات المشاركة
    report.isShared = true;
    report.shareSettings = {
      isPublic,
      shareToken,
      expiresAt
    };

    await report.save();

    res.json({
      success: true,
      message: 'تم إنشاء رابط المشاركة',
      data: {
        shareUrl: `/api/reports/shared/${shareToken}`,
        expiresAt
      }
    });

  } catch (error) {
    console.error('خطأ في مشاركة التقرير:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * عرض تقرير مشارك
 * GET /api/reports/shared/:token
 */
router.get('/shared/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const report = await Report.findOne({
      'shareSettings.shareToken': token,
      'shareSettings.expiresAt': { $gt: new Date() },
      isShared: true,
      isGenerated: true
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'التقرير غير موجود أو انتهت صلاحية الرابط'
      });
    }

    // زيادة عدد المشاهدات
    report.incrementViewCount();
    await report.save();

    res.json({
      success: true,
      data: {
        report: {
          title: report.title,
          content: report.content,
          createdAt: report.createdAt,
          statistics: report.statistics,
          analytics: report.analytics
        }
      }
    });

  } catch (error) {
    console.error('خطأ في عرض التقرير المشارك:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * دالة توليد محتوى التقرير
 */
async function generateReportContent(reportId) {
  try {
    const report = await Report.findById(reportId).populate('userId');
    if (!report) return;

    // تحديث حالة التوليد
    report.updateGenerationStatus('generating');
    await report.save();

    // حساب الإحصائيات
    await report.calculateStatistics();

    // توليد التوصيات
    report.generateRecommendations();

    // إعداد بيانات التقرير للذكاء الاصطناعي
    const reportData = {
      user: {
        name: report.userId.name,
        level: report.userId.level
      },
      dateRange: report.dateRange,
      statistics: report.statistics,
      analytics: report.analytics,
      reportType: report.reportType
    };

    // توليد التقرير باستخدام الذكاء الاصطناعي
    const reportResult = await aiService.generateDetailedReport(reportData, {
      reportType: report.reportType,
      language: report.settings.language,
      includeCharts: report.settings.includeCharts,
      includeRecommendations: report.settings.includeRecommendations
    });

    if (reportResult.success) {
      report.content = reportResult.content;
      report.pageCount = Math.ceil(reportResult.content.length / 3000); // تقدير عدد الصفحات
      
      report.generationMetadata = {
        processingTime: Date.now() - report.updatedAt.getTime(),
        dataPoints: Object.keys(report.statistics).length,
        aiModel: reportResult.model,
        version: '1.0'
      };

      report.updateGenerationStatus('completed');
    } else {
      report.updateGenerationStatus('failed', reportResult.error);
    }

    await report.save();

  } catch (error) {
    console.error('خطأ في توليد التقرير:', error);
    
    try {
      const report = await Report.findById(reportId);
      if (report) {
        report.updateGenerationStatus('failed', error.message);
        await report.save();
      }
    } catch (updateError) {
      console.error('خطأ في تحديث حالة التقرير:', updateError);
    }
  }
}

module.exports = router;
