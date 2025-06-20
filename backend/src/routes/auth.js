const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User } = require('../models');
const {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  authenticateToken,
  validatePasswordStrength,
  invalidateAllTokens
} = require('../middleware/auth');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');
const {
  checkBruteForce,
  logSuspiciousActivity,
  verifyCSRFToken
} = require('../middleware/security');

const router = express.Router();

/**
 * تسجيل مستخدم جديد
 * POST /api/auth/register
 */
router.post('/register',
  checkBruteForce(req => req.ip, 3, 60 * 60 * 1000), // 3 محاولات كل ساعة لكل IP
  validateUserRegistration,
  async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // التحقق من قوة كلمة المرور
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور غير قوية بما فيه الكفاية',
        errors: passwordValidation.errors
      });
    }

    // التحقق من وجود المستخدم
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logSuspiciousActivity(req, 'REGISTRATION_ATTEMPT_EXISTING_EMAIL', { email });
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مستخدم مسبقاً'
      });
    }

    // إنشاء المستخدم الجديد
    const user = new User({
      name,
      email,
      password, // سيتم تشفيرها تلقائياً في pre-save middleware
      tokenVersion: 0,
      passwordChangedAt: new Date()
    });

    await user.save();

    // إضافة سجل أمني
    await user.addSecurityLog('REGISTRATION_SUCCESS', req, true);

    // إنشاء الرموز المميزة
    const token = generateToken(user._id, user.tokenVersion);
    const refreshToken = generateRefreshToken(user._id, user.tokenVersion);

    // إعادة تعيين Brute Force Protection
    if (req.resetBruteForce) {
      req.resetBruteForce();
    }

    // إرجاع الاستجابة
    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      data: {
        user: user.getPublicProfile(),
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('خطأ في تسجيل المستخدم:', error);
    logSuspiciousActivity(req, 'REGISTRATION_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * تسجيل الدخول
 * POST /api/auth/login
 */
router.post('/login',
  checkBruteForce(req => req.body.email, 5, 15 * 60 * 1000), // 5 محاولات كل 15 دقيقة
  validateUserLogin,
  async (req, res) => {
  try {
    const { email, password } = req.body;

    // البحث عن المستخدم مع كلمة المرور وحقول الأمان
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      logSuspiciousActivity(req, 'LOGIN_ATTEMPT_INVALID_EMAIL', { email });
      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    // التحقق من قفل الحساب
    if (user.isLocked()) {
      logSuspiciousActivity(req, 'LOGIN_ATTEMPT_LOCKED_ACCOUNT', { userId: user._id });
      return res.status(423).json({
        success: false,
        message: 'الحساب مقفل مؤقتاً بسبب محاولات دخول متكررة'
      });
    }

    // التحقق من كلمة المرور
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // زيادة عداد المحاولات الفاشلة
      await user.incLoginAttempts();
      logSuspiciousActivity(req, 'LOGIN_ATTEMPT_INVALID_PASSWORD', { userId: user._id });
      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    // التحقق من تفعيل الحساب
    if (!user.isActive) {
      logSuspiciousActivity(req, 'LOGIN_ATTEMPT_INACTIVE_ACCOUNT', { userId: user._id });
      return res.status(401).json({
        success: false,
        message: 'الحساب غير مفعل'
      });
    }

    // إعادة تعيين محاولات الدخول الفاشلة
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // تحديث آخر تسجيل دخول وآخر نشاط
    user.lastLogin = new Date();
    user.lastActivity = new Date();

    // إضافة سجل أمني
    await user.addSecurityLog('LOGIN_SUCCESS', req, true);
    await user.save();

    // إنشاء الرموز المميزة مع إصدار الرمز
    const token = generateToken(user._id, user.tokenVersion);
    const refreshToken = generateRefreshToken(user._id, user.tokenVersion);

    // إعادة تعيين Brute Force Protection
    if (req.resetBruteForce) {
      req.resetBruteForce();
    }

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: {
        user: user.getPublicProfile(),
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    logSuspiciousActivity(req, 'LOGIN_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * تحديث الرمز المميز
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'رمز التحديث مطلوب'
      });
    }

    // التحقق من رمز التحديث
    const decoded = verifyRefreshToken(refreshToken);
    
    // البحث عن المستخدم
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود أو غير مفعل'
      });
    }

    // إنشاء رموز جديدة
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.json({
      success: true,
      message: 'تم تحديث الرمز المميز بنجاح',
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    console.error('خطأ في تحديث الرمز:', error);
    res.status(401).json({
      success: false,
      message: 'رمز التحديث غير صحيح'
    });
  }
});

/**
 * تسجيل الخروج
 * POST /api/auth/logout
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // في التطبيق الحقيقي، يمكن إضافة الرمز إلى قائمة سوداء
    // أو حفظ معلومات تسجيل الخروج في قاعدة البيانات
    
    res.json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح'
    });

  } catch (error) {
    console.error('خطأ في تسجيل الخروج:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * الحصول على المستخدم الحالي
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('خطأ في الحصول على المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * تحديث الملف الشخصي
 * PUT /api/auth/profile
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, preferences } = req.body;
    const user = req.user;

    // تحديث البيانات المسموحة فقط
    if (name) {
      if (name.length < 2 || name.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'الاسم يجب أن يكون بين 2 و 50 حرف'
        });
      }
      user.name = name;
    }

    if (preferences) {
      if (preferences.language && ['ar', 'en'].includes(preferences.language)) {
        user.preferences.language = preferences.language;
      }
      if (preferences.theme && ['light', 'dark'].includes(preferences.theme)) {
        user.preferences.theme = preferences.theme;
      }
    }

    await user.save();

    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح',
      data: {
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('خطأ في تحديث الملف الشخصي:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * إبطال جميع الرموز المميزة (تسجيل خروج من جميع الأجهزة)
 * POST /api/auth/logout-all
 */
router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    // إبطال جميع الرموز المميزة
    await user.invalidateTokens();

    // إضافة سجل أمني
    await user.addSecurityLog('LOGOUT_ALL_DEVICES', req, true);

    res.json({
      success: true,
      message: 'تم تسجيل الخروج من جميع الأجهزة بنجاح'
    });

  } catch (error) {
    console.error('خطأ في تسجيل الخروج من جميع الأجهزة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * تغيير كلمة المرور
 * PUT /api/auth/change-password
 */
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الحالية والجديدة مطلوبتان'
      });
    }

    // التحقق من قوة كلمة المرور الجديدة
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الجديدة غير قوية بما فيه الكفاية',
        errors: passwordValidation.errors
      });
    }

    // البحث عن المستخدم مع كلمة المرور
    const user = await User.findById(req.user._id).select('+password');
    
    // التحقق من كلمة المرور الحالية
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة'
      });
    }

    // تحديث كلمة المرور وإبطال جميع الرموز المميزة
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.invalidateTokens(); // إبطال جميع الرموز المميزة

    // إضافة سجل أمني
    await user.addSecurityLog('PASSWORD_CHANGED', req, true);

    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح. يرجى تسجيل الدخول مرة أخرى'
    });

  } catch (error) {
    console.error('خطأ في تغيير كلمة المرور:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

module.exports = router;
