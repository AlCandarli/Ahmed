import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Heart, 
  Download,
  Clock,
  User,
  Star,
  Play,
  FileText
} from 'lucide-react';

interface LecturesSectionProps {
  user: any;
  language: 'ar' | 'en';
  isDarkMode: boolean;
}

const LecturesSection: React.FC<LecturesSectionProps> = ({ user, language, isDarkMode }) => {
  const [lectures, setLectures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const translations = {
    ar: {
      title: 'المحاضرات',
      subtitle: 'استكشف مجموعة واسعة من المحاضرات التعليمية',
      search: 'البحث في المحاضرات...',
      addLecture: 'إضافة محاضرة',
      filter: 'تصفية',
      all: 'الكل',
      math: 'الرياضيات',
      science: 'العلوم',
      language: 'اللغة',
      history: 'التاريخ',
      views: 'مشاهدة',
      likes: 'إعجاب',
      downloads: 'تحميل',
      minutes: 'دقيقة',
      words: 'كلمة',
      beginner: 'مبتدئ',
      intermediate: 'متوسط',
      advanced: 'متقدم',
      watchNow: 'مشاهدة الآن',
      noLectures: 'لا توجد محاضرات متاحة',
      loading: 'جاري التحميل...'
    },
    en: {
      title: 'Lectures',
      subtitle: 'Explore a wide range of educational lectures',
      search: 'Search lectures...',
      addLecture: 'Add Lecture',
      filter: 'Filter',
      all: 'All',
      math: 'Mathematics',
      science: 'Science',
      language: 'Language',
      history: 'History',
      views: 'views',
      likes: 'likes',
      downloads: 'downloads',
      minutes: 'minutes',
      words: 'words',
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      watchNow: 'Watch Now',
      noLectures: 'No lectures available',
      loading: 'Loading...'
    }
  };

  const t = translations[language];

  const categories = [
    { id: 'all', label: t.all, color: 'from-gray-500 to-gray-600' },
    { id: 'math', label: t.math, color: 'from-blue-500 to-blue-600' },
    { id: 'science', label: t.science, color: 'from-green-500 to-green-600' },
    { id: 'language', label: t.language, color: 'from-purple-500 to-purple-600' },
    { id: 'history', label: t.history, color: 'from-orange-500 to-orange-600' }
  ];

  // Mock data - replace with Firebase data
  const mockLectures = [
    {
      id: 'lecture-1',
      title: language === 'ar' ? 'مقدمة في الجبر' : 'Introduction to Algebra',
      description: language === 'ar' ? 'شرح أساسيات الجبر والمعادلات الخطية' : 'Learn the basics of algebra and linear equations',
      subject: language === 'ar' ? 'الرياضيات' : 'Mathematics',
      category: 'math',
      difficulty: 'beginner',
      duration: 45,
      wordCount: 1200,
      views: 156,
      likes: 23,
      downloads: 12,
      createdBy: language === 'ar' ? 'د. أحمد محمد' : 'Dr. Ahmed Mohamed',
      thumbnail: '/api/placeholder/400/250',
      tags: [language === 'ar' ? 'جبر' : 'algebra', language === 'ar' ? 'رياضيات' : 'math']
    },
    {
      id: 'lecture-2',
      title: language === 'ar' ? 'قوانين نيوتن للحركة' : 'Newton\'s Laws of Motion',
      description: language === 'ar' ? 'شرح قوانين نيوتن الثلاثة للحركة' : 'Understanding Newton\'s three laws of motion',
      subject: language === 'ar' ? 'الفيزياء' : 'Physics',
      category: 'science',
      difficulty: 'intermediate',
      duration: 60,
      wordCount: 1800,
      views: 89,
      likes: 15,
      downloads: 8,
      createdBy: language === 'ar' ? 'د. فاطمة أحمد' : 'Dr. Fatima Ahmed',
      thumbnail: '/api/placeholder/400/250',
      tags: [language === 'ar' ? 'فيزياء' : 'physics', language === 'ar' ? 'حركة' : 'motion']
    }
  ];

  useEffect(() => {
    const loadLectures = async () => {
      // محاكاة تحميل البيانات
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLectures(mockLectures);
      setLoading(false);
    };

    loadLectures();
  }, [language]);

  const filteredLectures = lectures.filter(lecture => {
    const matchesSearch = lecture.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lecture.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || lecture.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'advanced': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t.subtitle}
          </p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="mt-4 md:mt-0 flex items-center space-x-2 rtl:space-x-reverse px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Plus className="w-5 h-5" />
          <span>{t.addLecture}</span>
        </motion.button>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col md:flex-row gap-4"
      >
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute top-1/2 transform -translate-y-1/2 left-3 rtl:left-auto rtl:right-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-3 bg-white/50 dark:bg-dark-800/50 border border-gray-200/50 dark:border-dark-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300"
          />
        </div>

        {/* Category Filter */}
        <div className="flex space-x-2 rtl:space-x-reverse overflow-x-auto pb-2">
          {categories.map((category) => (
            <motion.button
              key={category.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(category.id)}
              className={`
                flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap
                ${selectedCategory === category.id
                  ? `bg-gradient-to-r ${category.color} text-white shadow-lg`
                  : 'bg-white/50 dark:bg-dark-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-dark-700/50'
                }
              `}
            >
              <Filter className="w-4 h-4" />
              <span>{category.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Lectures Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredLectures.map((lecture, index) => (
          <motion.div
            key={lecture.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5, scale: 1.02 }}
            className="bg-white/70 dark:bg-dark-800/70 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
          >
            {/* Thumbnail */}
            <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden">
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"
                >
                  <Play className="w-8 h-8 text-white ml-1" />
                </motion.div>
              </div>
              
              {/* Difficulty Badge */}
              <div className="absolute top-4 left-4 rtl:left-auto rtl:right-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(lecture.difficulty)}`}>
                  {t[lecture.difficulty as keyof typeof t]}
                </span>
              </div>

              {/* Duration */}
              <div className="absolute bottom-4 right-4 rtl:right-auto rtl:left-4 flex items-center space-x-1 rtl:space-x-reverse text-white">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{lecture.duration} {t.minutes}</span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                {lecture.title}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                {lecture.description}
              </p>

              {/* Creator */}
              <div className="flex items-center space-x-2 rtl:space-x-reverse mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{lecture.createdBy}</span>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <Eye className="w-4 h-4" />
                    <span>{lecture.views}</span>
                  </div>
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <Heart className="w-4 h-4" />
                    <span>{lecture.likes}</span>
                  </div>
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <Download className="w-4 h-4" />
                    <span>{lecture.downloads}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300"
              >
                {t.watchNow}
              </motion.button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Empty State */}
      {filteredLectures.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t.noLectures}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'جرب البحث بكلمات مختلفة أو تغيير الفلتر' : 'Try searching with different keywords or changing the filter'}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default LecturesSection;
