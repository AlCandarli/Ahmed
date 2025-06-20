const express = require('express');
const { Lecture } = require('../models');
const { authenticateToken, checkOwnership } = require('../middleware/auth');
const { validateLectureCreation, validateObjectId, validatePagination, validateSearch } = require('../middleware/validation');
const fileService = require('../services/fileService');
const aiService = require('../services/aiService');

const router = express.Router();

/**
 * رفع محاضرة جديدة
 * POST /api/lectures
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    // إعداد multer للرفع
    const upload = fileService.getMulterConfig({
      fileTypes: 'documents',
      maxSize: 10485760 // 10MB
    });

    upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'ملف المحاضرة مطلوب'
        });
      }

      const { title } = req.body;

      if (!title || title.trim().length < 5) {
        return res.status(400).json({
          success: false,
          message: 'عنوان المحاضرة مطلوب ويجب أن يكون على الأقل 5 أحرف'
        });
      }

      try {
        // قراءة محتوى الملف مع التحليل المتقدم
        const fileContent = await fileService.readTextFile(req.file.path);

        console.log('📊 معلومات الملف المحللة:', {
          wordCount: fileContent.wordCount,
          complexity: fileContent.complexity,
          language: fileContent.detectedLanguage,
          structure: fileContent.structure
        });

        // إنشاء المحاضرة مع المعلومات المتقدمة
        const lecture = new Lecture({
          userId: req.user._id,
          title: title.trim(),
          content: fileContent.content,
          fileUrl: req.file.path,
          fileName: req.file.originalname,
          fileType: req.file.mimetype.split('/')[1] || 'unknown',
          fileSize: req.file.size,
          stats: {
            wordCount: fileContent.wordCount || 0,
            charCount: fileContent.charCount || 0,
            sentenceCount: fileContent.sentenceCount || 0,
            paragraphCount: fileContent.paragraphCount || 0,
            pageCount: fileContent.pageCount || 1,
            readingTime: fileContent.readingTime || 0,
            complexity: fileContent.complexity || 'medium',
            detectedLanguage: fileContent.detectedLanguage || 'unknown'
          },
          metadata: {
            structure: fileContent.structure || {},
            averageWordsPerSentence: fileContent.averageWordsPerSentence || 0,
            averageSentencesPerParagraph: fileContent.averageSentencesPerParagraph || 0
          }
        });

        await lecture.save();

        // بدء معالجة المحتوى بالذكاء الاصطناعي المتقدم في الخلفية
        processAdvancedLectureContent(lecture._id, fileContent);

        res.status(201).json({
          success: true,
          message: 'تم رفع المحاضرة بنجاح مع تحليل متقدم',
          data: {
            lecture: lecture.getSummary(),
            analysis: {
              wordCount: fileContent.wordCount,
              complexity: fileContent.complexity,
              language: fileContent.detectedLanguage,
              readingTime: fileContent.readingTime,
              structure: {
                headings: fileContent.structure?.headings?.length || 0,
                lists: fileContent.structure?.lists?.length || 0,
                tables: fileContent.structure?.tables?.length || 0
              }
            }
          }
        });

      } catch (fileError) {
        // حذف الملف في حالة الخطأ
        await fileService.deleteFile(req.file.path);
        
        return res.status(400).json({
          success: false,
          message: `خطأ في قراءة الملف: ${fileError.message}`
        });
      }
    });

  } catch (error) {
    console.error('خطأ في رفع المحاضرة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * الحصول على قائمة المحاضرات
 * GET /api/lectures
 */
router.get('/', authenticateToken, validatePagination, validateSearch, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.q;
    const sort = req.query.sort || '-createdAt';

    // بناء الاستعلام
    let query = { userId: req.user._id };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    // الحصول على المحاضرات
    const lectures = await Lecture.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-content'); // استبعاد المحتوى الكامل

    // عدد المحاضرات الإجمالي
    const total = await Lecture.countDocuments(query);

    res.json({
      success: true,
      data: {
        lectures: lectures.map(lecture => lecture.getSummary()),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('خطأ في الحصول على المحاضرات:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * الحصول على محاضرة محددة
 * GET /api/lectures/:id
 */
router.get('/:id', authenticateToken, validateObjectId(), checkOwnership(Lecture), async (req, res) => {
  try {
    const lecture = req.resource;

    // زيادة عدد المشاهدات
    lecture.incrementViewCount();
    await lecture.save();

    res.json({
      success: true,
      data: {
        lecture
      }
    });

  } catch (error) {
    console.error('خطأ في الحصول على المحاضرة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * تحديث محاضرة
 * PUT /api/lectures/:id
 */
router.put('/:id', authenticateToken, validateObjectId(), checkOwnership(Lecture), async (req, res) => {
  try {
    const lecture = req.resource;
    const { title, isPublic } = req.body;

    // تحديث البيانات المسموحة
    if (title && title.trim().length >= 5) {
      lecture.title = title.trim();
    }

    if (typeof isPublic === 'boolean') {
      lecture.isPublic = isPublic;
    }

    await lecture.save();

    res.json({
      success: true,
      message: 'تم تحديث المحاضرة بنجاح',
      data: {
        lecture: lecture.getSummary()
      }
    });

  } catch (error) {
    console.error('خطأ في تحديث المحاضرة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * حذف محاضرة
 * DELETE /api/lectures/:id
 */
router.delete('/:id', authenticateToken, validateObjectId(), checkOwnership(Lecture), async (req, res) => {
  try {
    const lecture = req.resource;

    // حذف الملف المرتبط
    await fileService.deleteFile(lecture.fileUrl);

    // حذف المحاضرة
    await Lecture.findByIdAndDelete(lecture._id);

    res.json({
      success: true,
      message: 'تم حذف المحاضرة بنجاح'
    });

  } catch (error) {
    console.error('خطأ في حذف المحاضرة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * إعادة معالجة محاضرة
 * POST /api/lectures/:id/reprocess
 */
router.post('/:id/reprocess', authenticateToken, validateObjectId(), checkOwnership(Lecture), async (req, res) => {
  try {
    const lecture = req.resource;

    // تحديث حالة المعالجة
    lecture.updateProcessingStatus('pending');
    await lecture.save();

    // بدء المعالجة
    processLectureContent(lecture._id);

    res.json({
      success: true,
      message: 'تم بدء إعادة معالجة المحاضرة'
    });

  } catch (error) {
    console.error('خطأ في إعادة معالجة المحاضرة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * دالة معالجة محتوى المحاضرة بالذكاء الاصطناعي المتقدم
 */
async function processAdvancedLectureContent(lectureId, fileMetadata) {
  try {
    console.log('🤖 بدء المعالجة المتقدمة للمحاضرة:', lectureId);

    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      console.log('❌ لم يتم العثور على المحاضرة');
      return;
    }

    // تحديث حالة المعالجة
    lecture.updateProcessingStatus('processing');
    await lecture.save();

    // تحليل المحتوى بطريقة متقدمة
    const analysisResult = await aiService.analyzeLectureContent(lecture.content, fileMetadata, {
      language: fileMetadata.detectedLanguage === 'ar' ? 'ar' : 'en',
      maxKeywords: 15
    });

    console.log('📊 نتيجة التحليل المتقدم:', analysisResult.success ? 'نجح' : 'فشل');

    if (analysisResult.success) {
      try {
        const analysis = JSON.parse(analysisResult.data);

        // تحديث المحاضرة بالتحليل المتقدم
        lecture.analysis = {
          keywords: analysis.keywords || [],
          summary: analysis.summary || {},
          classification: analysis.classification || {},
          structure: analysis.structure || {},
          recommendations: analysis.recommendations || {},
          confidence: analysis.confidence || 0.8,
          analyzedAt: new Date()
        };

        // تحديث الحقول الأساسية
        if (analysis.summary?.brief) {
          lecture.summary = analysis.summary.brief;
        }

        if (analysis.keywords && analysis.keywords.length > 0) {
          lecture.keywords = analysis.keywords.map(k => k.word);
        }

        if (analysis.classification?.difficulty) {
          lecture.difficulty = analysis.classification.difficulty;
        }

        if (analysis.classification?.mainTopic) {
          lecture.topic = analysis.classification.mainTopic;
        }

        lecture.updateProcessingStatus('completed');
        console.log('✅ تم حفظ التحليل المتقدم بنجاح');

      } catch (parseError) {
        console.error('❌ خطأ في تحليل JSON:', parseError);

        // استخدام التحليل البسيط كبديل
        const fallbackResult = await aiService.extractKeywordsAndSummary(lecture.content, {
          language: fileMetadata.detectedLanguage === 'ar' ? 'ar' : 'en',
          maxKeywords: 10
        });

        if (fallbackResult.success) {
          const fallbackAnalysis = JSON.parse(fallbackResult.data);
          lecture.summary = fallbackAnalysis.summary;
          lecture.keywords = fallbackAnalysis.keywords?.map(k => k.word) || [];
          lecture.updateProcessingStatus('completed');
          console.log('✅ تم استخدام التحليل البديل');
        } else {
          lecture.updateProcessingStatus('failed');
          console.log('❌ فشل التحليل البديل أيضاً');
        }
      }
    } else {
      console.log('❌ فشل في التحليل المتقدم، محاولة التحليل البسيط...');

      // استخدام التحليل البسيط كبديل
      const fallbackResult = await aiService.extractKeywordsAndSummary(lecture.content, {
        language: fileMetadata.detectedLanguage === 'ar' ? 'ar' : 'en',
        maxKeywords: 10
      });

      if (fallbackResult.success) {
        const fallbackAnalysis = JSON.parse(fallbackResult.data);
        lecture.summary = fallbackAnalysis.summary;
        lecture.keywords = fallbackAnalysis.keywords?.map(k => k.word) || [];
        lecture.updateProcessingStatus('completed');
        console.log('✅ تم استخدام التحليل البديل');
      } else {
        lecture.updateProcessingStatus('failed');
        console.log('❌ فشل جميع أنواع التحليل');
      }
    }

    await lecture.save();
    console.log('💾 تم حفظ المحاضرة بعد المعالجة');

  } catch (error) {
    console.error('💥 خطأ في معالجة المحاضرة:', error);

    try {
      const lecture = await Lecture.findById(lectureId);
      if (lecture) {
        lecture.updateProcessingStatus('failed');
        await lecture.save();
      }
    } catch (saveError) {
      console.error('❌ خطأ في حفظ حالة الفشل:', saveError);
    }
  }
}

/**
 * دالة معالجة محتوى المحاضرة بالذكاء الاصطناعي (للتوافق مع الكود القديم)
 */
async function processLectureContent(lectureId) {
  try {
    const lecture = await Lecture.findById(lectureId);
    if (!lecture) return;

    // تحديث حالة المعالجة
    lecture.updateProcessingStatus('processing');
    await lecture.save();

    // استخراج الكلمات المفتاحية والملخص
    const analysisResult = await aiService.extractKeywordsAndSummary(lecture.content, {
      language: 'ar',
      maxKeywords: 10
    });

    if (analysisResult.success) {
      try {
        const analysis = JSON.parse(analysisResult.content);
        
        // تحديث بيانات المحاضرة
        if (analysis.keywords) {
          lecture.keywords = analysis.keywords.map(kw => ({
            word: kw.word,
            frequency: kw.frequency || 1
          }));
        }

        if (analysis.summary) {
          lecture.summary = analysis.summary;
        }

        if (analysis.mainTopic) {
          lecture.topics = [analysis.mainTopic];
        }

        if (analysis.difficulty) {
          lecture.estimatedDifficulty = analysis.difficulty;
        }

        if (analysis.language) {
          lecture.detectedLanguage = analysis.language;
        }

        lecture.updateProcessingStatus('completed');
        
      } catch (parseError) {
        console.error('خطأ في تحليل نتيجة الذكاء الاصطناعي:', parseError);
        lecture.updateProcessingStatus('failed', 'خطأ في تحليل النتيجة');
      }
    } else {
      lecture.updateProcessingStatus('failed', analysisResult.error);
    }

    await lecture.save();

  } catch (error) {
    console.error('خطأ في معالجة المحاضرة:', error);
    
    try {
      const lecture = await Lecture.findById(lectureId);
      if (lecture) {
        lecture.updateProcessingStatus('failed', error.message);
        await lecture.save();
      }
    } catch (updateError) {
      console.error('خطأ في تحديث حالة المعالجة:', updateError);
    }
  }
}

module.exports = router;
