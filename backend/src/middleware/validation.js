const { body, param, query, validationResult } = require('express-validator');

/**
 * معالج نتائج التحقق
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      message: 'خطأ في التحقق من البيانات',
      errors: errorMessages
    });
  }
  
  next();
};

/**
 * قواعد التحقق من تسجيل المستخدم
 */
const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('الاسم يجب أن يكون بين 2 و 50 حرف')
    .matches(/^[\u0600-\u06FFa-zA-Z\s]+$/)
    .withMessage('الاسم يجب أن يحتوي على أحرف عربية أو إنجليزية فقط'),
  
  body('email')
    .isEmail()
    .withMessage('يرجى إدخال بريد إلكتروني صحيح')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('كلمة المرور يجب أن تكون على الأقل 6 أحرف')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('كلمة المرور يجب أن تحتوي على أحرف وأرقام'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('تأكيد كلمة المرور غير متطابق');
      }
      return true;
    }),
  
  handleValidationErrors
];

/**
 * قواعد التحقق من تسجيل الدخول
 */
const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('يرجى إدخال بريد إلكتروني صحيح')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('كلمة المرور مطلوبة'),
  
  handleValidationErrors
];

/**
 * قواعد التحقق من إنشاء المحاضرة
 */
const validateLectureCreation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('عنوان المحاضرة يجب أن يكون بين 5 و 200 حرف'),
  
  body('content')
    .trim()
    .isLength({ min: 10 })
    .withMessage('محتوى المحاضرة يجب أن يكون على الأقل 10 أحرف'),
  
  handleValidationErrors
];

/**
 * قواعد التحقق من إنشاء السؤال
 */
const validateQuestionCreation = [
  body('questionText')
    .trim()
    .isLength({ min: 5, max: 1000 })
    .withMessage('نص السؤال يجب أن يكون بين 5 و 1000 حرف'),
  
  body('questionType')
    .isIn(['multiple_choice', 'true_false', 'short_answer', 'essay'])
    .withMessage('نوع السؤال غير صحيح'),
  
  body('correctAnswer')
    .trim()
    .notEmpty()
    .withMessage('الإجابة الصحيحة مطلوبة'),
  
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('مستوى الصعوبة غير صحيح'),
  
  body('options')
    .if(body('questionType').equals('multiple_choice'))
    .isArray({ min: 2, max: 6 })
    .withMessage('يجب أن يكون هناك بين 2 و 6 خيارات للأسئلة متعددة الخيارات'),
  
  handleValidationErrors
];

/**
 * قواعد التحقق من إجابة السؤال
 */
const validateQuestionAnswer = [
  body('userAnswer')
    .trim()
    .notEmpty()
    .withMessage('الإجابة مطلوبة'),
  
  body('timeSpent')
    .optional()
    .isInt({ min: 0 })
    .withMessage('الوقت المستغرق يجب أن يكون رقم موجب'),
  
  handleValidationErrors
];

/**
 * قواعد التحقق من إنشاء المهمة
 */
const validateTaskCreation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('عنوان المهمة يجب أن يكون بين 5 و 200 حرف'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('وصف المهمة يجب أن يكون بين 10 و 2000 حرف'),
  
  body('category')
    .isIn(['web_development', 'mobile_development', 'data_science', 'algorithms', 'database', 'machine_learning', 'cybersecurity', 'game_development', 'desktop_applications', 'api_development'])
    .withMessage('فئة المهمة غير صحيحة'),
  
  body('language')
    .isIn(['javascript', 'python', 'java', 'cpp', 'csharp', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'typescript', 'sql'])
    .withMessage('لغة البرمجة غير صحيحة'),
  
  body('difficulty')
    .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
    .withMessage('مستوى الصعوبة غير صحيح'),
  
  body('testCases')
    .isArray({ min: 1 })
    .withMessage('يجب أن يكون هناك حالة اختبار واحدة على الأقل'),
  
  body('solution')
    .trim()
    .notEmpty()
    .withMessage('الحل المرجعي مطلوب'),
  
  handleValidationErrors
];

/**
 * قواعد التحقق من إرسال حل المهمة
 */
const validateTaskSubmission = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('الكود مطلوب'),
  
  handleValidationErrors
];

/**
 * قواعد التحقق من إنشاء التقرير
 */
const validateReportCreation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('عنوان التقرير يجب أن يكون بين 5 و 200 حرف'),
  
  body('reportType')
    .optional()
    .isIn(['performance', 'progress', 'summary', 'detailed', 'custom'])
    .withMessage('نوع التقرير غير صحيح'),
  
  body('dateRange.startDate')
    .isISO8601()
    .withMessage('تاريخ البداية غير صحيح'),
  
  body('dateRange.endDate')
    .isISO8601()
    .withMessage('تاريخ النهاية غير صحيح')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.dateRange.startDate)) {
        throw new Error('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
      }
      return true;
    }),
  
  handleValidationErrors
];

/**
 * قواعد التحقق من معرف MongoDB
 */
const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage('معرف غير صحيح'),
  
  handleValidationErrors
];

/**
 * قواعد التحقق من الاستعلامات
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('رقم الصفحة يجب أن يكون رقم موجب'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('حد النتائج يجب أن يكون بين 1 و 100'),
  
  query('sort')
    .optional()
    .isIn(['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'name', '-name'])
    .withMessage('نوع الترتيب غير صحيح'),
  
  handleValidationErrors
];

/**
 * قواعد التحقق من البحث
 */
const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('نص البحث يجب أن يكون بين 1 و 100 حرف'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateLectureCreation,
  validateQuestionCreation,
  validateQuestionAnswer,
  validateTaskCreation,
  validateTaskSubmission,
  validateReportCreation,
  validateObjectId,
  validatePagination,
  validateSearch
};
