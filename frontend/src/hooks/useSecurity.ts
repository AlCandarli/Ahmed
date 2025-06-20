/**
 * Security Hook - خطاف الأمان
 */

import { useEffect, useState, useCallback } from 'react';
import { 
  preventClickjacking, 
  isSecureSession, 
  logSecurityEvent,
  clearSensitiveData,
  generateCSRFToken
} from '../utils/security';

interface SecurityState {
  isSecure: boolean;
  csrfToken: string;
  sessionValid: boolean;
}

export const useSecurity = () => {
  const [securityState, setSecurityState] = useState<SecurityState>({
    isSecure: false,
    csrfToken: '',
    sessionValid: false
  });

  // تطبيق إجراءات الأمان الأساسية
  useEffect(() => {
    // منع Clickjacking
    preventClickjacking();

    // التحقق من الجلسة الآمنة
    const secure = isSecureSession();
    
    // إنشاء CSRF Token
    const token = generateCSRFToken();
    
    setSecurityState({
      isSecure: secure,
      csrfToken: token,
      sessionValid: true
    });

    if (!secure) {
      logSecurityEvent('INSECURE_SESSION', { protocol: window.location.protocol });
    }

    // تنظيف البيانات الحساسة عند إغلاق النافذة
    const handleBeforeUnload = () => {
      if (process.env.NODE_ENV === 'production') {
        clearSensitiveData();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // مراقبة تغييرات الأمان
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // الصفحة مخفية - يمكن تطبيق إجراءات أمان إضافية
        logSecurityEvent('PAGE_HIDDEN');
      } else {
        // الصفحة ظاهرة - التحقق من الأمان
        const secure = isSecureSession();
        setSecurityState(prev => ({ ...prev, isSecure: secure }));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // مراقبة محاولات التلاعب بـ DevTools
  useEffect(() => {
    let devtools = false;
    
    const detectDevTools = () => {
      const threshold = 160;
      
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools) {
          devtools = true;
          logSecurityEvent('DEVTOOLS_DETECTED');
          
          if (process.env.NODE_ENV === 'production') {
            // يمكن إضافة إجراءات إضافية هنا
            console.clear();
            console.warn('⚠️ تم اكتشاف أدوات المطور. يرجى عدم التلاعب بالموقع.');
          }
        }
      } else {
        devtools = false;
      }
    };

    const interval = setInterval(detectDevTools, 1000);

    return () => clearInterval(interval);
  }, []);

  // تحديث CSRF Token
  const refreshCSRFToken = useCallback(() => {
    const newToken = generateCSRFToken();
    setSecurityState(prev => ({ ...prev, csrfToken: newToken }));
    return newToken;
  }, []);

  // تنظيف البيانات الحساسة
  const clearSession = useCallback(() => {
    clearSensitiveData();
    setSecurityState(prev => ({ ...prev, sessionValid: false }));
    logSecurityEvent('SESSION_CLEARED');
  }, []);

  // التحقق من صحة الجلسة
  const validateSession = useCallback(() => {
    const secure = isSecureSession();
    const valid = secure && securityState.sessionValid;
    
    setSecurityState(prev => ({ 
      ...prev, 
      isSecure: secure, 
      sessionValid: valid 
    }));
    
    return valid;
  }, [securityState.sessionValid]);

  return {
    ...securityState,
    refreshCSRFToken,
    clearSession,
    validateSession,
    logSecurityEvent
  };
};

/**
 * Hook للحماية من XSS
 */
export const useXSSProtection = () => {
  const sanitizeAndSet = useCallback((setter: (value: string) => void) => {
    return (value: string) => {
      // تنظيف القيمة من XSS
      const sanitized = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
      
      setter(sanitized);
    };
  }, []);

  return { sanitizeAndSet };
};

/**
 * Hook للحماية من CSRF
 */
export const useCSRFProtection = () => {
  const [csrfToken, setCSRFToken] = useState<string>('');

  useEffect(() => {
    // الحصول على CSRF Token من الخادم
    const fetchCSRFToken = async () => {
      try {
        const response = await fetch('/api/csrf-token', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setCSRFToken(data.csrfToken);
        }
      } catch (error) {
        console.error('خطأ في الحصول على CSRF Token:', error);
        logSecurityEvent('CSRF_TOKEN_FETCH_ERROR', error);
      }
    };

    fetchCSRFToken();
  }, []);

  // إضافة CSRF Token للطلبات
  const addCSRFHeader = useCallback((headers: HeadersInit = {}) => {
    return {
      ...headers,
      'X-CSRF-Token': csrfToken
    };
  }, [csrfToken]);

  return { csrfToken, addCSRFHeader };
};

/**
 * Hook لمراقبة الأنشطة المشبوهة
 */
export const useSuspiciousActivityMonitor = () => {
  const [suspiciousActivity, setSuspiciousActivity] = useState<string[]>([]);

  useEffect(() => {
    let rapidClicks = 0;
    let lastClickTime = 0;

    const handleClick = () => {
      const now = Date.now();
      
      if (now - lastClickTime < 100) { // أقل من 100ms بين النقرات
        rapidClicks++;
        
        if (rapidClicks > 10) {
          logSecurityEvent('RAPID_CLICKING_DETECTED', { clicks: rapidClicks });
          setSuspiciousActivity(prev => [...prev, 'RAPID_CLICKING']);
          rapidClicks = 0;
        }
      } else {
        rapidClicks = 0;
      }
      
      lastClickTime = now;
    };

    // مراقبة النقرات السريعة
    document.addEventListener('click', handleClick);

    // مراقبة محاولات النسخ المتكررة
    let copyAttempts = 0;
    const handleCopy = () => {
      copyAttempts++;
      
      if (copyAttempts > 5) {
        logSecurityEvent('EXCESSIVE_COPY_ATTEMPTS', { attempts: copyAttempts });
        setSuspiciousActivity(prev => [...prev, 'EXCESSIVE_COPYING']);
      }
    };

    document.addEventListener('copy', handleCopy);

    // إعادة تعيين العدادات كل دقيقة
    const resetInterval = setInterval(() => {
      copyAttempts = 0;
      setSuspiciousActivity([]);
    }, 60000);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('copy', handleCopy);
      clearInterval(resetInterval);
    };
  }, []);

  return { suspiciousActivity };
};
