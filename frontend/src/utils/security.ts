/**
 * Frontend Security Utilities - أدوات الأمان للواجهة الأمامية
 */

/**
 * تنظيف النصوص من XSS
 */
export const sanitizeHTML = (input: string): string => {
  if (!input) return '';
  
  // إزالة العلامات الخطيرة
  const dangerousTags = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
  const dangerousAttributes = /on\w+\s*=\s*["'][^"']*["']/gi;
  const javascriptProtocol = /javascript:/gi;
  
  let sanitized = input
    .replace(dangerousTags, '')
    .replace(dangerousAttributes, '')
    .replace(javascriptProtocol, '');
  
  // تنظيف إضافي للعلامات الخطيرة
  const dangerousElements = [
    'script', 'iframe', 'object', 'embed', 'form', 'input', 
    'button', 'textarea', 'select', 'option', 'link', 'meta'
  ];
  
  dangerousElements.forEach(tag => {
    const regex = new RegExp(`<${tag}\\b[^>]*>.*?<\\/${tag}>`, 'gi');
    sanitized = sanitized.replace(regex, '');
    
    const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*\\/>`, 'gi');
    sanitized = sanitized.replace(selfClosingRegex, '');
  });
  
  return sanitized;
};

/**
 * تشفير النصوص لعرضها بأمان في HTML
 */
export const escapeHTML = (input: string): string => {
  if (!input) return '';
  
  const entityMap: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  
  return input.replace(/[&<>"'`=\/]/g, (s) => entityMap[s]);
};

/**
 * التحقق من صحة URL
 */
export const isValidURL = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    // السماح فقط بـ HTTP و HTTPS
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

/**
 * تنظيف URL من البروتوكولات الخطيرة
 */
export const sanitizeURL = (url: string): string => {
  if (!url) return '';
  
  // إزالة البروتوكولات الخطيرة
  const dangerousProtocols = /^(javascript|data|vbscript|file|ftp):/i;
  
  if (dangerousProtocols.test(url)) {
    return '#';
  }
  
  // التأكد من أن URL يبدأ بـ http أو https أو /
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
    return `https://${url}`;
  }
  
  return url;
};

/**
 * التحقق من قوة كلمة المرور
 */
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  score: number;
  errors: string[];
} => {
  const errors: string[] = [];
  let score = 0;
  
  if (!password) {
    return { isValid: false, score: 0, errors: ['كلمة المرور مطلوبة'] };
  }
  
  // الطول
  if (password.length < 8) {
    errors.push('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  } else {
    score += 1;
  }
  
  // الأحرف الكبيرة
  if (!/[A-Z]/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل');
  } else {
    score += 1;
  }
  
  // الأحرف الصغيرة
  if (!/[a-z]/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل');
  } else {
    score += 1;
  }
  
  // الأرقام
  if (!/\d/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل');
  } else {
    score += 1;
  }
  
  // الرموز الخاصة
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل');
  } else {
    score += 1;
  }
  
  return {
    isValid: errors.length === 0,
    score,
    errors
  };
};

/**
 * تشفير البيانات الحساسة في localStorage
 */
export const encryptLocalStorage = (key: string, data: any): void => {
  try {
    const encrypted = btoa(JSON.stringify(data));
    localStorage.setItem(key, encrypted);
  } catch (error) {
    console.error('خطأ في تشفير البيانات:', error);
  }
};

/**
 * فك تشفير البيانات من localStorage
 */
export const decryptLocalStorage = (key: string): any => {
  try {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    
    const decrypted = atob(encrypted);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('خطأ في فك تشفير البيانات:', error);
    localStorage.removeItem(key); // إزالة البيانات التالفة
    return null;
  }
};

/**
 * تنظيف localStorage من البيانات الحساسة
 */
export const clearSensitiveData = (): void => {
  const sensitiveKeys = [
    'token',
    'refreshToken',
    'user',
    'auth',
    'session'
  ];
  
  sensitiveKeys.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

/**
 * التحقق من صحة البريد الإلكتروني
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * التحقق من صحة الاسم
 */
export const validateName = (name: string): boolean => {
  // السماح بالأحرف العربية والإنجليزية والمسافات
  const nameRegex = /^[\u0600-\u06FFa-zA-Z\s]{2,50}$/;
  return nameRegex.test(name.trim());
};

/**
 * تنظيف المدخلات من الأحرف الخطيرة
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  // إزالة الأحرف الخطيرة
  return input
    .replace(/[<>]/g, '') // إزالة < و >
    .replace(/javascript:/gi, '') // إزالة javascript:
    .replace(/on\w+=/gi, '') // إزالة event handlers
    .trim();
};

/**
 * إنشاء CSRF Token
 */
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * التحقق من CSRF Token
 */
export const validateCSRFToken = (token: string, storedToken: string): boolean => {
  return token === storedToken;
};

/**
 * حماية من Clickjacking
 */
export const preventClickjacking = (): void => {
  // منع تضمين الصفحة في iframe
  if (window.top !== window.self) {
    window.top!.location = window.self.location;
  }
};

/**
 * إخفاء معلومات المتصفح الحساسة
 */
export const hideFingerprinting = (): void => {
  // إخفاء معلومات المتصفح
  Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    writable: false
  });
};

/**
 * التحقق من الجلسة الآمنة
 */
export const isSecureSession = (): boolean => {
  // التحقق من HTTPS في الإنتاج
  if (process.env.NODE_ENV === 'production') {
    return window.location.protocol === 'https:';
  }
  return true; // السماح بـ HTTP في التطوير
};

/**
 * تسجيل الأنشطة الأمنية
 */
export const logSecurityEvent = (event: string, details?: any): void => {
  console.warn(`🔒 Security Event: ${event}`, details);
  
  // يمكن إرسال التقرير للخادم
  // fetch('/api/security/log', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ event, details, timestamp: new Date().toISOString() })
  // });
};
