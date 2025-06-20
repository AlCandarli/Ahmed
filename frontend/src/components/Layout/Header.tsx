import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Moon,
  Sun,
  Globe,
  ChevronDown,
  LogOut,
  Menu
} from 'lucide-react';
import logoImage from './1000053862.png';

interface HeaderProps {
  user: any;
  onLogout: () => void;
  sidebarExpanded: boolean;
  isDarkMode: boolean;
  setIsDarkMode: () => void;
  language: string;
  setLanguage: () => void;
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  sidebarExpanded,
  isDarkMode,
  setIsDarkMode,
  language,
  setLanguage,
  onToggleSidebar
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [currentDisplay, setCurrentDisplay] = useState(0); // 0: اختصار, 1-4: الكلمات

  const fullWords = ['RESEARCH', 'INNOVATION', 'SOLUTIONS', 'EXCELLENCE'];

  // دورة العرض: اختصار → كلمة 1 → كلمة 2 → كلمة 3 → كلمة 4 → اختصار...
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDisplay(prev => (prev + 1) % 5); // 5 حالات: 0 للاختصار، 1-4 للكلمات
    }, 2500); // كل 2.5 ثانية

    return () => clearInterval(interval);
  }, []);

  const translations = {
    ar: {
      siteName: 'R.I.S.E',
      fullName: ['RESEARCH', 'INNOVATION', 'SOLUTIONS', 'EXCELLENCE'],
      logout: 'تسجيل الخروج'
    },
    en: {
      siteName: 'R.I.S.E',
      fullName: ['RESEARCH', 'INNOVATION', 'SOLUTIONS', 'EXCELLENCE'],
      logout: 'Logout'
    }
  };

  const t = translations[language as keyof typeof translations];

  return (
    <motion.header
      className={`header ${isDarkMode ? 'dark' : 'light'}`}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div
        className="header-content"
        style={{
          marginLeft: language === 'ar' ? 0 : (sidebarExpanded ? '280px' : '80px'),
          marginRight: language === 'ar' ? (sidebarExpanded ? '280px' : '80px') : 0,
        }}
      >
        {/* Mobile Menu Button */}
        <motion.button
          className="mobile-menu-btn mobile-only"
          onClick={onToggleSidebar}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Menu size={24} />
        </motion.button>

        {/* Site Name with Animation - في اليسار */}
        <motion.div
          className="site-name"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="site-logo">
            <div className="logo-circle">
              <img src={logoImage} alt="R.I.S.E Logo" className="logo-image" />
            </div>
          </div>

          <div className="site-text-container">
            <AnimatePresence mode="wait">
              {currentDisplay === 0 ? (
                // عرض الاختصار
                <motion.span
                  key="abbreviation"
                  className="site-text abbreviation"
                  initial={{ opacity: 0, y: -20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                >
                  {t.siteName}
                </motion.span>
              ) : (
                // عرض كلمة واحدة
                <motion.span
                  key={`word-${currentDisplay}`}
                  className="site-text single-word"
                  initial={{ opacity: 0, x: -30, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 30, scale: 0.9 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                >
                  {fullWords[currentDisplay - 1]}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Right Controls */}
        <div className="header-controls">
          {/* Language Toggle */}
          <motion.button
            className="control-btn language-btn"
            onClick={setLanguage}
            whileHover={{ scale: 1.1, rotateY: 180 }}
            whileTap={{ scale: 0.9 }}
            title={language === 'ar' ? 'English' : 'العربية'}
          >
            <Globe size={20} />
            <span className="control-text">{language === 'ar' ? 'EN' : 'ع'}</span>
          </motion.button>

          {/* Dark Mode Toggle */}
          <motion.button
            className="control-btn theme-btn"
            onClick={setIsDarkMode}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
          >
            <motion.div
              initial={false}
              animate={{ rotate: isDarkMode ? 180 : 0 }}
              transition={{ duration: 0.5 }}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </motion.div>
          </motion.button>



          {/* Profile Menu */}
          <div className="profile-menu-container">
            <motion.button
              className="profile-btn"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="profile-avatar">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} />
                ) : (
                  <User size={20} />
                )}
              </div>
              <span className="profile-name">{user?.name || (language === 'ar' ? 'المستخدم' : 'User')}</span>
              <motion.div
                animate={{ rotate: showProfileMenu ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown size={16} />
              </motion.div>
            </motion.button>

            {/* Profile Dropdown */}
            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  className="profile-dropdown"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.button
                    className="dropdown-item logout-item"
                    whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                  >
                    <LogOut size={16} />
                    <span>{t.logout}</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
