/**
 * Security Middleware - طبقات الحماية الأمنية
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const crypto = require('crypto');

/**
 * إعداد CORS آمن
 */
const setupCORS = () => {
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    process.env.ADMIN_URL || 'http://localhost:3001',
    'http://localhost:3000', // للتطوير
  ];

  return cors({
    origin: function (origin, callback) {
      // السماح للطلبات بدون origin (مثل mobile apps)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`🚫 CORS blocked origin: ${origin}`);
        callback(new Error('غير مسموح بواسطة CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-CSRF-Token',
      'X-API-Key'
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400 // 24 hours
  });
};

/**
 * إعداد Rate Limiting متقدم
 */
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100, message = 'تم تجاوز الحد الأقصى للطلبات') => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(`🚫 Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
      res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    },
    skip: (req) => {
      // تخطي Rate limiting للـ health checks
      return req.path === '/health' || req.path === '/api/health';
    }
  });
};

/**
 * Rate limiters مختلفة للـ endpoints المختلفة
 */
const rateLimiters = {
  // عام - 100 طلب كل 15 دقيقة
  general: createRateLimiter(15 * 60 * 1000, 100),
  
  // تسجيل الدخول - 5 محاولات كل 15 دقيقة
  auth: createRateLimiter(15 * 60 * 1000, 5, 'تم تجاوز الحد الأقصى لمحاولات تسجيل الدخول'),
  
  // إنشاء الحساب - 3 محاولات كل ساعة
  register: createRateLimiter(60 * 60 * 1000, 3, 'تم تجاوز الحد الأقصى لإنشاء الحسابات'),
  
  // رفع الملفات - 10 ملفات كل ساعة
  upload: createRateLimiter(60 * 60 * 1000, 10, 'تم تجاوز الحد الأقصى لرفع الملفات'),
  
  // AI API - 50 طلب كل ساعة
  ai: createRateLimiter(60 * 60 * 1000, 50, 'تم تجاوز الحد الأقصى لطلبات الذكاء الاصطناعي'),
  
  // إعادة تعيين كلمة المرور - 3 محاولات كل ساعة
  passwordReset: createRateLimiter(60 * 60 * 1000, 3, 'تم تجاوز الحد الأقصى لطلبات إعادة تعيين كلمة المرور')
};

/**
 * إعداد Helmet للحماية من الهجمات الشائعة
 */
const setupHelmet = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "https://openrouter.ai", "https://api.openai.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // للسماح بـ external APIs
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  });
};

/**
 * تنظيف البيانات من MongoDB Injection
 */
const setupMongoSanitize = () => {
  return mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`🚫 MongoDB injection attempt detected: ${key} from IP: ${req.ip}`);
    }
  });
};

/**
 * حماية من XSS
 */
const setupXSSProtection = () => {
  return xss();
};

/**
 * حماية من HTTP Parameter Pollution
 */
const setupHPPProtection = () => {
  return hpp({
    whitelist: ['sort', 'fields', 'page', 'limit', 'category', 'difficulty', 'language']
  });
};

/**
 * إنشاء CSRF Token
 */
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * التحقق من CSRF Token
 */
const verifyCSRFToken = (req, res, next) => {
  // تخطي CSRF للـ GET requests
  if (req.method === 'GET') {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    console.warn(`🚫 CSRF token mismatch from IP: ${req.ip}`);
    return res.status(403).json({
      success: false,
      message: 'رمز CSRF غير صحيح'
    });
  }

  next();
};

/**
 * إضافة CSRF Token للجلسة
 */
const addCSRFToken = (req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCSRFToken();
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
};

/**
 * تسجيل الأنشطة المشبوهة
 */
const logSuspiciousActivity = (req, type, details = {}) => {
  const { writeSecurityLog } = require('./security-monitoring');

  const logData = {
    type,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.path,
    method: req.method,
    message: details.message || '',
    details
  };

  writeSecurityLog(logData);
};

/**
 * فحص IP للأنشطة المشبوهة
 */
const suspiciousActivityDetector = (req, res, next) => {
  const ip = req.ip;
  const userAgent = req.get('User-Agent');

  // فحص User-Agent مشبوه
  const suspiciousUserAgents = [
    'sqlmap',
    'nikto',
    'nmap',
    'masscan',
    'curl', // يمكن إزالته في الإنتاج
    'wget',
    'python-requests'
  ];

  if (userAgent && suspiciousUserAgents.some(agent => 
    userAgent.toLowerCase().includes(agent.toLowerCase())
  )) {
    logSuspiciousActivity(req, 'SUSPICIOUS_USER_AGENT', { userAgent });
  }

  // فحص محاولات الوصول لمسارات مشبوهة
  const suspiciousPaths = [
    '/admin',
    '/wp-admin',
    '/phpmyadmin',
    '/.env',
    '/config',
    '/backup',
    '/sql',
    '/database'
  ];

  if (suspiciousPaths.some(path => req.path.toLowerCase().includes(path))) {
    logSuspiciousActivity(req, 'SUSPICIOUS_PATH_ACCESS', { path: req.path });
  }

  next();
};

/**
 * حماية من Brute Force
 */
const bruteForceProtection = new Map();

const checkBruteForce = (identifier, maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const now = Date.now();
    const attempts = bruteForceProtection.get(identifier) || { count: 0, firstAttempt: now };

    // إعادة تعيين العداد إذا انتهت النافزة الزمنية
    if (now - attempts.firstAttempt > windowMs) {
      attempts.count = 0;
      attempts.firstAttempt = now;
    }

    if (attempts.count >= maxAttempts) {
      const remainingTime = Math.ceil((windowMs - (now - attempts.firstAttempt)) / 1000);
      logSuspiciousActivity(req, 'BRUTE_FORCE_ATTEMPT', { identifier, attempts: attempts.count });
      
      return res.status(429).json({
        success: false,
        message: `تم حظر الوصول مؤقتاً بسبب محاولات متكررة. المحاولة مرة أخرى خلال ${remainingTime} ثانية`,
        retryAfter: remainingTime
      });
    }

    // زيادة العداد
    attempts.count++;
    bruteForceProtection.set(identifier, attempts);

    // إضافة دالة لإعادة تعيين العداد عند النجاح
    req.resetBruteForce = () => {
      bruteForceProtection.delete(identifier);
    };

    next();
  };
};

module.exports = {
  setupCORS,
  rateLimiters,
  setupHelmet,
  setupMongoSanitize,
  setupXSSProtection,
  setupHPPProtection,
  verifyCSRFToken,
  addCSRFToken,
  generateCSRFToken,
  logSuspiciousActivity,
  suspiciousActivityDetector,
  checkBruteForce
};
