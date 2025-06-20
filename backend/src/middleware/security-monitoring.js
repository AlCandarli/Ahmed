/**
 * Security Monitoring and Logging - مراقبة وتسجيل الأمان
 */

const fs = require('fs');
const path = require('path');

/**
 * مستويات الأمان
 */
const SECURITY_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

/**
 * أنواع الأحداث الأمنية
 */
const SECURITY_EVENT_TYPES = {
  // المصادقة والتفويض
  LOGIN_SUCCESS: { level: SECURITY_LEVELS.LOW, description: 'تسجيل دخول ناجح' },
  LOGIN_FAILED: { level: SECURITY_LEVELS.MEDIUM, description: 'فشل تسجيل الدخول' },
  BRUTE_FORCE_ATTEMPT: { level: SECURITY_LEVELS.HIGH, description: 'محاولة هجوم brute force' },
  ACCOUNT_LOCKED: { level: SECURITY_LEVELS.HIGH, description: 'قفل الحساب' },
  INVALID_TOKEN: { level: SECURITY_LEVELS.MEDIUM, description: 'رمز مصادقة غير صحيح' },
  TOKEN_EXPIRED: { level: SECURITY_LEVELS.LOW, description: 'انتهاء صلاحية الرمز' },
  
  // الملفات
  FILE_UPLOAD_SUCCESS: { level: SECURITY_LEVELS.LOW, description: 'رفع ملف ناجح' },
  INVALID_FILE_TYPE: { level: SECURITY_LEVELS.MEDIUM, description: 'نوع ملف غير مسموح' },
  MALICIOUS_FILE_CONTENT: { level: SECURITY_LEVELS.CRITICAL, description: 'محتوى ملف خطير' },
  FILE_SIZE_EXCEEDED: { level: SECURITY_LEVELS.MEDIUM, description: 'تجاوز حجم الملف المسموح' },
  
  // قاعدة البيانات
  INJECTION_ATTEMPT: { level: SECURITY_LEVELS.CRITICAL, description: 'محاولة حقن' },
  INVALID_OBJECT_ID: { level: SECURITY_LEVELS.MEDIUM, description: 'معرف كائن غير صحيح' },
  SENSITIVE_FIELD_ACCESS: { level: SECURITY_LEVELS.HIGH, description: 'محاولة الوصول لحقل حساس' },
  
  // الشبكة والطلبات
  SUSPICIOUS_USER_AGENT: { level: SECURITY_LEVELS.MEDIUM, description: 'User-Agent مشبوه' },
  SUSPICIOUS_PATH_ACCESS: { level: SECURITY_LEVELS.HIGH, description: 'الوصول لمسار مشبوه' },
  RATE_LIMIT_EXCEEDED: { level: SECURITY_LEVELS.MEDIUM, description: 'تجاوز حد الطلبات' },
  INVALID_URL: { level: SECURITY_LEVELS.MEDIUM, description: 'رابط غير صحيح' },
  
  // CSRF وXSS
  CSRF_TOKEN_MISMATCH: { level: SECURITY_LEVELS.HIGH, description: 'عدم تطابق CSRF token' },
  XSS_ATTEMPT: { level: SECURITY_LEVELS.HIGH, description: 'محاولة XSS' },
  
  // عام
  SUSPICIOUS_ACTIVITY: { level: SECURITY_LEVELS.MEDIUM, description: 'نشاط مشبوه' },
  SECURITY_SCAN: { level: SECURITY_LEVELS.LOW, description: 'فحص أمني' }
};

/**
 * إعداد مجلد السجلات
 */
const LOGS_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

/**
 * كتابة سجل أمني
 */
const writeSecurityLog = (event) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...event
  };

  // كتابة في ملف السجل اليومي
  const today = new Date().toISOString().split('T')[0];
  const logFile = path.join(LOGS_DIR, `security-${today}.log`);
  
  const logLine = JSON.stringify(logEntry) + '\n';
  
  fs.appendFile(logFile, logLine, (err) => {
    if (err) {
      console.error('خطأ في كتابة سجل الأمان:', err);
    }
  });

  // طباعة في وحدة التحكم حسب مستوى الخطورة
  const eventType = SECURITY_EVENT_TYPES[event.type];
  if (eventType) {
    const level = eventType.level;
    const message = `🔒 [${level}] ${eventType.description}: ${event.message || ''}`;
    
    switch (level) {
      case SECURITY_LEVELS.CRITICAL:
        console.error(`🚨 ${message}`, event.details);
        break;
      case SECURITY_LEVELS.HIGH:
        console.warn(`⚠️ ${message}`, event.details);
        break;
      case SECURITY_LEVELS.MEDIUM:
        console.warn(`⚡ ${message}`, event.details);
        break;
      default:
        console.log(`ℹ️ ${message}`, event.details);
    }
  }
};

/**
 * تحليل السجلات للكشف عن الأنماط المشبوهة
 */
const analyzeSecurityLogs = () => {
  const today = new Date().toISOString().split('T')[0];
  const logFile = path.join(LOGS_DIR, `security-${today}.log`);
  
  if (!fs.existsSync(logFile)) {
    return;
  }

  try {
    const logContent = fs.readFileSync(logFile, 'utf8');
    const logs = logContent.split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    // تحليل محاولات تسجيل الدخول الفاشلة
    const failedLogins = logs.filter(log => log.type === 'LOGIN_FAILED');
    const failedLoginsByIP = {};
    
    failedLogins.forEach(log => {
      const ip = log.ip;
      if (!failedLoginsByIP[ip]) {
        failedLoginsByIP[ip] = 0;
      }
      failedLoginsByIP[ip]++;
    });

    // تحذير من IPs مع محاولات فاشلة كثيرة
    Object.entries(failedLoginsByIP).forEach(([ip, count]) => {
      if (count >= 10) {
        writeSecurityLog({
          type: 'SUSPICIOUS_ACTIVITY',
          message: `IP مشبوه مع ${count} محاولة دخول فاشلة`,
          ip,
          details: { failedAttempts: count },
          level: SECURITY_LEVELS.HIGH
        });
      }
    });

    // تحليل أنواع الهجمات
    const attackTypes = {};
    logs.forEach(log => {
      if (log.type && SECURITY_EVENT_TYPES[log.type]?.level === SECURITY_LEVELS.CRITICAL) {
        if (!attackTypes[log.type]) {
          attackTypes[log.type] = 0;
        }
        attackTypes[log.type]++;
      }
    });

    // تقرير يومي
    if (Object.keys(attackTypes).length > 0) {
      console.log('📊 تقرير الأمان اليومي:', {
        date: today,
        totalLogs: logs.length,
        failedLogins: failedLogins.length,
        suspiciousIPs: Object.keys(failedLoginsByIP).length,
        attackTypes
      });
    }

  } catch (error) {
    console.error('خطأ في تحليل سجلات الأمان:', error);
  }
};

/**
 * تنظيف السجلات القديمة
 */
const cleanupOldLogs = (retentionDays = 30) => {
  try {
    const files = fs.readdirSync(LOGS_DIR);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    files.forEach(file => {
      if (file.startsWith('security-') && file.endsWith('.log')) {
        const filePath = path.join(LOGS_DIR, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ تم حذف سجل قديم: ${file}`);
        }
      }
    });
  } catch (error) {
    console.error('خطأ في تنظيف السجلات القديمة:', error);
  }
};

/**
 * إنشاء تقرير أمني
 */
const generateSecurityReport = (days = 7) => {
  const report = {
    period: `${days} أيام`,
    startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
    events: {},
    topIPs: {},
    recommendations: []
  };

  try {
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const logFile = path.join(LOGS_DIR, `security-${dateStr}.log`);
      
      if (fs.existsSync(logFile)) {
        const logContent = fs.readFileSync(logFile, 'utf8');
        const logs = logContent.split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line));

        logs.forEach(log => {
          // إحصائيات الأحداث
          if (!report.events[log.type]) {
            report.events[log.type] = 0;
          }
          report.events[log.type]++;

          // إحصائيات IPs
          if (log.ip) {
            if (!report.topIPs[log.ip]) {
              report.topIPs[log.ip] = 0;
            }
            report.topIPs[log.ip]++;
          }
        });
      }
    }

    // توصيات أمنية
    if (report.events.LOGIN_FAILED > 50) {
      report.recommendations.push('تفعيل حماية إضافية ضد brute force attacks');
    }
    
    if (report.events.INJECTION_ATTEMPT > 0) {
      report.recommendations.push('مراجعة وتحسين حماية قاعدة البيانات');
    }
    
    if (report.events.MALICIOUS_FILE_CONTENT > 0) {
      report.recommendations.push('تحسين فحص الملفات المرفوعة');
    }

    return report;
  } catch (error) {
    console.error('خطأ في إنشاء التقرير الأمني:', error);
    return null;
  }
};

/**
 * Middleware لمراقبة الطلبات
 */
const requestMonitoring = (req, res, next) => {
  const startTime = Date.now();
  
  // مراقبة الاستجابة
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    // تسجيل الطلبات البطيئة
    if (duration > 5000) { // أكثر من 5 ثوان
      writeSecurityLog({
        type: 'SUSPICIOUS_ACTIVITY',
        message: 'طلب بطيء',
        ip: req.ip,
        path: req.path,
        method: req.method,
        duration,
        userAgent: req.get('User-Agent'),
        details: { duration, statusCode: res.statusCode }
      });
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// تشغيل تحليل السجلات كل ساعة
setInterval(analyzeSecurityLogs, 60 * 60 * 1000);

// تنظيف السجلات القديمة يومياً
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);

module.exports = {
  writeSecurityLog,
  analyzeSecurityLogs,
  cleanupOldLogs,
  generateSecurityReport,
  requestMonitoring,
  SECURITY_LEVELS,
  SECURITY_EVENT_TYPES
};
