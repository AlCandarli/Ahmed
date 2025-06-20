import React from 'react';
import { motion } from 'framer-motion';
import {
  HeadphonesIcon,
  Code,
  Globe,
  Mail,
  Github,
  Linkedin,
  Twitter,
  MapPin,
  Lightbulb,
  Target,
  Heart,
  ExternalLink,
  Instagram,
  Youtube,
  MessageCircle,
  Users,
  UserCheck
} from 'lucide-react';
import './SupportSection.css';
import developerImage from './image.png';

interface SupportSectionProps {
  user: any;
  language: 'ar' | 'en';
  isDarkMode: boolean;
  sidebarExpanded?: boolean;
}

const SupportSection: React.FC<SupportSectionProps> = ({ language, isDarkMode, sidebarExpanded = false }) => {
  const translations = {
    ar: {
      title: 'الدعم والتواصل',
      subtitle: 'تعرف على المطور وفكرة الموقع',
      developerName: 'أحمد مشتاق ( Ǎļ Çandarli )',
      developerTitle: 'مطور تطبيقات ذكية ',
      developerDescription: 'مطور شغوف بالتكنولوجيا والذكاء الاصطناعي، أعمل على تطوير حلول تقنية مبتكرة تساعد في تحسين التعليم والتعلم الرقمي.',
      skills: 'الخبرات والمهارات',
      skillsList: [
        'React & TypeScript',
        'Node.js & Python',
        'الذكاء الاصطناعي',
        'تطوير المواقع',
        'تطبيقات الجوال',
        'قواعد البيانات'
      ],
      websiteIdea: 'فكرة الموقع',
      ideaDescription: "منصة تعليمية ذكية تهدف إلى تحسين تجربة التعلم من خلال الذكاء الاصطناعي. يوفر الموقع أدوات متقدمة للطلاب والمعلمين لتحسين العملية التعليمية مع واجهة تفاعلية حديثة.",
      websiteGoal: 'هدف الموقع',
      goalDescription: 'تطوير منصة تعليمية شاملة تستخدم تقنيات الذكاء الاصطناعي لتقديم تجربة تعليمية مخصصة وفعالة لكل طالب، مع توفير أدوات تحليل الأداء والتقارير الذكية.',
      contactInfo: 'طرق التواصل',
      instagram: 'إنستغرام',
      youtube: 'يوتيوب',
      twitter: 'منصة X',
      github: 'GitHub',
      telegram: 'تلغرام',
      instagramProfile: 'ahmedmshtak4',
      youtubeProfile: 'wajibcs',
      twitterProfile: 'esumuuo',
      githubProfile: 'AlCandarli',
      telegramProfile: 'AHM_66',
      supervisor: 'المشرف',
      supervisorName: 'ا.م.د محسن حسن',
      supervisorDescription: 'حضرة المعاون العلمي في كلية علوم الحاسوب وتكنولوجيا المعلومات في جامعة كربلاء',
      assistants: 'المساعدين',
      assistant1: 'Fenix',
      assistant2: 'CHEETAH',
    
     
    },
    en: {
      title: 'Support & Contact',
      subtitle: 'Meet the developer and learn about the website',
      developerName: 'Ahmed Mushtaq ( Ǎļ Çandarli )',
      developerTitle: 'Smart Applications Developer ',
      developerDescription: 'Passionate developer focused on technology and artificial intelligence, working on innovative technical solutions to improve digital education and learning.',
      skills: 'Skills & Expertise',
      skillsList: [
        'React & TypeScript',
        'Node.js & Python',
        'Artificial Intelligence',
        'Web Development',
        'Mobile Applications',
        'Database Systems'
      ],
      websiteIdea: 'Website Idea',
      ideaDescription: 'An intelligent educational platform aimed at improving the learning experience through artificial intelligence. The website provides advanced tools for students and teachers to enhance the educational process with a modern interactive interface.',
      websiteGoal: 'Website Goal',
      goalDescription: 'Develop a comprehensive educational platform that uses artificial intelligence technologies to provide a personalized and effective learning experience for each student, with performance analysis tools and smart reports.',
      contactInfo: 'Contact Methods',
      instagram: 'Instagram',
      youtube: 'YouTube',
      twitter: 'X Platform',
      github: 'GitHub',
      telegram: 'Telegram',
      instagramProfile: 'ahmedmshtak4',
      youtubeProfile: 'wajibcs',
      twitterProfile: 'esumuuo',
      githubProfile: 'AlCandarli',
      telegramProfile: 'AHM_66',
      supervisor: 'Supervisor',
      supervisorName: 'Assist. prof. Dr. Mohsen Hassan',
      supervisorDescription: 'Scientific Assistant at the College of Computer Science and Information Technology, University of Karbala',
      assistants: 'Assistants',
      assistant1: 'Fenix',
      assistant2: 'CHEETAH',
      
    }
  };

  const t = translations[language];

  // وظائف التواصل
  const handleInstagramClick = () => {
    window.open(`https://www.instagram.com/ahmedmshtak4?igsh=MXZhb244emI1NHB6dg%3D%3D&utm_source=qr`, '_blank');
  };

  const handleYoutubeClick = () => {
    window.open(`https://youtube.com/@wajibcs`, '_blank');
  };

  const handleTwitterClick = () => {
    window.open(`https://x.com/esumuuo?s=21`, '_blank');
  };

  const handleGithubClick = () => {
    window.open(`https://github.com/AlCandarli`, '_blank');
  };

  const handleTelegramClick = () => {
    window.open(`https://t.me/AHM_66`, '_blank');
  };

  // وظائف المساعدين
  const handleFenixClick = () => {
    window.open(`https://www.instagram.com/sj3j?igsh=MXU1YTRpZ2dkaWN3dg==`, '_blank');
  };

  const handleFahadClick = () => {
    window.open(`https://www.instagram.com/bfa7_?igsh=Yzhqb3N3MWcwZnZl`, '_blank');
  };

 

  return (
    <div
      className={`support-container ${isDarkMode ? 'dark' : ''} ${language === 'ar' ? 'rtl' : 'ltr'}`}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="support-content">
        {/* بطاقة المطور */}
        <motion.div
          className="developer-profile"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="developer-main-info">
            {/* صورة المطور */}
            <div className="developer-avatar">
              <img
                src={developerImage}
                alt={t.developerName}
                className="developer-image"
              />
            </div>

            {/* معلومات المطور */}
            <div className="developer-info">
              <h2 className="developer-name">{t.developerName}</h2>
              <p className="developer-title">{t.developerTitle}</p>
              <p className="developer-description">{t.developerDescription}</p>
            </div>
          </div>
        </motion.div>

        {/* قسم المشرف والمساعدين */}
        <motion.div
          className="team-section"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* المشرف */}
          <motion.div
            className="supervisor-box"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="supervisor-info">
              <UserCheck size={20} className="supervisor-icon" />
              <div>
                <h3 className="supervisor-title">{t.supervisor}</h3>
                <p className="supervisor-name">{t.supervisorName}</p>
                <p className="supervisor-description">{t.supervisorDescription}</p>
              </div>
            </div>
          </motion.div>

          {/* المساعدين */}
          <motion.div
            className="assistants-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="assistants-title">
              <Users size={20} className="assistants-icon" />
              {t.assistants}
            </h3>
            <div className="assistants-grid">
              <motion.a
                onClick={handleFenixClick}
                className="assistant-card"
                whileHover={{
                  scale: 1.03,
                  boxShadow: "0 8px 20px rgba(225, 48, 108, 0.3)",
                  borderColor: "#e1306c"
                }}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.1, delay: 0.1 }}
              >
                <Instagram size={16} className="assistant-instagram-icon" />
                <span className="assistant-name">{t.assistant1}</span>
              </motion.a>

              <motion.a
                onClick={handleFahadClick}
                className="assistant-card"
                whileHover={{
                  scale: 1.01,
                  boxShadow: "0 8px 20px rgba(225, 48, 108, 0.3)",
                  borderColor: "#e1306c"
                }}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.10, delay: 0.10 }}
              >
                <Instagram size={16} className="assistant-instagram-icon" />
                <span className="assistant-name">{t.assistant2}</span>
              </motion.a>
            </div>
          </motion.div>
        </motion.div>

        {/* خبرات المطور */}
        <motion.div
          className="developer-skills"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="skills-title">
            <Code size={20} style={{ color: '#6366f1' }} />
            {t.skills}
          </h3>
          <div className="skills-grid">
            {t.skillsList.map((skill, index) => (
              <motion.div
                key={index}
                className="skill-item"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                whileHover={{ scale: 1.03 }}
              >
                {skill}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* الشبكة الرئيسية */}
        <div className="support-grid">

          {/* مربع فكرة الموقع */}
          <motion.div
            className="website-idea-box"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="idea-title">
              <Lightbulb size={20} style={{ color: '#6366f1' }} />
              {t.websiteIdea}
            </h3>
            <p className="idea-content">{t.ideaDescription}</p>
          </motion.div>

          {/* مربع هدف الموقع */}
          <motion.div
            className="website-goal-box"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="goal-title">
              <Target size={20} style={{ color: '#6366f1' }} />
              {t.websiteGoal}
            </h3>
            <p className="goal-content">{t.goalDescription}</p>
          </motion.div>
        </div>

        {/* طرق التواصل */}
        <motion.div
          className="contact-section"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 10, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="contact-title">
            <HeadphonesIcon size={20} style={{ color: '#6366f1' }} />
            {t.contactInfo}
          </h3>

          <div className="contact-methods">
            <motion.a
              onClick={handleInstagramClick}
              className="contact-method instagram"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 10px 30px rgba(225, 48, 108, 0.4)",
                borderColor: "#e1306c"
              }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 1 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              <div className="contact-icon instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <div className="contact-info">
                <h4>{t.instagram}</h4>
                <p>{t.instagramProfile}</p>
              </div>
            </motion.a>

            <motion.a
              onClick={handleYoutubeClick}
              className="contact-method youtube"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 10px 30px rgba(255, 0, 0, 0.4)",
                borderColor: "#ff0000"
              }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 1 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.15 }}
            >
              <div className="contact-icon youtube">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <div className="contact-info">
                <h4>{t.youtube}</h4>
                <p>{t.youtubeProfile}</p>
              </div>
            </motion.a>

            <motion.a
              onClick={handleTwitterClick}
              className="contact-method twitter"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
                borderColor: "#000000"
              }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 1 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.2 }}
            >
              <div className="contact-icon twitter">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <div className="contact-info">
                <h4>{t.twitter}</h4>
                <p>{t.twitterProfile}</p>
              </div>
            </motion.a>

            <motion.a
              onClick={handleGithubClick}
              className="contact-method github"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 10px 30px rgba(88, 96, 105, 0.4)",
                borderColor: "#586069"
              }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 1 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.25 }}
            >
              <div className="contact-icon github">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </div>
              <div className="contact-info">
                <h4>{t.github}</h4>
                <p>{t.githubProfile}</p>
              </div>
            </motion.a>

            <motion.a
              onClick={handleTelegramClick}
              className="contact-method telegram"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 10px 30px rgba(0, 136, 204, 0.4)",
                borderColor: "#0088cc"
              }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 1 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.3 }}
            >
              <div className="contact-icon telegram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </div>
              <div className="contact-info">
                <h4>{t.telegram}</h4>
                <p>{t.telegramProfile}</p>
              </div>
            </motion.a>
          </div>
        </motion.div>        
      </div>
    </div>
  );
};

export default SupportSection;
