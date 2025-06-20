const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models');
const { logSuspiciousActivity } = require('./security');

/**
 * Middleware للمصادقة والتفويض المحسن
 */

/**
 * التحقق من صحة الرمز المميز المحسن
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      logSuspiciousActivity(req, 'MISSING_AUTH_TOKEN');
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة مطلوب'
      });
    }

    // التحقق من صحة الرمز
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // التحقق من وجود معرف المستخدم
    if (!decoded.userId) {
      logSuspiciousActivity(req, 'INVALID_TOKEN_PAYLOAD', { decoded });
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صحيح'
      });
    }

    // البحث عن المستخدم
    const user = await User.findById(decoded.userId).select('-password +tokenVersion');

    if (!user) {
      logSuspiciousActivity(req, 'USER_NOT_FOUND', { userId: decoded.userId });
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    if (!user.isActive) {
      logSuspiciousActivity(req, 'INACTIVE_USER_ACCESS', { userId: user._id });
      return res.status(401).json({
        success: false,
        message: 'الحساب غير مفعل'
      });
    }

    // التحقق من إصدار الرمز المميز (للحماية من الرموز المسروقة)
    if (decoded.tokenVersion && user.tokenVersion && decoded.tokenVersion !== user.tokenVersion) {
      logSuspiciousActivity(req, 'INVALID_TOKEN_VERSION', {
        userId: user._id,
        tokenVersion: decoded.tokenVersion,
        currentVersion: user.tokenVersion
      });
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صالح'
      });
    }

    // تحديث آخر نشاط
    user.lastActivity = new Date();
    await user.save();

    // إضافة المستخدم للطلب
    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logSuspiciousActivity(req, 'INVALID_JWT_TOKEN', { error: error.message });
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صحيح'
      });
    }

    if (error.name === 'TokenExpiredError') {
      logSuspiciousActivity(req, 'EXPIRED_JWT_TOKEN');
      return res.status(401).json({
        success: false,
        message: 'انتهت صلاحية رمز المصادقة'
      });
    }

    console.error('خطأ في المصادقة:', error);
    logSuspiciousActivity(req, 'AUTH_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
};

/**
 * التحقق من الصلاحيات
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'يجب تسجيل الدخول أولاً'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية للوصول لهذا المورد'
      });
    }

    next();
  };
};

/**
 * التحقق من ملكية المورد
 */
const checkOwnership = (resourceModel, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      const resource = await resourceModel.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'المورد غير موجود'
        });
      }

      // التحقق من الملكية أو كون المستخدم admin
      if (resource.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية للوصول لهذا المورد'
        });
      }

      req.resource = resource;
      next();

    } catch (error) {
      console.error('خطأ في التحقق من الملكية:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ داخلي في الخادم'
      });
    }
  };
};

/**
 * Middleware اختياري للمصادقة
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // في حالة الخطأ، نتجاهله ونكمل بدون مستخدم
    next();
  }
};

/**
 * إنشاء رمز مميز محسن
 */
const generateToken = (userId, tokenVersion = null) => {
  const payload = {
    userId,
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomBytes(16).toString('hex') // معرف فريد للرمز
  };

  // إضافة إصدار الرمز إذا كان متوفراً
  if (tokenVersion) {
    payload.tokenVersion = tokenVersion;
  }

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '7d',
      issuer: 'ai-educational-platform',
      audience: 'platform-users'
    }
  );
};

/**
 * إنشاء رمز تحديث محسن
 */
const generateRefreshToken = (userId, tokenVersion = null) => {
  const payload = {
    userId,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomBytes(16).toString('hex')
  };

  if (tokenVersion) {
    payload.tokenVersion = tokenVersion;
  }

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {
      expiresIn: '30d',
      issuer: 'ai-educational-platform',
      audience: 'platform-users'
    }
  );
};

/**
 * التحقق من رمز التحديث
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new Error('نوع الرمز غير صحيح');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('رمز التحديث غير صحيح');
  }
};

/**
 * إبطال جميع الرموز المميزة للمستخدم
 */
const invalidateAllTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (user) {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();
      return true;
    }
    return false;
  } catch (error) {
    console.error('خطأ في إبطال الرموز المميزة:', error);
    return false;
  }
};

/**
 * التحقق من قوة كلمة المرور
 */
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`كلمة المرور يجب أن تكون ${minLength} أحرف على الأقل`);
  }

  if (!hasUpperCase) {
    errors.push('كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل');
  }

  if (!hasLowerCase) {
    errors.push('كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل');
  }

  if (!hasNumbers) {
    errors.push('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل');
  }

  if (!hasSpecialChar) {
    errors.push('كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل');
  }

  return {
    isValid: errors.length === 0,
    errors,
    score: [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar, password.length >= minLength].filter(Boolean).length
  };
};

module.exports = {
  authenticateToken,
  authorize,
  checkOwnership,
  optionalAuth,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  invalidateAllTokens,
  validatePasswordStrength
};
