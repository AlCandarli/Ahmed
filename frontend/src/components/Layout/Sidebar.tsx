
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  HelpCircle,
  FileText,
  BarChart3,
  PieChart,
  MessageCircle,
  User,
  GraduationCap
} from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  user: any;
  language: string;
  isDarkMode: boolean;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSectionChange,
  user,
  language,
  isDarkMode,
  isMobileOpen = false,
  onMobileClose
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // كشف الجوال
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const translations = {
    ar: {
      lectures: 'المحاضرات',
      questions: 'الأسئلة',
      tasks: 'المهام',
      reports: 'التقارير',
      analytics: 'التحليلات',
      support: 'الدعم',
      student: 'طالب'
    },
    en: {
      lectures: 'Lectures',
      questions: 'Questions',
      tasks: 'Tasks',
      reports: 'Reports',
      analytics: 'Analytics',
      support: 'Support',
      student: 'Student'
    }
  };

  const t = translations[language as keyof typeof translations];

  const menuItems = [
    { id: 'lectures', icon: BookOpen, label: t.lectures, color: '#3b82f6' },
    { id: 'questions', icon: HelpCircle, label: t.questions, color: '#10b981' },
    { id: 'tasks', icon: FileText, label: t.tasks, color: '#f59e0b' },
    { id: 'reports', icon: BarChart3, label: t.reports, color: '#8b5cf6' },
    { id: 'analytics', icon: PieChart, label: t.analytics, color: '#ef4444' },
    { id: 'support', icon: MessageCircle, label: t.support, color: '#06b6d4' }
  ];

  const handleSectionChange = (section: string) => {
    onSectionChange(section);
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isMobileOpen && (
        <motion.div
          className="sidebar-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onMobileClose}
        />
      )}

      <motion.aside
        className={`sidebar ${isDarkMode ? 'dark' : 'light'} ${language === 'ar' ? 'rtl' : 'ltr'} ${!isExpanded && !isMobile ? 'collapsed' : ''} ${isMobile && isMobileOpen ? 'expanded' : ''}`}
        style={{
          width: isMobile ? '280px' : (isExpanded ? '280px' : '80px'),
          [language === 'ar' ? 'right' : 'left']: 0,
          transform: isMobile ? (isMobileOpen ? 'translateX(0)' : `translateX(${language === 'ar' ? '100%' : '-100%'})`) : 'translateX(0)'
        }}
        initial={{
          x: language === 'ar' ? 300 : -300,
          opacity: 0
        }}
        animate={{
          x: 0,
          opacity: 1
        }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        onMouseEnter={() => !isMobile && setIsExpanded(true)}
        onMouseLeave={() => !isMobile && setIsExpanded(false)}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
      {/* User Profile Section */}
      <div className="sidebar-profile">
        <AnimatePresence>
          {(isExpanded || isMobile) ? (
            <motion.div
              className="profile-container"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="profile-avatar-container">
                <motion.div
                  className="profile-avatar"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.3 }}
                >
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} />
                  ) : (
                    <User size={20} />
                  )}
                </motion.div>
                <motion.div
                  className="profile-status"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>

              <motion.div
                className="profile-info"
                initial={{ opacity: 0, x: language === 'ar' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <h3 className="profile-name">{user?.name || (language === 'ar' ? 'المستخدم' : 'User')}</h3>
                <p className="profile-role">{t.student}</p>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              className="profile-name-collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="profile-name-text">
                {user?.name?.charAt(0) || (language === 'ar' ? 'م' : 'U')}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menuItems.map((item, index) => (
            <li key={item.id}>
              <motion.button
                onClick={() => handleSectionChange(item.id)}
                className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                data-tooltip={item.label}
                whileHover={{
                  scale: 1.05,
                  x: language === 'ar' ? -5 : 5
                }}
                whileTap={{ scale: 0.95 }}
                initial={{
                  opacity: 0,
                  x: language === 'ar' ? 50 : -50
                }}
                animate={{
                  opacity: 1,
                  x: 0
                }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1
                }}
              >
                <motion.div
                  className="nav-icon"
                  style={{
                    backgroundColor: activeSection === item.id ? item.color : 'transparent',
                    color: item.color // دائماً نفس اللون في كلا الوضعين
                  }}
                  whileHover={{
                    rotate: (isExpanded || isMobile) ? 360 : 0,
                    scale: (isExpanded || isMobile) ? 1 : 1.1
                  }}
                  transition={{ duration: 0.6 }}
                >
                  <item.icon size={(isExpanded || isMobile) ? 18 : 16} />
                </motion.div>
                
                <AnimatePresence>
                  {(isExpanded || isMobile) && (
                    <motion.span
                      className="nav-label"
                      initial={{ opacity: 0, x: language === 'ar' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: language === 'ar' ? 20 : -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>


              </motion.button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Copyright */}
      <div className="sidebar-footer">
        <AnimatePresence>
          {(isExpanded || isMobile) && (
            <motion.div
              className="copyright-text"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <motion.p
                className="copyright-line"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                © 2025
              </motion.p>
              <motion.p
                className="copyright-line"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {language === 'ar' ? 'منصة R.I.S.E التعليمية' : 'R.I.S.E Learning Platform'}
              </motion.p>
              <motion.p
                className="copyright-line"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
              </motion.p>
              <motion.p
                className="version-line"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {language === 'ar' ? ' 1.4.4.1' : ' 1.4.4.1'}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {!isExpanded && !isMobile && (
          <motion.div
            className="copyright-icon"
            whileHover={{
              scale: 1.15,
              rotate: 360
            }}
            transition={{ duration: 0.5 }}
            animate={{
              y: [0, -2, 0],
            }}
            style={{
              animationDuration: '3s',
              animationIterationCount: 'infinite'
            }}
          >
            <GraduationCap size={24} />
          </motion.div>
        )}
      </div>
    </motion.aside>
    </>
  );
};

export default Sidebar;
