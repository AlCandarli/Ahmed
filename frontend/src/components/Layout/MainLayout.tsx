import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './Header';
import Sidebar from './Sidebar';
import LecturesSimple from '../Sections/LecturesSimple';
import QuestionsSection from '../Sections/QuestionsSection';
import TasksSection from '../Sections/TasksSection';
import ReportsSection from '../Sections/ReportsSection';
import AnalyticsSection from '../Sections/AnalyticsSection';
import SupportSection from '../Sections/SupportSection';

interface MainLayoutProps {
  user: any;
  onLogout: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ user, onLogout }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [activeSection, setActiveSection] = useState('lectures');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    const savedLanguage = localStorage.getItem('language');
    
    if (savedDarkMode) {
      setIsDarkMode(JSON.parse(savedDarkMode));
    }
    
    if (savedLanguage) {
      setLanguage(savedLanguage as 'ar' | 'en');
    }
  }, []);

  // Apply dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Apply language
  useEffect(() => {
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
    localStorage.setItem('language', language);
  }, [language]);

  const handleToggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleToggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
  };

  const renderActiveSection = () => {
    const sectionProps = {
      user,
      language,
      isDarkMode,
      sidebarExpanded
    };

    switch (activeSection) {
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

  const pageVariants = {
    initial: {
      opacity: 0,
      x: language === 'ar' ? 100 : -100,
      scale: 0.95
    },
    in: {
      opacity: 1,
      x: 0,
      scale: 1
    },
    out: {
      opacity: 0,
      x: language === 'ar' ? -100 : 100,
      scale: 0.95
    }
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.4
  };

  return (
    <div
      className={`min-h-screen bg-gray-50 dark:bg-dark-900 transition-all duration-500 ${language === 'ar' ? 'font-arabic' : 'font-english'}`}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Sidebar */}
      <Sidebar
        user={user}
        language={language}
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        isExpanded={sidebarExpanded}
        onToggleExpanded={setSidebarExpanded}
      />

      {/* Header */}
      <Header
        user={user}
        isDarkMode={isDarkMode}
        language={language}
        sidebarExpanded={sidebarExpanded}
        onToggleDarkMode={handleToggleDarkMode}
        onToggleLanguage={handleToggleLanguage}
        onLogout={onLogout}
      />

      {/* Main Content */}
      <main
        className={`
          transition-all duration-300 ease-in-out
          ${sidebarExpanded ? (language === 'ar' ? 'mr-64' : 'ml-64') : (language === 'ar' ? 'mr-16' : 'ml-16')}
        `}
        style={{
          marginTop: '70px',
          height: 'calc(100vh - 70px)',
          overflow: 'hidden'
        }}
      >
        <div className="h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="h-full w-full"
            >
              {renderActiveSection()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Background Decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Floating Orbs */}
        <motion.div
          className="absolute top-20 left-20 w-32 h-32 bg-blue-500/10 rounded-full blur-xl"
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div
          className="absolute top-1/2 right-20 w-24 h-24 bg-purple-500/10 rounded-full blur-xl"
          animate={{
            y: [0, 20, 0],
            x: [0, -15, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
        
        <motion.div
          className="absolute bottom-20 left-1/3 w-40 h-40 bg-pink-500/10 rounded-full blur-xl"
          animate={{
            y: [0, -30, 0],
            x: [0, 20, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10"></div>
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {false && ( // Set to true when loading
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/80 dark:bg-dark-900/80 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <div className="text-center">
              <div className="spinner mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">
                {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MainLayout;
