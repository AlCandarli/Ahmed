const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

// استيراد middleware الأمان المحسن
const {
  rateLimiters,
  addCSRFToken,
  suspiciousActivityDetector,
  checkBruteForce
} = require('./middleware/security');

// استيراد مراقبة الأمان
const { requestMonitoring } = require('./middleware/security-monitoring');

// استيراد حماية قاعدة البيانات
const {
  sanitizeInput,
  limitQuerySize,
  preventComplexQueries,
  protectFromRegexDOS,
  limitResults,
  protectSensitiveFields
} = require('./middleware/database-security');

// استيراد إعداد قاعدة البيانات
const databaseConfig = require('./config/database');

// إنشاء تطبيق Express
const app = express();

/**
 * إعداد Middleware الأمان
 */
// Helmet للأمان المحسن
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: process.env.NODE_ENV === 'production'
        ? ["'self'"]
        : ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // للتطوير فقط
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://openrouter.ai", "https://api.openai.com", "wss:", "ws:"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"], // منع تضمين الصفحة في iframe
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  permittedCrossDomainPolicies: false,
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true
}));

// إضافة Security Headers إضافية
app.use((req, res, next) => {
  // منع MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // منع تضمين الصفحة في iframe
  res.setHeader('X-Frame-Options', 'DENY');

  // تفعيل XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // منع تسريب المعلومات في Referrer
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // تحديد الصلاحيات المسموحة
  res.setHeader('Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );

  // منع تخزين الصفحة في cache للصفحات الحساسة
  if (req.path.includes('/auth') || req.path.includes('/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }

  // إضافة معرف فريد للطلب للتتبع
  req.requestId = require('crypto').randomBytes(16).toString('hex');
  res.setHeader('X-Request-ID', req.requestId);

  next();
});

// CORS
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    process.env.ADMIN_URL || 'http://localhost:3001'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate Limiting المحسن
app.use('/api/', rateLimiters.general);
app.use('/api/auth/login', rateLimiters.auth);
app.use('/api/auth/register', rateLimiters.register);
app.use('/api/auth/forgot-password', rateLimiters.passwordReset);
app.use('/api/files/upload', rateLimiters.upload);
app.use('/api/lectures/chat', rateLimiters.ai);
app.use('/api/questions/generate', rateLimiters.ai);
app.use('/api/reports/generate', rateLimiters.ai);

// Data sanitization ضد NoSQL injection
app.use(mongoSanitize());

// منع HTTP Parameter Pollution
app.use(hpp());

// ضغط الاستجابات
app.use(compression());

// Session management آمن
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-super-secret-session-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'
  },
  name: 'sessionId' // تغيير اسم الكوكي الافتراضي
}));

// إضافة CSRF Token
app.use(addCSRFToken);

// كشف الأنشطة المشبوهة
app.use(suspiciousActivityDetector);

// مراقبة الطلبات
app.use(requestMonitoring);

// حماية قاعدة البيانات
app.use(sanitizeInput);
app.use(limitQuerySize());
app.use(preventComplexQueries);
app.use(protectFromRegexDOS);
app.use(protectSensitiveFields);
app.use('/api/', limitResults());

/**
 * إعداد Middleware العام
 */
// Body parsing
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

/**
 * الصحة والمعلومات
 */
// Health check endpoint
app.get('/health', (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: new Date().toISOString(),
    database: databaseConfig.isConnected() ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development'
  };

  res.status(200).json(healthCheck);
});

// CSRF Token endpoint
app.get('/api/csrf-token', (req, res) => {
  res.json({
    success: true,
    csrfToken: res.locals.csrfToken
  });
});

// Security Report endpoint (للمشرفين فقط)
app.get('/api/security/report', (req, res) => {
  // يجب إضافة middleware للتحقق من صلاحيات المشرف
  const { generateSecurityReport } = require('./middleware/security-monitoring');

  const days = parseInt(req.query.days) || 7;
  const report = generateSecurityReport(days);

  if (report) {
    res.json({
      success: true,
      data: report
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء التقرير الأمني'
    });
  }
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'AI Educational Platform API',
    version: '1.0.0',
    description: 'Backend API for AI Educational Platform',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth',
      users: '/api/users',
      lectures: '/api/lectures',
      questions: '/api/questions',
      tasks: '/api/tasks',
      reports: '/api/reports',
      analytics: '/api/analytics'
    },
    database: databaseConfig.getConnectionInfo()
  });
});

/**
 * Routes
 */
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/lectures', require('./routes/lectures'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/statistics', require('./routes/statistics'));
app.use('/api/data', require('./routes/data-collection'));
app.use('/api/chats', require('./routes/chats'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/results', require('./routes/results'));
app.use('/api/files', require('./routes/files'));

// Data Analytics Routes - New
app.use('/api/lecture-chats', require('./routes/lectureChats'));
app.use('/api/quiz-results', require('./routes/quizResults'));
app.use('/api/task-progress', require('./routes/taskProgress'));

/**
 * معالجة الأخطاء
 */
// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'المسار غير موجود',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('خطأ في الخادم:', err);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'خطأ في التحقق من البيانات',
      errors
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} موجود مسبقاً`
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'رمز المصادقة غير صحيح'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'انتهت صلاحية رمز المصادقة'
    });
  }
  
  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'خطأ داخلي في الخادم',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

/**
 * بدء الخادم
 */
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // محاولة الاتصال بقاعدة البيانات
    console.log('🔄 بدء الاتصال بقاعدة البيانات...');
    const dbConnected = await databaseConfig.connect();

    // بدء الخادم سواء نجح الاتصال بقاعدة البيانات أم لا
    const server = app.listen(PORT, () => {
      console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
      console.log(`🌐 البيئة: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 Health Check: http://localhost:${PORT}/health`);
      console.log(`📋 API Info: http://localhost:${PORT}/api`);

      if (dbConnected) {
        console.log(`✅ النظام جاهز مع قاعدة البيانات MongoDB Atlas`);
      } else {
        console.log(`⚠️ النظام يعمل بدون قاعدة البيانات - بعض الوظائف قد لا تعمل`);
        console.log(`💡 يمكنك إعادة تشغيل الخادم عند إصلاح مشكلة قاعدة البيانات`);
      }
    });

    // معالجة إغلاق الخادم بشكل صحيح
    process.on('SIGTERM', () => {
      console.log('🔄 تم استلام SIGTERM، إغلاق الخادم...');
      server.close(async () => {
        console.log('🔌 تم إغلاق الخادم');
        if (dbConnected) {
          await databaseConfig.disconnect();
        }
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('🔄 تم استلام SIGINT، إغلاق الخادم...');
      server.close(async () => {
        console.log('🔌 تم إغلاق الخادم');
        if (dbConnected) {
          await databaseConfig.disconnect();
        }
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ فشل في بدء الخادم:', error.message);
    process.exit(1);
  }
}

// بدء الخادم
startServer();

module.exports = app;
