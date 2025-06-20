import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, Mail, Lock, User, Globe, Moon, Sun,
  ArrowRight, ArrowLeft, Users, BookOpen, Award, TrendingUp,
  Sparkles, GraduationCap, Brain, Trophy
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { StudentsGraphic, CoursesGraphic, SuccessRateGraphic, RatingGraphic } from '../Graphics/StatGraphics';
import logoImage from '../Layout/1000053862.png';
import './AuthPage.css';
import '../Graphics/StatGraphics.css';

interface AuthPageProps {
  onLogin: (user: any) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const { state, login, register, toggleTheme, toggleLanguage } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showInspiration, setShowInspiration] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    confirmPassword: ''
  });

  // استخدام الحالة من Context
  const isLoading = state.isLoading;
  const error = state.error;
  const language = state.preferences.language;
  const isDarkMode = state.preferences.theme === 'dark';
  const [success, setSuccess] = useState('');



  // Statistics data with graphics
  const inspirationCards = [
    {
      icon: Brain,
      title: language === 'ar' ? 'تعلم بذكاء' : 'Learn Smart',
      description: language === 'ar'
        ? 'استخدم قوة الذكاء الاصطناعي لتحليل أدائك وتقديم توصيات مخصصة لك'
        : 'Use AI power to analyze your performance and provide personalized recommendations',
      highlight: language === 'ar' ? '5 نماذج ذكية متقدمة' : '5 Advanced AI Models',
      graphic: StudentsGraphic
    },
    {
      icon: Sparkles,
      title: language === 'ar' ? 'تجربة مخصصة' : 'Personalized Experience',
      description: language === 'ar'
        ? 'كل محتوى يتكيف مع مستواك وأسلوب تعلمك لضمان أفضل النتائج'
        : 'Every content adapts to your level and learning style for optimal results',
      highlight: language === 'ar' ? 'تكيف ذكي 100%' : '100% Smart Adaptation',
      graphic: CoursesGraphic
    },
    {
      icon: Trophy,
      title: language === 'ar' ? 'حقق إنجازاتك' : 'Achieve Your Goals',
      description: language === 'ar'
        ? 'تتبع تقدمك واحصل على شهادات وإنجازات تعكس مهاراتك المتطورة'
        : 'Track your progress and earn certificates and achievements reflecting your skills',
      highlight: language === 'ar' ? 'إنجازات لا محدودة' : 'Unlimited Achievements',
      graphic: SuccessRateGraphic
    }
  ];

  // Track scroll progress and show stats progressively
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollY / documentHeight) * 100;

      setScrollProgress(Math.min(progress, 100));

      // Show inspiration when user scrolls down a bit
      if (scrollY > 50) {
        setShowInspiration(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const translations = {
    ar: {
      welcome: 'مرحباً بك في',
      platformName: '  R.I.S.E',
      subtitle: 'اكتشف عالماً جديداً من التعلم التفاعلي والذكي',
      login: 'تسجيل الدخول',
      signup: 'حساب جديد',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      confirmPassword: 'تأكيد كلمة المرور',
      displayName: 'الاسم الكامل',
      loginButton: 'دخول',
      signupButton: 'إنشاء حساب',
      forgotPassword: 'نسيت كلمة المرور؟',
      loading: 'جاري التحميل...',
      statsTitle: 'إحصائيات المنصة'
    },
    en: {
      welcome: 'Welcome to',
      platformName: 'R.I.S.E',
      subtitle: 'Discover a new world of interactive and intelligent learning',
      login: 'Sign In',
      signup: 'Sign Up',
      email: 'Email Address',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      displayName: 'Full Name',
      loginButton: 'Sign In',
      signupButton: 'Create Account',
      forgotPassword: 'Forgot password?',
      loading: 'Loading...',
      statsTitle: 'Platform Statistics'
    }
  };

  const t = translations[language];

  // دالة لتحديث الخطأ
  const setError = (message: string) => {
    // لا نحتاج لفعل شيء - الخطأ يأتي من Context
    console.log('❌ خطأ:', message);
  };

  // دالة تسجيل الدخول والتسجيل
  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🚀 handleSubmit تم استدعاؤها!');
    e.preventDefault();

    setSuccess('');

    console.log('📝 البيانات المدخلة:', formData);
    console.log('🔐 نوع العملية:', isLogin ? 'تسجيل دخول' : 'إنشاء حساب');

    // التحقق من البيانات
    if (!formData.email || !formData.password) {
      console.log('❌ حقول مطلوبة فارغة');
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (!isLogin && !formData.displayName) {
      console.log('❌ الاسم مطلوب للتسجيل');
      setError('يرجى إدخال الاسم');
      return;
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      console.log('❌ كلمات المرور غير متطابقة');
      setError('كلمات المرور غير متطابقة');
      return;
    }

    console.log('✅ تم اجتياز جميع التحققات');

    try {
      let success = false;

      if (isLogin) {
        console.log('🔑 محاولة تسجيل الدخول...');
        success = await login(formData.email, formData.password);
      } else {
        console.log('📝 محاولة إنشاء حساب...');
        success = await register({
          name: formData.displayName,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword
        });
      }

      console.log('📊 نتيجة العملية:', success);

      if (success) {
        console.log('✅ نجحت العملية - سيتم التوجيه تلقائياً');

        // إظهار رسالة نجاح
        setSuccess(isLogin ? 'تم تسجيل الدخول بنجاح! جاري التوجيه...' : 'تم إنشاء الحساب بنجاح! جاري التوجيه...');

        // لا نحتاج لاستدعاء onLogin - التوجيه سيحدث تلقائياً
        // عندما تتغير حالة المصادقة في AppContext
        console.log('🔄 التوجيه سيحدث تلقائياً عبر useEffect في App.tsx');
      } else {
        console.log('❌ فشلت العملية');
        setError(isLogin ? 'بيانات تسجيل الدخول غير صحيحة' : 'فشل في إنشاء الحساب');
      }
    } catch (error) {
      console.error('💥 خطأ في الاتصال:', error);
      setError('حدث خطأ في الاتصال');
    }
  };



  // دالة نسيان كلمة المرور البسيطة
  const handleForgotPassword = async () => {
    // محاكاة تأخير الشبكة
    await new Promise(resolve => setTimeout(resolve, 800));

    setSuccess(language === 'ar' ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني' : 'Password reset link sent to your email');
  };

  // دالة التمرير السلس للأسفل
  const scrollToInspiration = () => {
    const inspirationSection = document.querySelector('.inspiration-section-vertical');
    if (inspirationSection) {
      inspirationSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    } else {
      // إذا لم تكن الـ section ظاهرة بعد، مرر لأسفل الصفحة
      window.scrollTo({
        top: window.innerHeight,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div
      className={`auth-page ${isDarkMode ? 'dark' : 'light'}`}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Scroll Progress Bar */}
      <motion.div
        className="scroll-progress"
        style={{ scaleX: scrollProgress / 100 }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: scrollProgress / 100 }}
        transition={{ duration: 0.1 }}
      />
      {/* Main Container */}
      <div className="auth-main-container">
        {/* Left Side - Form Box */}
        <motion.div
          className={`form-section ${language === 'ar' ? 'form-right' : 'form-left'}`}
          initial={{ opacity: 0, x: language === 'ar' ? 100 : -100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="form-container">
            {/* Form Header */}
            <div className="form-header">
              <motion.h1
                className="form-title"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {isLogin ? t.login : t.signup}
              </motion.h1>
            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation">
              <motion.button
                className={`tab-btn ${isLogin ? 'active' : ''}`}
                onClick={() => {
                  setIsLogin(true);
                  setSuccess('');
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {t.login}
              </motion.button>
              <motion.button
                className={`tab-btn ${!isLogin ? 'active' : ''}`}
                onClick={() => {
                  setIsLogin(false);
                  setSuccess('');
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {t.signup}
              </motion.button>
            </div>

            {/* Error/Success Messages */}
            <AnimatePresence>
              {error && (
                <motion.div
                  className="message error-message"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  className="message success-message"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <AnimatePresence mode="wait">
              <motion.form
                key={isLogin ? 'login' : 'signup'}
                className="auth-form"
                onSubmit={(e) => {
                  console.log('📝 تم إرسال النموذج');
                  handleSubmit(e);
                }}
                initial={{ opacity: 0, x: language === 'ar' ? 50 : -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: language === 'ar' ? -50 : 50 }}
                transition={{ duration: 0.3 }}
              >
                {/* Display Name (Signup only) */}
                <AnimatePresence>
                  {!isLogin && (
                    <motion.div
                      className="input-group"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="input-wrapper">
                        <User className="input-icon" size={20} />
                        <input
                          type="text"
                          placeholder={t.displayName}
                          value={formData.displayName}
                          onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                          className="form-input"
                          required={!isLogin}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email */}
                <div className="input-group">
                  <div className="input-wrapper">
                    <Mail className="input-icon" size={20} />
                    <input
                      type="email"
                      placeholder={t.email}
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="input-group">
                  <div className="input-wrapper">
                    <Lock className="input-icon" size={20} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t.password}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="form-input"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="password-toggle"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password (Signup only) */}
                <AnimatePresence>
                  {!isLogin && (
                    <motion.div
                      className="input-group"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="input-wrapper">
                        <Lock className="input-icon" size={20} />
                        <input
                          type="password"
                          placeholder={t.confirmPassword}
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                          className="form-input"
                          required={!isLogin}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className="submit-btn"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    console.log('🔘 تم النقر على الزر');
                    console.log('⏳ حالة التحميل:', isLoading);
                    console.log('🔒 الزر معطل؟', isLoading);
                  }}
                >
                  {isLoading ? (
                    <div className="loading-content">
                      <div className="spinner"></div>
                      <span>{t.loading}</span>
                    </div>
                  ) : (
                    <div className="btn-content">
                      <span>{isLogin ? t.loginButton : t.signupButton}</span>
                      {language === 'ar' ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
                    </div>
                  )}
                </motion.button>

                {/* Forgot Password (Login only) */}
                {isLogin && (
                  <motion.button
                    type="button"
                    className="forgot-btn"
                    onClick={handleForgotPassword}
                    disabled={isLoading}
                    whileHover={{ scale: 1.02 }}
                  >
                    {t.forgotPassword}
                  </motion.button>
                )}


              </motion.form>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Right Side - Logo and Message */}
        <motion.div
          className={`logo-section ${language === 'ar' ? 'logo-left' : 'logo-right'}`}
          initial={{ opacity: 0, x: language === 'ar' ? -100 : 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        >
          {/* Top Controls */}
          <div className="top-controls">
            <motion.button
              className="control-btn"
              onClick={toggleTheme}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </motion.button>

            <motion.button
              className="control-btn"
              onClick={toggleLanguage}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Globe size={18} />
            </motion.button>
          </div>

          {/* Logo and Content */}
          <div className="logo-content">
            <motion.div
              className="logo-container"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, delay: 0.5, type: "spring" }}
            >
              <div className="logo-icon">
                <div className="auth-logo-circle">
                  <img src={logoImage} alt="R.I.S.E Logo" className="auth-logo-image" />
                </div>
                <Sparkles className="sparkle-1" size={20} />
                <Sparkles className="sparkle-2" size={16} />
                <Sparkles className="sparkle-3" size={18} />
              </div>
            </motion.div>

            <motion.div
              className="welcome-message"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <h1 className="welcome-title">
                {t.welcome}
                <br />
                <span className="platform-name">{t.platformName}</span>
              </h1>
              <p className="welcome-subtitle">
                {t.subtitle}
              </p>
            </motion.div>

            {/* Floating Elements */}
            <div className="floating-elements">
              <div className="floating-circle circle-1"></div>
              <div className="floating-circle circle-2"></div>
              <div className="floating-circle circle-3"></div>
              <div className="floating-square square-1"></div>
              <div className="floating-square square-2"></div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Inspiration Section - Beautiful Text with Graphics */}
      <AnimatePresence>
        {showInspiration && (
          <div className="inspiration-section-vertical">
            <motion.div
              className="inspiration-container-vertical"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.h2
                className="inspiration-title-vertical"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
              >
                {language === 'ar' ? 'اكتشف قوة التعلم الذكي' : 'Discover the Power of Smart Learning'}
              </motion.h2>

              <div className="inspiration-list-vertical">
                {inspirationCards.map((card, index) => (
                  <motion.div
                    key={index}
                    className="inspiration-card-vertical"
                    initial={{
                      opacity: 0,
                      y: 100,
                      scale: 0.8
                    }}
                    whileInView={{
                      opacity: 1,
                      y: 0,
                      scale: 1
                    }}
                    transition={{
                      delay: index * 0.3,
                      duration: 0.8,
                      ease: "easeOut",
                      type: "spring",
                      stiffness: 100
                    }}
                    whileHover={{
                      scale: 1.02,
                      y: -5,
                      transition: { duration: 0.3 }
                    }}
                    viewport={{ once: true, margin: "-50px" }}
                  >
                    <div className="inspiration-icon-vertical">
                      <card.icon size={40} />
                    </div>

                    <div className="inspiration-content-vertical">
                      <div className="inspiration-title-card">{card.title}</div>
                      <div className="inspiration-description">{card.description}</div>
                      <div className="inspiration-highlight">{card.highlight}</div>
                    </div>

                    <div className="inspiration-graphic-container">
                      <card.graphic />
                    </div>

                    <div className="inspiration-decoration"></div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Extra Content to Enable Scrolling */}
      <div className="extra-content">
        <div className="scroll-indicator">
          <motion.div
            className="scroll-text"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.4 }}
          >
            {language === 'ar' ? 'مرر للأسفل لاستكشاف المزيد' : 'Scroll down to explore more'}
          </motion.div>
          <motion.div
            className="scroll-arrow"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              y: [0, 8, 0]
            }}
            transition={{
              opacity: { delay: 1.7, duration: 0.3 },
              y: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
            }}
            onClick={scrollToInspiration}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          >
            ↓
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
