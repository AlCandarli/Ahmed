/**
 * Database Security Middleware - حماية قاعدة البيانات
 */

const mongoose = require('mongoose');
const { logSuspiciousActivity } = require('./security');

/**
 * التحقق من صحة ObjectId
 */
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return next();
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      logSuspiciousActivity(req, 'INVALID_OBJECT_ID', { paramName, id });
      return res.status(400).json({
        success: false,
        message: 'معرف غير صحيح'
      });
    }

    next();
  };
};

/**
 * تنظيف البيانات من محاولات الحقن
 */
const sanitizeInput = (req, res, next) => {
  // قائمة الكلمات المحظورة
  const forbiddenPatterns = [
    /\$where/gi,
    /\$ne/gi,
    /\$gt/gi,
    /\$lt/gi,
    /\$gte/gi,
    /\$lte/gi,
    /\$in/gi,
    /\$nin/gi,
    /\$exists/gi,
    /\$regex/gi,
    /\$options/gi,
    /\$elemMatch/gi,
    /\$size/gi,
    /\$all/gi,
    /\$or/gi,
    /\$and/gi,
    /\$nor/gi,
    /\$not/gi,
    /javascript:/gi,
    /<script/gi,
    /eval\(/gi,
    /function\(/gi,
    /setTimeout/gi,
    /setInterval/gi
  ];

  const checkForInjection = (obj, path = '') => {
    if (typeof obj === 'string') {
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(obj)) {
          logSuspiciousActivity(req, 'INJECTION_ATTEMPT', { 
            path, 
            value: obj.substring(0, 100),
            pattern: pattern.toString()
          });
          return true;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (checkForInjection(value, `${path}.${key}`)) {
          return true;
        }
      }
    }
    return false;
  };

  // فحص body
  if (req.body && checkForInjection(req.body, 'body')) {
    return res.status(400).json({
      success: false,
      message: 'البيانات المرسلة تحتوي على محتوى غير مسموح'
    });
  }

  // فحص query parameters
  if (req.query && checkForInjection(req.query, 'query')) {
    return res.status(400).json({
      success: false,
      message: 'معاملات الاستعلام تحتوي على محتوى غير مسموح'
    });
  }

  // فحص params
  if (req.params && checkForInjection(req.params, 'params')) {
    return res.status(400).json({
      success: false,
      message: 'معاملات المسار تحتوي على محتوى غير مسموح'
    });
  }

  next();
};

/**
 * تحديد حجم الاستعلامات
 */
const limitQuerySize = (maxSize = 1000) => {
  return (req, res, next) => {
    const queryString = JSON.stringify(req.query || {});
    const bodyString = JSON.stringify(req.body || {});

    if (queryString.length > maxSize) {
      logSuspiciousActivity(req, 'OVERSIZED_QUERY', { size: queryString.length });
      return res.status(400).json({
        success: false,
        message: 'حجم الاستعلام كبير جداً'
      });
    }

    if (bodyString.length > maxSize * 10) { // body يمكن أن يكون أكبر
      logSuspiciousActivity(req, 'OVERSIZED_BODY', { size: bodyString.length });
      return res.status(400).json({
        success: false,
        message: 'حجم البيانات المرسلة كبير جداً'
      });
    }

    next();
  };
};

/**
 * منع الاستعلامات المعقدة
 */
const preventComplexQueries = (req, res, next) => {
  const checkComplexity = (obj, depth = 0, maxDepth = 5) => {
    if (depth > maxDepth) {
      return true;
    }

    if (typeof obj === 'object' && obj !== null) {
      const keys = Object.keys(obj);
      
      // منع الكثير من المفاتيح
      if (keys.length > 20) {
        return true;
      }

      for (const value of Object.values(obj)) {
        if (checkComplexity(value, depth + 1, maxDepth)) {
          return true;
        }
      }
    }

    return false;
  };

  if (checkComplexity(req.query || {}) || checkComplexity(req.body || {})) {
    logSuspiciousActivity(req, 'COMPLEX_QUERY_ATTEMPT');
    return res.status(400).json({
      success: false,
      message: 'الاستعلام معقد جداً'
    });
  }

  next();
};

/**
 * حماية من استعلامات regex الخطيرة
 */
const protectFromRegexDOS = (req, res, next) => {
  const checkRegexDOS = (obj) => {
    if (typeof obj === 'string') {
      // فحص regex patterns خطيرة
      const dangerousPatterns = [
        /\(\?\=.*\)\+/,  // Positive lookahead with quantifier
        /\(\?\!.*\)\+/,  // Negative lookahead with quantifier
        /\(\?\<\=.*\)\+/, // Positive lookbehind with quantifier
        /\(\?\<\!.*\)\+/, // Negative lookbehind with quantifier
        /\(\.\*\)\+/,    // Greedy quantifier
        /\(\.\+\)\+/,    // Greedy quantifier
        /\(\.\*\)\{.*\}/, // Quantifier range
        /\(\.\+\)\{.*\}/, // Quantifier range
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(obj)) {
          return true;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const value of Object.values(obj)) {
        if (checkRegexDOS(value)) {
          return true;
        }
      }
    }
    return false;
  };

  if (checkRegexDOS(req.query || {}) || checkRegexDOS(req.body || {})) {
    logSuspiciousActivity(req, 'REGEX_DOS_ATTEMPT');
    return res.status(400).json({
      success: false,
      message: 'نمط البحث غير مسموح'
    });
  }

  next();
};

/**
 * تحديد عدد النتائج المسترجعة
 */
const limitResults = (defaultLimit = 50, maxLimit = 100) => {
  return (req, res, next) => {
    let limit = parseInt(req.query.limit) || defaultLimit;
    
    if (limit > maxLimit) {
      limit = maxLimit;
      logSuspiciousActivity(req, 'EXCESSIVE_LIMIT_ATTEMPT', { requestedLimit: req.query.limit });
    }

    if (limit < 1) {
      limit = defaultLimit;
    }

    req.query.limit = limit;
    next();
  };
};

/**
 * منع الوصول للحقول الحساسة
 */
const protectSensitiveFields = (req, res, next) => {
  const sensitiveFields = [
    'password',
    'passwordResetToken',
    'emailVerificationToken',
    'twoFactorSecret',
    'securityQuestions',
    'tokenVersion',
    'loginAttempts',
    'lockUntil',
    'securityLog'
  ];

  const removeSensitiveFields = (obj) => {
    if (typeof obj === 'object' && obj !== null) {
      for (const field of sensitiveFields) {
        if (obj.hasOwnProperty(field)) {
          delete obj[field];
          logSuspiciousActivity(req, 'SENSITIVE_FIELD_ACCESS_ATTEMPT', { field });
        }
      }

      // فحص الحقول المتداخلة
      for (const value of Object.values(obj)) {
        if (typeof value === 'object' && value !== null) {
          removeSensitiveFields(value);
        }
      }
    }
  };

  // فحص وتنظيف query parameters
  if (req.query.select) {
    for (const field of sensitiveFields) {
      if (req.query.select.includes(field)) {
        logSuspiciousActivity(req, 'SENSITIVE_FIELD_SELECT_ATTEMPT', { field });
        req.query.select = req.query.select.replace(new RegExp(`\\b${field}\\b`, 'g'), '');
      }
    }
  }

  removeSensitiveFields(req.query || {});
  removeSensitiveFields(req.body || {});

  next();
};

module.exports = {
  validateObjectId,
  sanitizeInput,
  limitQuerySize,
  preventComplexQueries,
  protectFromRegexDOS,
  limitResults,
  protectSensitiveFields
};
