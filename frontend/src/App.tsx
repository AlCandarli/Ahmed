import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from './contexts/AppContext';
import AuthPage from './components/Auth/AuthPage';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import LecturesSimple from './components/Sections/LecturesSimple';
import QuestionsSection from './components/Sections/QuestionsSection';
import TasksSection from './components/Sections/TasksSection';
import ReportsSection from './components/Sections/ReportsSection';
import AnalyticsSection from './components/Sections/AnalyticsSection';
import SupportSection from './components/Sections/SupportSection';
import './components/Layout/Layout.css';
import './styles/mobile.css';

function App() {
  console.log('🔄 تحميل مكون App...');

  const { state, logout, setCurrentSection, toggleTheme, toggleLanguage } = useApp();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  console.log('📊 حالة التطبيق:', {
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    currentSection: state.currentSection,
    user: state.user
  });

  const handleLogin = (userData: any) => {
    console.log('🔄 تم استدعاء handleLogin - لكن التوجيه سيحدث تلقائياً');
    console.log('👤 بيانات المستخدم:', userData);
    console.log('🔍 حالة المصادقة الحالية:', state.isAuthenticated);

    // لا نحتاج لفعل شيء هنا - useEffect سيتولى التوجيه تلقائياً
    // عندما تتغير state.isAuthenticated في AppContext
  };

  const handleLogout = async () => {
    await logout();
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  // مراقبة تغيير حالة المصادقة للتوجيه التلقائي
  useEffect(() => {
    console.log('🔍 تغيير حالة المصادقة:', state.isAuthenticated);
    console.log('📍 القسم الحالي:', state.currentSection);

    if (state.isAuthenticated && state.user) {
      console.log('✅ المستخدم مسجل دخول - التحقق من القسم');

      // إذا كان المستخدم مسجل دخول ولكن القسم فارغ أو غير محدد
      if (!state.currentSection || state.currentSection === '' || state.currentSection === 'auth') {
        console.log('🔄 تعيين القسم الافتراضي: المحاضرات');
        setCurrentSection('lectures');
      }
    } else if (!state.isAuthenticated) {
      console.log('❌ المستخدم غير مسجل دخول');
      // إعادة تعيين القسم عند تسجيل الخروج
      if (state.currentSection !== '') {
        console.log('🔄 إعادة تعيين القسم');
        setCurrentSection('');
      }
    }
  }, [state.isAuthenticated, state.user, state.currentSection, setCurrentSection]);

  // شاشة التحميل
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-32 h-32 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-pink-500/10 rounded-full blur-2xl animate-pulse delay-500"></div>
        </div>

        <div className="text-center relative z-10">
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center animate-bounce">
              <span className="text-3xl">🎓</span>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-center space-x-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce delay-100"></div>
              <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            {state.preferences.language === 'ar' ? 'منصة التعليم الذكية' : 'AI Educational Platform'}
          </h1>
          <p className="text-blue-200">
            {state.preferences.language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // عرض الأقسام
  const renderSection = () => {
    const sectionProps = {
      user: state.user,
      language: state.preferences.language as 'ar' | 'en',
      isDarkMode: state.preferences.theme === 'dark'
    };

    switch (state.currentSection) {
      case 'lectures':
        return <LecturesSimple {...sectionProps} />;
      case 'questions':
        return <QuestionsSection {...sectionProps} />;
      case 'tasks':
        return <TasksSection {...sectionProps} />;
      case 'reports':
        return <ReportsSection {...sectionProps} />;
      case 'analytics':
        return <AnalyticsSection {...sectionProps} />;
      case 'support':
        return <SupportSection {...sectionProps} />;
      default:
        return <LecturesSimple {...sectionProps} />;
    }
  };

  try {
    return (
      <div className="App">
        {state.isAuthenticated ? (
          <div className={`main-layout ${state.preferences.theme}`} dir={state.preferences.language === 'ar' ? 'rtl' : 'ltr'}>
            <Header
              user={state.user}
              onLogout={handleLogout}
              sidebarExpanded={!state.preferences.sidebarCollapsed}
              isDarkMode={state.preferences.theme === 'dark'}
              setIsDarkMode={toggleTheme}
              language={state.preferences.language}
              setLanguage={toggleLanguage}
              onToggleSidebar={toggleMobileSidebar}
            />

            <Sidebar
              activeSection={state.currentSection}
              onSectionChange={setCurrentSection}
              user={state.user}
              language={state.preferences.language}
              isDarkMode={state.preferences.theme === 'dark'}
              isMobileOpen={isMobileSidebarOpen}
              onMobileClose={closeMobileSidebar}
            />

            <main className="content-area">
              <AnimatePresence mode="wait">
                <motion.div
                  key={state.currentSection}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderSection()}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        ) : (
          <AuthPage onLogin={handleLogin} />
        )}
      </div>
    );
  } catch (error) {
    console.error('❌ خطأ في تحميل App:', error);
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>خطأ في تحميل التطبيق</h1>
        <p>يرجى إعادة تحميل الصفحة</p>
        <button onClick={() => window.location.reload()}>إعادة تحميل</button>
      </div>
    );
  }
}

export default App;
