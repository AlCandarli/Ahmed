import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  Code,
  Database,
  Globe,
  Cpu,
  Shield,
  Brain,
  Trophy,
  Clock,
  Users,
  Star,
  CheckCircle,
  Play,
  Filter,
  Plus
} from 'lucide-react';
import './TasksSection.css';

interface TasksSectionProps {
  user: any;
  language: 'ar' | 'en';
  isDarkMode: boolean;
  sidebarExpanded?: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  language: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  points: number;
  estimatedTime: number;
  participants: number;
  rating: number;
  completed: boolean;
  progress: number;
  solution?: string;
  testCases?: string[];
  hints?: string[];
  locked?: boolean;
}

const TasksSection: React.FC<TasksSectionProps> = ({ language, isDarkMode, sidebarExpanded = false }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskCode, setTaskCode] = useState('');
  const [statsUpdating, setStatsUpdating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [userStats, setUserStats] = useState({
    completedTasks: 0,
    totalPoints: 0,
    correctSubmissions: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  // OpenRouter API Key
  const OPENROUTER_API_KEY = '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';
  const translations = {
    ar: {
      title: 'مهام البرمجة',
      subtitle: 'تحديات برمجية في جميع مجالات علوم الحاسوب',
      totalTasks: 'إجمالي المهام',
      completedTasks: 'المهام المكتملة',
      totalPoints: 'إجمالي النقاط',
      all: 'الكل',
      webDevelopment: 'تطوير الويب',
      dataStructures: 'هياكل البيانات',
      algorithms: 'الخوارزميات',
      databases: 'قواعد البيانات',
      machineLearning: 'التعلم الآلي',
      cybersecurity: 'الأمن السيبراني',
      mobileApps: 'تطبيقات الجوال',
      beginner: 'مبتدئ',
      intermediate: 'متوسط',
      advanced: 'متقدم',
      expert: 'خبير',
      points: 'نقطة',
      minutes: 'دقيقة',
      participants: 'مشارك',
      startTask: 'بدء المهمة',
      continueTask: 'متابعة',
      completed: 'مكتمل',
      noTasks: 'لا توجد مهام',
      noTasksDesc: 'لم يتم العثور على مهام تطابق الفلاتر المحددة',
      category: 'الفئة',
      level: 'المستوى',
      programmingLanguage: 'لغة البرمجة',
      selectTask: 'اختر مهمة لبدء التنفيذ',
      selectTaskDesc: 'اختر مهمة من القائمة على اليسار لبدء العمل عليها',
      taskExecution: 'تنفيذ المهمة',
      writeCode: 'اكتب الكود هنا...',
      runCode: 'تشغيل الكود',
      submitTask: 'إرسال المهمة',
      saveProgress: 'حفظ التقدم'
    },
    en: {
      title: 'Programming Tasks',
      subtitle: 'Programming challenges in all computer science fields',
      totalTasks: 'Total Tasks',
      completedTasks: 'Completed Tasks',
      totalPoints: 'Total Points',
      all: 'All',
      webDevelopment: 'Web Development',
      dataStructures: 'Data Structures',
      algorithms: 'Algorithms',
      databases: 'Databases',
      machineLearning: 'Machine Learning',
      cybersecurity: 'Cybersecurity',
      mobileApps: 'Mobile Apps',
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      expert: 'Expert',
      points: 'points',
      minutes: 'min',
      participants: 'participants',
      startTask: 'Start Task',
      continueTask: 'Continue',
      completed: 'Completed',
      noTasks: 'No Tasks',
      noTasksDesc: 'No tasks found matching the selected filters',
      category: 'Category',
      level: 'Level',
      programmingLanguage: 'Language',
      selectTask: 'Select a task to start execution',
      selectTaskDesc: 'Choose a task from the left panel to start working on it',
      taskExecution: 'Task Execution',
      writeCode: 'Write your code here...',
      runCode: 'Run Code',
      submitTask: 'Submit Task',
      saveProgress: 'Save Progress'
    }
  };

  const t = translations[language];

  // مولد المهام الذكي
  const generateTasks = () => {
    const categories = ['webDevelopment', 'algorithms', 'dataStructures', 'databases', 'machineLearning', 'cybersecurity', 'mobileApps'];
    const languages = ['JavaScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Swift', 'Kotlin'];
    const levels = ['beginner', 'intermediate', 'advanced', 'expert'];

    const taskTemplates = {
      webDevelopment: {
        beginner: [
          'إنشاء صفحة HTML بسيطة',
          'تصميم نموذج تسجيل دخول',
          'إضافة CSS للتصميم',
          'إنشاء قائمة تنقل',
          'تصميم بطاقة منتج'
        ],
        intermediate: [
          'بناء موقع ويب تفاعلي',
          'إنشاء API REST',
          'تطوير تطبيق React',
          'إدارة الحالة مع Redux',
          'تطبيق مصادقة المستخدمين'
        ],
        advanced: [
          'تطوير تطبيق ويب كامل',
          'تحسين أداء الموقع',
          'تطبيق الأمان المتقدم',
          'إنشاء نظام إدارة المحتوى',
          'تطوير PWA'
        ],
        expert: [
          'بناء منصة تجارة إلكترونية',
          'تطوير نظام دفع متكامل',
          'إنشاء منصة تعليمية',
          'تطوير نظام إدارة المشاريع',
          'بناء شبكة اجتماعية'
        ]
      },
      algorithms: {
        beginner: [
          'خوارزمية البحث الخطي',
          'ترتيب المصفوفة',
          'حساب المضروب',
          'إيجاد أكبر عنصر',
          'عكس النص'
        ],
        intermediate: [
          'خوارزمية البحث الثنائي',
          'ترتيب سريع',
          'خوارزمية Dijkstra',
          'البرمجة الديناميكية',
          'خوارزمية BFS'
        ],
        advanced: [
          'خوارزمية A*',
          'تحليل التعقيد الزمني',
          'خوارزميات الرسوم البيانية',
          'خوارزمية KMP',
          'تحسين الخوارزميات'
        ],
        expert: [
          'خوارزميات التشفير',
          'خوارزميات التعلم الآلي',
          'تحليل البيانات الضخمة',
          'خوارزميات الذكاء الاصطناعي',
          'تحسين الأداء المتقدم'
        ]
      }
    };

    const generatedTasks: Task[] = [];
    let taskId = 1;

    categories.forEach(category => {
      languages.forEach(lang => {
        levels.forEach(level => {
          const templates = taskTemplates[category as keyof typeof taskTemplates] || taskTemplates.algorithms;
          const levelTemplates = templates[level as keyof typeof templates] || templates.beginner;

          levelTemplates.forEach((template, index) => {
            if (generatedTasks.length < 500) { // حد أقصى 500 مهمة
              const points = {
                beginner: 50 + (index * 10),
                intermediate: 100 + (index * 20),
                advanced: 200 + (index * 30),
                expert: 350 + (index * 50)
              };

              const estimatedTime = {
                beginner: 30 + (index * 15),
                intermediate: 60 + (index * 30),
                advanced: 120 + (index * 45),
                expert: 180 + (index * 60)
              };

              generatedTasks.push({
                id: taskId.toString(),
                title: language === 'ar' ? template : template,
                description: language === 'ar'
                  ? `مهمة ${level} في ${category} باستخدام ${lang}. ${template} مع تطبيق أفضل الممارسات.`
                  : `${level} task in ${category} using ${lang}. ${template} with best practices implementation.`,
                category,
                language: lang,
                level: level as any,
                points: points[level as keyof typeof points],
                estimatedTime: estimatedTime[level as keyof typeof estimatedTime],
                participants: Math.floor(Math.random() * 2000) + 100,
                rating: 3.5 + Math.random() * 1.5,
                completed: false,
                progress: 0,
                locked: false
              });
              taskId++;
            }
          });
        });
      });
    });

    return generatedTasks;
  };

  // بيانات المهام المولدة
  const sampleTasks: Task[] = [
    {
      id: '1',
      title: language === 'ar' ? 'بناء موقع ويب تفاعلي' : 'Build Interactive Website',
      description: language === 'ar'
        ? 'قم ببناء موقع ويب تفاعلي باستخدام React وCSS مع تصميم متجاوب'
        : 'Build an interactive website using React and CSS with responsive design',
      category: 'webDevelopment',
      language: 'JavaScript',
      level: 'intermediate',
      points: 150,
      estimatedTime: 120,
      participants: 1250,
      rating: 4.7,
      completed: false,
      progress: 0
    },
    {
      id: '2',
      title: language === 'ar' ? 'تنفيذ خوارزمية البحث الثنائي' : 'Implement Binary Search Algorithm',
      description: language === 'ar'
        ? 'اكتب خوارزمية البحث الثنائي بلغة Python مع تحليل التعقيد الزمني'
        : 'Write binary search algorithm in Python with time complexity analysis',
      category: 'algorithms',
      language: 'Python',
      level: 'beginner',
      points: 75,
      estimatedTime: 45,
      participants: 2100,
      rating: 4.5,
      completed: true,
      progress: 100
    },
    {
      id: '3',
      title: language === 'ar' ? 'تصميم قاعدة بيانات للتجارة الإلكترونية' : 'Design E-commerce Database',
      description: language === 'ar'
        ? 'صمم قاعدة بيانات شاملة لنظام التجارة الإلكترونية مع العلاقات والفهارس'
        : 'Design comprehensive database for e-commerce system with relationships and indexes',
      category: 'databases',
      language: 'SQL',
      level: 'advanced',
      points: 200,
      estimatedTime: 180,
      participants: 850,
      rating: 4.8,
      completed: false,
      progress: 30
    },
    {
      id: '4',
      title: language === 'ar' ? 'نموذج تعلم آلي للتنبؤ' : 'Machine Learning Prediction Model',
      description: language === 'ar'
        ? 'بناء نموذج تعلم آلي للتنبؤ بأسعار الأسهم باستخدام TensorFlow'
        : 'Build machine learning model for stock price prediction using TensorFlow',
      category: 'machineLearning',
      language: 'Python',
      level: 'expert',
      points: 300,
      estimatedTime: 240,
      participants: 420,
      rating: 4.9,
      completed: false,
      progress: 0
    },
    {
      id: '5',
      title: language === 'ar' ? 'تطبيق جوال للتواصل الاجتماعي' : 'Social Media Mobile App',
      description: language === 'ar'
        ? 'تطوير تطبيق جوال للتواصل الاجتماعي باستخدام React Native'
        : 'Develop social media mobile app using React Native',
      category: 'mobileApps',
      language: 'React Native',
      level: 'advanced',
      points: 250,
      estimatedTime: 200,
      participants: 680,
      rating: 4.6,
      completed: false,
      progress: 60
    },
    {
      id: '6',
      title: language === 'ar' ? 'نظام حماية من الهجمات السيبرانية' : 'Cybersecurity Protection System',
      description: language === 'ar'
        ? 'تطوير نظام حماية للكشف عن الهجمات السيبرانية ومنعها'
        : 'Develop protection system to detect and prevent cyber attacks',
      category: 'cybersecurity',
      language: 'Java',
      level: 'expert',
      points: 350,
      estimatedTime: 300,
      participants: 320,
      rating: 4.9,
      completed: false,
      progress: 0
    },
    {
      id: '7',
      title: language === 'ar' ? 'تطبيق إدارة المهام' : 'Task Management App',
      description: language === 'ar'
        ? 'بناء تطبيق إدارة المهام باستخدام React مع قاعدة بيانات MongoDB'
        : 'Build task management app using React with MongoDB database',
      category: 'webDevelopment',
      language: 'TypeScript',
      level: 'intermediate',
      points: 180,
      estimatedTime: 150,
      participants: 890,
      rating: 4.4,
      completed: false,
      progress: 25
    },
    {
      id: '8',
      title: language === 'ar' ? 'خوارزمية الترتيب السريع' : 'Quick Sort Algorithm',
      description: language === 'ar'
        ? 'تنفيذ خوارزمية الترتيب السريع بلغة C++ مع تحليل الأداء'
        : 'Implement Quick Sort algorithm in C++ with performance analysis',
      category: 'algorithms',
      language: 'C++',
      level: 'advanced',
      points: 220,
      estimatedTime: 90,
      participants: 1560,
      rating: 4.7,
      completed: true,
      progress: 100
    },
    {
      id: '9',
      title: language === 'ar' ? 'API للتجارة الإلكترونية' : 'E-commerce API',
      description: language === 'ar'
        ? 'تطوير API شامل للتجارة الإلكترونية باستخدام Node.js و Express'
        : 'Develop comprehensive e-commerce API using Node.js and Express',
      category: 'webDevelopment',
      language: 'JavaScript',
      level: 'expert',
      points: 320,
      estimatedTime: 280,
      participants: 650,
      rating: 4.9,
      completed: false,
      progress: 0
    },
    {
      id: '10',
      title: language === 'ar' ? 'تطبيق الطقس' : 'Weather App',
      description: language === 'ar'
        ? 'تطوير تطبيق الطقس باستخدام Flutter مع API خارجي'
        : 'Develop weather app using Flutter with external API',
      category: 'mobileApps',
      language: 'Flutter',
      level: 'intermediate',
      points: 160,
      estimatedTime: 120,
      participants: 1200,
      rating: 4.3,
      completed: false,
      progress: 40
    },
    {
      id: '11',
      title: language === 'ar' ? 'نظام إدارة المحتوى' : 'Content Management System',
      description: language === 'ar'
        ? 'بناء نظام إدارة محتوى متكامل باستخدام PHP و Laravel'
        : 'Build comprehensive CMS using PHP and Laravel framework',
      category: 'webDevelopment',
      language: 'PHP',
      level: 'advanced',
      points: 280,
      estimatedTime: 220,
      participants: 780,
      rating: 4.6,
      completed: false,
      progress: 15
    },
    {
      id: '12',
      title: language === 'ar' ? 'خدمة ويب بـ Go' : 'Go Web Service',
      description: language === 'ar'
        ? 'تطوير خدمة ويب عالية الأداء باستخدام لغة Go'
        : 'Develop high-performance web service using Go language',
      category: 'webDevelopment',
      language: 'Go',
      level: 'expert',
      points: 350,
      estimatedTime: 200,
      participants: 420,
      rating: 4.8,
      completed: false,
      progress: 0
    }
  ];

  // تحديث المهام عند التحميل
  React.useEffect(() => {
    setIsLoading(true);
    // محاكاة تحميل المهام
    setTimeout(() => {
      const generatedTasks = generateTasks();
      setTasks(generatedTasks);
      setIsLoading(false);
    }, 1000);
  }, [language]);

  const categories = [
    { id: 'all', label: t.all, icon: ClipboardList },
    { id: 'webDevelopment', label: t.webDevelopment, icon: Globe },
    { id: 'algorithms', label: t.algorithms, icon: Brain },
    { id: 'dataStructures', label: t.dataStructures, icon: Database },
    { id: 'databases', label: t.databases, icon: Database },
    { id: 'machineLearning', label: t.machineLearning, icon: Cpu },
    { id: 'cybersecurity', label: t.cybersecurity, icon: Shield },
    { id: 'mobileApps', label: t.mobileApps, icon: Code }
  ];

  const levels = [
    { id: 'all', label: t.all },
    { id: 'beginner', label: t.beginner },
    { id: 'intermediate', label: t.intermediate },
    { id: 'advanced', label: t.advanced },
    { id: 'expert', label: t.expert }
  ];

  const programmingLanguages = [
    { id: 'all', label: t.all },
    { id: 'JavaScript', label: 'JavaScript' },
    { id: 'Python', label: 'Python' },
    { id: 'Java', label: 'Java' },
    { id: 'C++', label: 'C++' },
    { id: 'C#', label: 'C#' },
    { id: 'PHP', label: 'PHP' },
    { id: 'Go', label: 'Go' },
    { id: 'Rust', label: 'Rust' },
    { id: 'Swift', label: 'Swift' },
    { id: 'Kotlin', label: 'Kotlin' },
    { id: 'TypeScript', label: 'TypeScript' },
    { id: 'SQL', label: 'SQL' },
    { id: 'React Native', label: 'React Native' },
    { id: 'Flutter', label: 'Flutter' }
  ];

  const filteredTasks = tasks.filter(task => {
    const categoryMatch = selectedCategory === 'all' || task.category === selectedCategory;
    const levelMatch = selectedLevel === 'all' || task.level === selectedLevel;
    const languageMatch = selectedLanguage === 'all' || task.language === selectedLanguage;
    return categoryMatch && levelMatch && languageMatch;
  });

  const stats = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(task => task.completed).length,
    totalPoints: tasks.reduce((sum, task) => sum + (task.completed ? task.points : 0), 0)
  };

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
    setTaskCode(''); // إعادة تعيين الكود عند اختيار مهمة جديدة
  };

  const handleRunCode = () => {
    console.log('Running code:', taskCode);
    // هنا يمكن إضافة منطق تشغيل الكود
  };

  // تقييم الحل باستخدام DeepSeek
  const evaluateTaskSolution = async (task: Task, code: string) => {
    try {
      setIsSubmitting(true);

      const prompt = `You are a programming instructor evaluating a student's solution.

Task: ${task.title}
Description: ${task.description}
Programming Language: ${task.language}
Difficulty Level: ${task.level}

Student's Code:
${code}

Please evaluate this solution and respond in ${language === 'ar' ? 'Arabic' : 'English'} with the following JSON format:
{
  "isCorrect": true/false,
  "score": 0-100,
  "feedback": "Detailed feedback about the solution",
  "correctSolution": "If incorrect, provide the correct solution",
  "improvements": ["List of improvements if any"],
  "explanation": "Explanation of why the solution is correct/incorrect"
}

Evaluation Criteria:
1. Code correctness and functionality
2. Code quality and best practices
3. Efficiency and optimization
4. Proper use of the programming language features
5. Code readability and structure

Be thorough but constructive in your feedback.`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Educational Platform - Task Evaluation'
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const evaluationText = data.choices[0].message.content;

      // استخراج JSON من الاستجابة
      const jsonMatch = evaluationText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const evaluation = JSON.parse(jsonMatch[0]);
        return evaluation;
      } else {
        throw new Error('Invalid evaluation format');
      }

    } catch (error) {
      console.error('Error evaluating solution:', error);
      return {
        isCorrect: false,
        score: 0,
        feedback: language === 'ar' ? 'حدث خطأ في تقييم الحل' : 'Error evaluating solution',
        correctSolution: '',
        improvements: [],
        explanation: language === 'ar' ? 'يرجى المحاولة مرة أخرى' : 'Please try again'
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitTask = async () => {
    if (selectedTask && taskCode.trim()) {
      setStatsUpdating(true);

      // تقييم الحل باستخدام DeepSeek
      const evaluation = await evaluateTaskSolution(selectedTask, taskCode);
      setSubmissionResult(evaluation);

      if (evaluation.isCorrect) {
        // الحل صحيح - تحديث الإحصائيات
        setUserStats(prev => ({
          ...prev,
          completedTasks: prev.completedTasks + 1,
          totalPoints: prev.totalPoints + selectedTask.points,
          correctSubmissions: prev.correctSubmissions + 1
        }));

        // تحديث حالة المهمة إلى مكتملة
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === selectedTask.id
              ? { ...task, completed: true, progress: 100, locked: true }
              : task
          )
        );

        // إشعار النجاح
        setTimeout(() => {
          alert(language === 'ar' ?
            `ممتاز! حصلت على ${selectedTask.points} نقطة` :
            `Excellent! You earned ${selectedTask.points} points`
          );
        }, 1000);
      } else {
        // الحل خاطئ - قفل المهمة وعرض الحل الصحيح
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === selectedTask.id
              ? { ...task, locked: true, solution: evaluation.correctSolution }
              : task
          )
        );

        // عرض الحل الصحيح
        setTimeout(() => {
          alert(language === 'ar' ?
            `الحل غير صحيح. الحل الصحيح:\n${evaluation.correctSolution}` :
            `Incorrect solution. Correct solution:\n${evaluation.correctSolution}`
          );
        }, 1000);
      }

      // إعادة تعيين الكود
      setTaskCode('');

      // إيقاف تأثير التحديث
      setTimeout(() => {
        setStatsUpdating(false);
      }, 600);

      console.log('Task evaluation:', evaluation);
    }
  };

  const handleSaveProgress = () => {
    console.log('Saving progress:', selectedTask?.id, taskCode);
    // هنا يمكن إضافة منطق حفظ التقدم
  };

  const handleAddTask = () => {
    if (newTaskText.trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        title: newTaskText,
        description: language === 'ar' ? 'مهمة جديدة تم إضافتها' : 'New task added',
        category: 'webDevelopment',
        language: 'JavaScript',
        level: 'beginner',
        points: 50,
        estimatedTime: 30,
        participants: 0,
        rating: 0,
        completed: false,
        progress: 0
      };
      setTasks(prev => [newTask, ...prev]);
      setNewTaskText('');
    }
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: any } = {
      webDevelopment: Globe,
      algorithms: Brain,
      dataStructures: Database,
      databases: Database,
      machineLearning: Cpu,
      cybersecurity: Shield,
      mobileApps: Code
    };
    return iconMap[category] || ClipboardList;
  };

  const getCategoryColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      webDevelopment: '#3b82f6',
      algorithms: '#8b5cf6',
      dataStructures: '#10b981',
      databases: '#f59e0b',
      machineLearning: '#ef4444',
      cybersecurity: '#06b6d4',
      mobileApps: '#84cc16'
    };
    return colorMap[category] || '#6b7280';
  };

  return (
    <div
      className={`tasks-container ${isDarkMode ? 'dark' : ''} ${language === 'ar' ? 'rtl' : 'ltr'}`}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* المحتوى الرئيسي */}
      <div className="tasks-content">
        {/* الجانب الأيسر - قائمة المهام */}
        <motion.div
          className="tasks-sidebar"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* هيدر القائمة */}
          <div className="tasks-sidebar-header">
            <h2 className="tasks-sidebar-title">
              <ClipboardList size={24} />
              {t.title}
            </h2>

            {/* إحصائيات المهام */}
            <div className="tasks-stats">
              <motion.div
                className={`tasks-stat-card completed ${statsUpdating ? 'updating' : ''}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div className="tasks-stat-number">
                  <CheckCircle size={18} />
                  <motion.span
                    key={stats.completedTasks}
                    initial={{ scale: 1 }}
                    animate={statsUpdating ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {userStats.completedTasks}
                  </motion.span>
                </div>
                <div className="tasks-stat-label">{t.completedTasks}</div>
              </motion.div>

              <motion.div
                className={`tasks-stat-card ${statsUpdating ? 'updating' : ''}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <div className="tasks-stat-number">
                  <Star size={18} fill="currentColor" />
                  <motion.span
                    key={stats.totalPoints}
                    initial={{ scale: 1 }}
                    animate={statsUpdating ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {userStats.totalPoints}
                  </motion.span>
                </div>
                <div className="tasks-stat-label">{t.totalPoints}</div>
              </motion.div>
            </div>

            {/* الفلاتر */}
            <div className="tasks-filters">
              {/* فلتر الفئة */}
              <div className="tasks-filter-group">
                <label className="tasks-filter-label">{t.category}</label>
                <select
                  className="tasks-filter-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* فلتر المستوى */}
              <div className="tasks-filter-group">
                <label className="tasks-filter-label">{t.level}</label>
                <select
                  className="tasks-filter-select"
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                >
                  {levels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* فلتر لغة البرمجة */}
              <div className="tasks-filter-group" style={{ gridColumn: '1 / -1' }}>
                <label className="tasks-filter-label">{t.programmingLanguage}</label>
                <select
                  className="tasks-filter-select"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                >
                  {programmingLanguages.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* قائمة المهام */}
          <div className="tasks-list">
            {isLoading ? (
              <div className="tasks-loading">
                <div className="loading-spinner"></div>
                <p>{language === 'ar' ? 'جاري تحميل المهام...' : 'Loading tasks...'}</p>
              </div>
            ) : (
              <AnimatePresence>
                {filteredTasks.length > 0 ? (
                filteredTasks.map((task, index) => {
                  const CategoryIcon = getCategoryIcon(task.category);
                  const categoryColor = getCategoryColor(task.category);

                  return (
                    <motion.div
                      key={task.id}
                      className={`task-card ${task.level} ${selectedTask?.id === task.id ? 'active' : ''}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      onClick={() => handleTaskSelect(task)}
                    >
                      {/* محتوى المهمة */}
                      <div className="task-content">
                        <div className="task-card-header">
                          <h3 className="task-title">{task.title}</h3>
                          <span className={`task-level ${task.level}`}>
                            {t[task.level as keyof typeof t]}
                          </span>
                        </div>

                        <p className="task-description">{task.description}</p>

                        <div className="task-details">
                          <div className="task-detail-item">
                            <Clock size={12} />
                            {task.estimatedTime} {t.minutes}
                          </div>
                          <div className="task-detail-item">
                            <Code size={12} />
                            <span className="task-language">{task.language}</span>
                          </div>
                          <div className="task-detail-item">
                            <Star size={12} fill="currentColor" />
                            {task.points} {t.points}
                          </div>
                          {task.rating > 0 && (
                            <div className="task-detail-item">
                              <Star size={12} fill="#fbbf24" color="#fbbf24" />
                              {task.rating}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <motion.div
                  className="tasks-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="tasks-empty-icon">
                    <ClipboardList size={24} />
                  </div>
                  <h3 className="tasks-empty-title">{t.noTasks}</h3>
                  <p className="tasks-empty-subtitle">{t.noTasksDesc}</p>
                </motion.div>
              )}
            </AnimatePresence>
            )}
          </div>
        </motion.div>

        {/* الجانب الأيمن - منطقة التنفيذ */}
        <motion.div
          className="tasks-execution-area"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {selectedTask ? (
            <>
              {/* هيدر منطقة التنفيذ */}
              <div className="execution-header">
                <h2 className="execution-title">{selectedTask.title}</h2>
                <p className="execution-subtitle">
                  {selectedTask.category} • {selectedTask.language} • {selectedTask.points} {t.points}
                </p>
              </div>

              {/* محتوى التنفيذ */}
              <div className="execution-content">
                <div className="task-editor">
                  {/* هيدر المحرر */}
                  <div className="task-editor-header">
                    <h3 className="task-editor-title">{t.taskExecution}</h3>
                  </div>

                  {/* وصف المهمة */}
                  <div style={{
                    padding: '16px',
                    background: isDarkMode ? '#374151' : '#f9fafb',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    border: `1px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'}`
                  }}>
                    <p style={{
                      margin: 0,
                      fontSize: '14px',
                      lineHeight: '1.6',
                      color: isDarkMode ? '#d1d5db' : '#374151'
                    }}>
                      {selectedTask.description}
                    </p>
                  </div>

                  {/* محرر الكود */}
                  <div className="task-editor-content">
                    <textarea
                      value={taskCode}
                      onChange={(e) => setTaskCode(e.target.value)}
                      placeholder={t.writeCode}
                      className="task-editor-textarea"
                    />
                  </div>

                  {/* أزرار العمليات */}
                  <div className="task-editor-actions">
                    <button
                      onClick={handleSaveProgress}
                      className="task-editor-btn secondary"
                    >
                      <Clock size={16} />
                      {t.saveProgress}
                    </button>

                    <button
                      onClick={handleRunCode}
                      className="task-editor-btn secondary"
                      disabled={!taskCode.trim()}
                    >
                      <Play size={16} />
                      {t.runCode}
                    </button>

                    <button
                      onClick={handleSubmitTask}
                      className="task-editor-btn primary"
                      disabled={!taskCode.trim()}
                    >
                      <CheckCircle size={16} />
                      {t.submitTask}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // حالة عدم اختيار مهمة
            <div className="execution-content">
              <div className="execution-content-centered">
                <div className="execution-placeholder">
                  <div className="execution-placeholder-icon">
                    <ClipboardList size={40} />
                  </div>
                  <h3 className="execution-placeholder-title">{t.selectTask}</h3>
                  <p className="execution-placeholder-subtitle">{t.selectTaskDesc}</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TasksSection;
