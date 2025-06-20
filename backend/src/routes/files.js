const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const fileService = require('../services/fileService');
const { authenticateToken } = require('../middleware/auth');
const {
  createSecureUpload,
  postUploadValidation,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE
} = require('../middleware/file-security');
const { logSuspiciousActivity } = require('../middleware/security');

const router = express.Router();

// إعداد رفع الملفات الآمن
const secureUpload = createSecureUpload('uploads/temp');

/**
 * استخراج النص من الملفات المرفوعة بشكل آمن
 * POST /api/files/extract-text
 */
router.post('/extract-text',
  authenticateToken,
  secureUpload.single('file'),
  postUploadValidation,
  async (req, res) => {
  try {
    if (!req.file) {
      logSuspiciousActivity(req, 'FILE_UPLOAD_NO_FILE', { userId: req.user._id });
      return res.status(400).json({
        success: false,
        message: 'لم يتم رفع أي ملف'
      });
    }

    // تسجيل رفع الملف بنجاح
    logSuspiciousActivity(req, 'FILE_UPLOAD_SUCCESS', {
      userId: req.user._id,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    console.log('📄 معالجة ملف آمن:', req.file.originalname, 'نوع:', req.file.mimetype, 'المستخدم:', req.user._id);

    let fileContent;
    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    try {
      // قراءة الملف حسب نوعه
      if (fileExtension === '.pdf') {
        console.log('📖 قراءة ملف PDF...');
        try {
          fileContent = await fileService.readPDF(filePath);
        } catch (pdfError) {
          console.error('❌ خطأ في قراءة PDF:', pdfError.message);
          throw new Error('فشل في قراءة ملف PDF. تأكد من أن الملف غير محمي بكلمة مرور وليس تالفاً.');
        }
      } else if (fileExtension === '.doc' || fileExtension === '.docx') {
        console.log('📝 قراءة ملف Word...');
        try {
          fileContent = await fileService.readWord(filePath);
        } catch (wordError) {
          console.error('❌ خطأ في قراءة Word:', wordError.message);
          throw new Error('فشل في قراءة ملف Word. تأكد من أن الملف ليس تالفاً.');
        }
      } else {
        console.log('📄 قراءة ملف نصي...');
        try {
          fileContent = await fileService.readPlainText(filePath);
        } catch (textError) {
          console.error('❌ خطأ في قراءة النص:', textError.message);
          throw new Error('فشل في قراءة الملف النصي. تأكد من أن الملف يحتوي على نص صالح.');
        }
      }

      // التحقق من وجود محتوى
      if (!fileContent || !fileContent.content || fileContent.content.trim().length === 0) {
        throw new Error('الملف فارغ أو لا يحتوي على نص قابل للقراءة.');
      }

      console.log('✅ تم قراءة الملف بنجاح:', {
        contentLength: fileContent.content.length,
        wordCount: fileContent.wordCount,
        language: fileContent.detectedLanguage
      });

      // تنظيف الملف المؤقت
      try {
        await fs.unlink(filePath);
        console.log('🧹 تم حذف الملف المؤقت');
      } catch (cleanupError) {
        console.warn('⚠️ لم يتم حذف الملف المؤقت:', cleanupError.message);
      }

      // إرجاع النتيجة
      res.json({
        success: true,
        message: 'تم استخراج النص بنجاح',
        data: {
          content: fileContent.content,
          wordCount: fileContent.wordCount,
          charCount: fileContent.charCount,
          language: fileContent.detectedLanguage,
          complexity: fileContent.complexity,
          readingTime: fileContent.readingTime,
          structure: fileContent.structure
        }
      });

    } catch (processingError) {
      console.error('❌ خطأ في معالجة الملف:', processingError);
      
      // تنظيف الملف المؤقت في حالة الخطأ
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.warn('⚠️ لم يتم حذف الملف المؤقت بعد الخطأ:', cleanupError.message);
      }

      res.status(500).json({
        success: false,
        message: 'فشل في معالجة الملف',
        error: processingError.message
      });
    }

  } catch (error) {
    console.error('💥 خطأ عام في استخراج النص:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      error: error.message
    });
  }
});

/**
 * معلومات حول أنواع الملفات المدعومة والأمان
 * GET /api/files/supported-types
 */
router.get('/supported-types', (req, res) => {
  res.json({
    success: true,
    data: {
      supportedTypes: [
        {
          type: 'PDF',
          extensions: ALLOWED_FILE_TYPES.documents.filter(ext => ext === '.pdf'),
          mimeTypes: ['application/pdf'],
          description: 'ملفات PDF'
        },
        {
          type: 'Word',
          extensions: ALLOWED_FILE_TYPES.documents.filter(ext => ['.doc', '.docx'].includes(ext)),
          mimeTypes: [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ],
          description: 'ملفات Microsoft Word'
        },
        {
          type: 'Text',
          extensions: ALLOWED_FILE_TYPES.documents.filter(ext => ['.txt', '.rtf'].includes(ext)),
          mimeTypes: ['text/plain', 'application/rtf'],
          description: 'ملفات نصية عادية'
        }
      ],
      maxFileSize: `${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB`,
      securityFeatures: [
        'فحص نوع الملف',
        'فحص محتوى الملف',
        'حماية من الملفات الخطيرة',
        'تشفير أثناء النقل',
        'حذف تلقائي للملفات المؤقتة',
        'تسجيل جميع العمليات'
      ],
      features: [
        'استخراج النص',
        'تحليل البنية',
        'كشف اللغة',
        'حساب الإحصائيات',
        'تقدير وقت القراءة'
      ]
    }
  });
});

module.exports = router;
