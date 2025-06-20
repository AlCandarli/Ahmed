/**
 * File Upload Security Middleware - حماية رفع الملفات
 */

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { logSuspiciousActivity } = require('./security');

/**
 * أنواع الملفات المسموحة
 */
const ALLOWED_FILE_TYPES = {
  documents: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  presentations: ['.ppt', '.pptx'],
  spreadsheets: ['.xls', '.xlsx'],
  archives: ['.zip', '.rar']
};

/**
 * الحد الأقصى لحجم الملف (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * أنواع MIME المسموحة
 */
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/rtf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-rar-compressed'
];

/**
 * أنماط الملفات الخطيرة
 */
const DANGEROUS_PATTERNS = [
  /\.exe$/i,
  /\.bat$/i,
  /\.cmd$/i,
  /\.com$/i,
  /\.scr$/i,
  /\.pif$/i,
  /\.vbs$/i,
  /\.js$/i,
  /\.jar$/i,
  /\.php$/i,
  /\.asp$/i,
  /\.jsp$/i,
  /\.sh$/i,
  /\.py$/i,
  /\.pl$/i,
  /\.rb$/i
];

/**
 * إنشاء اسم ملف آمن
 */
const generateSecureFilename = (originalname) => {
  const ext = path.extname(originalname).toLowerCase();
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  return `${timestamp}_${randomBytes}${ext}`;
};

/**
 * التحقق من نوع الملف
 */
const validateFileType = (filename, mimetype) => {
  const ext = path.extname(filename).toLowerCase();
  
  // فحص الامتدادات الخطيرة
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(filename)) {
      return false;
    }
  }
  
  // فحص الامتدادات المسموحة
  const allAllowedExtensions = Object.values(ALLOWED_FILE_TYPES).flat();
  if (!allAllowedExtensions.includes(ext)) {
    return false;
  }
  
  // فحص MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
    return false;
  }
  
  return true;
};

/**
 * فحص محتوى الملف للتأكد من عدم وجود محتوى خطير
 */
const scanFileContent = async (filepath) => {
  try {
    const buffer = fs.readFileSync(filepath);
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024)); // فحص أول 1KB
    
    // أنماط خطيرة في المحتوى
    const dangerousPatterns = [
      /<script/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload=/gi,
      /onerror=/gi,
      /onclick=/gi,
      /eval\(/gi,
      /document\.write/gi,
      /window\.location/gi,
      /\.exe/gi,
      /cmd\.exe/gi,
      /powershell/gi
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('خطأ في فحص محتوى الملف:', error);
    return false;
  }
};

/**
 * إعداد Multer للرفع الآمن
 */
const createSecureUpload = (uploadPath = 'uploads') => {
  // إنشاء مجلد الرفع إذا لم يكن موجوداً
  const fullUploadPath = path.join(process.cwd(), uploadPath);
  if (!fs.existsSync(fullUploadPath)) {
    fs.mkdirSync(fullUploadPath, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, fullUploadPath);
    },
    filename: (req, file, cb) => {
      const secureFilename = generateSecureFilename(file.originalname);
      cb(null, secureFilename);
    }
  });

  const fileFilter = (req, file, cb) => {
    // تسجيل محاولة الرفع
    console.log(`📁 محاولة رفع ملف: ${file.originalname} (${file.mimetype})`);
    
    // التحقق من نوع الملف
    if (!validateFileType(file.originalname, file.mimetype)) {
      logSuspiciousActivity(req, 'INVALID_FILE_TYPE_UPLOAD', {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      });
      
      const error = new Error('نوع الملف غير مسموح');
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }
    
    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 5, // حد أقصى 5 ملفات
      fields: 10, // حد أقصى 10 حقول
      fieldNameSize: 100, // حد أقصى لطول اسم الحقل
      fieldSize: 1024 * 1024 // حد أقصى لحجم الحقل (1MB)
    }
  });
};

/**
 * Middleware للتحقق من الملف بعد الرفع
 */
const postUploadValidation = async (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }

  const files = req.files || [req.file];
  
  for (const file of files) {
    if (!file) continue;
    
    try {
      // فحص محتوى الملف
      const isContentSafe = await scanFileContent(file.path);
      
      if (!isContentSafe) {
        // حذف الملف الخطير
        fs.unlinkSync(file.path);
        
        logSuspiciousActivity(req, 'MALICIOUS_FILE_CONTENT', {
          filename: file.originalname,
          path: file.path
        });
        
        return res.status(400).json({
          success: false,
          message: 'تم اكتشاف محتوى خطير في الملف'
        });
      }
      
      // إضافة معلومات أمنية للملف
      file.securityScan = {
        scannedAt: new Date().toISOString(),
        isClean: true,
        scanVersion: '1.0'
      };
      
    } catch (error) {
      console.error('خطأ في فحص الملف:', error);
      
      // حذف الملف في حالة الخطأ
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
      return res.status(500).json({
        success: false,
        message: 'خطأ في فحص الملف'
      });
    }
  }
  
  next();
};

/**
 * تنظيف الملفات القديمة
 */
const cleanupOldFiles = (uploadPath = 'uploads', maxAge = 24 * 60 * 60 * 1000) => {
  const fullUploadPath = path.join(process.cwd(), uploadPath);
  
  if (!fs.existsSync(fullUploadPath)) {
    return;
  }
  
  fs.readdir(fullUploadPath, (err, files) => {
    if (err) {
      console.error('خطأ في قراءة مجلد الرفع:', err);
      return;
    }
    
    const now = Date.now();
    
    files.forEach(file => {
      const filePath = path.join(fullUploadPath, file);
      
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        
        const fileAge = now - stats.mtime.getTime();
        
        if (fileAge > maxAge) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error('خطأ في حذف الملف القديم:', err);
            } else {
              console.log(`🗑️ تم حذف الملف القديم: ${file}`);
            }
          });
        }
      });
    });
  });
};

// تشغيل تنظيف الملفات كل ساعة
setInterval(() => {
  cleanupOldFiles();
}, 60 * 60 * 1000);

module.exports = {
  createSecureUpload,
  postUploadValidation,
  validateFileType,
  cleanupOldFiles,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE
};
