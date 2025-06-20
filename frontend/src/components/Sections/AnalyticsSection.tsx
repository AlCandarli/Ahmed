import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Target,
  Award,
  Clock,
  BookOpen,
  Brain,
  Lightbulb,
  Activity,
  Calendar,
  Star,
  CheckCircle
} from 'lucide-react';
import './AnalyticsSection.css';

interface AnalyticsSectionProps {
  user: any;
  language: 'ar' | 'en';
  isDarkMode: boolean;
  sidebarExpanded?: boolean;
}

interface StudentData {
  totalSessions: number;
  totalTime: number;
  questionsAnswered: number;
  tasksCompleted: number;
  reportsGenerated: number;
  averageScore: number;
  weeklyProgress: number[];
  sectionProgress: {
    lectures: number;
    questions: number;
    tasks: number;
    reports: number;
  };
  strengths: string[];
  improvements: string[];
  learningPattern: string;
  predictedPerformance: number;
  recommendedActions: string[];
  skillsMatrix: { [key: string]: number };
  timeDistribution: { [key: string]: number };
  engagementLevel: number;
  difficultyPreference: string;
  optimalStudyTime: string;
}

interface AIAnalysis {
  overallAssessment: string;
  detailedInsights: string[];
  personalizedRecommendations: string[];
  learningPathSuggestions: string[];
  strengthsAnalysis: string[];
  improvementAreas: string[];
  motivationalMessage: string;
  nextSteps: string[];
  performancePrediction: {
    nextWeek: number;
    nextMonth: number;
    confidence: number;
  };
}

const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({ language, isDarkMode, sidebarExpanded = false }) => {
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentModel, setCurrentModel] = useState('');

  // OpenRouter API Key
  const OPENROUTER_API_KEY = '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';

  // نماذج الذكاء الاصطناعي المتخصصة في التحليل
  const AI_MODELS = [
    {
      name: 'meta-llama/llama-3.1-70b-instruct:free',
      specialty: 'تحليل البيانات المتقدم',
      strength: 'فهم عميق للأنماط'
    },
    {
      name: 'microsoft/wizardlm-2-8x22b:free',
      specialty: 'التحليل النفسي التعليمي',
      strength: 'فهم السلوك التعليمي'
    },
    {
      name: 'meta-llama/llama-3.1-8b-instruct:free',
      specialty: 'التوصيات الشخصية',
      strength: 'اقتراحات عملية'
    },
    {
      name: 'qwen/qwen-2-7b-instruct:free',
      specialty: 'تحليل الأداء',
      strength: 'قياس التقدم'
    },
    {
      name: 'google/gemma-2-9b-it:free',
      specialty: 'التنبؤ بالأداء',
      strength: 'توقعات دقيقة'
    }
  ];
  const translations = {
    ar: {
      title: 'تحليل الأداء الذكي',
      subtitle: 'تحليل شامل لأدائك التعليمي مع نصائح مخصصة',
      totalSessions: 'إجمالي الجلسات',
      studyTime: 'وقت الدراسة',
      averageScore: 'المعدل العام',
      weeklyProgress: 'التقدم الأسبوعي',
      performanceChart: 'مخطط الأداء',
      sectionProgress: 'تقدم الأقسام',
      lectures: 'المحاضرات',
      questions: 'الأسئلة',
      tasks: 'المهام',
      reports: 'التقارير',
      smartTips: 'نصائح ذكية',
      strengths: 'نقاط القوة',
      improvements: 'مجالات التحسين',
      hours: 'ساعة',
      minutes: 'دقيقة',
      sessions: 'جلسة',
      answered: 'مجاب',
      completed: 'مكتمل',
      generated: 'مولد',
      viewDetails: 'عرض التفاصيل',
      thisWeek: 'هذا الأسبوع',
      lastWeek: 'الأسبوع الماضي',
      improvement: 'تحسن',
      decline: 'انخفاض'
    },
    en: {
      title: 'Smart Performance Analytics',
      subtitle: 'Comprehensive analysis of your educational performance with personalized tips',
      totalSessions: 'Total Sessions',
      studyTime: 'Study Time',
      averageScore: 'Average Score',
      weeklyProgress: 'Weekly Progress',
      performanceChart: 'Performance Chart',
      sectionProgress: 'Section Progress',
      lectures: 'Lectures',
      questions: 'Questions',
      tasks: 'Tasks',
      reports: 'Reports',
      smartTips: 'Smart Tips',
      strengths: 'Strengths',
      improvements: 'Areas for Improvement',
      hours: 'hours',
      minutes: 'min',
      sessions: 'sessions',
      answered: 'answered',
      completed: 'completed',
      generated: 'generated',
      viewDetails: 'View Details',
      thisWeek: 'This Week',
      lastWeek: 'Last Week',
      improvement: 'improvement',
      decline: 'decline'
    }
  };

  const t = translations[language];

  // تحميل البيانات الحقيقية
  useEffect(() => {
    const loadStudentData = async () => {
      setIsLoading(true);

      try {
        // الحصول على معرف المستخدم
        const userId = localStorage.getItem('userId') || 'demo-user';

        // استيراد خدمة الإحصائيات
        const { default: statisticsService } = await import('../../services/statisticsService');

        // جلب الإحصائيات الحقيقية
        const response = await statisticsService.getUserStatistics(userId);

        if (response.success && response.data) {
          const realData = response.data;

          // تحويل البيانات الحقيقية إلى التنسيق المطلوب
          const formattedData: StudentData = {
            totalSessions: realData.totalSessions || 0,
            totalTime: realData.studyTime || 0,
            questionsAnswered: realData.questionsAnswered || 0,
            tasksCompleted: realData.tasksCompleted || 0,
            reportsGenerated: realData.reportsGenerated || 0,
            averageScore: realData.averageScore || 0,
            weeklyProgress: realData.weeklyProgress || [0, 0, 0, 0, 0, 0, 0],
            sectionProgress: realData.sectionProgress || {
              lectures: 0,
              questions: 0,
              tasks: 0,
              reports: 0
            },
            strengths: realData.totalSessions > 10 ?
              (language === 'ar' ? ['التفاعل المستمر', 'الالتزام بالجدول'] : ['Consistent engagement', 'Schedule adherence']) :
              (language === 'ar' ? ['بداية جيدة', 'حماس للتعلم'] : ['Good start', 'Learning enthusiasm']),
            improvements: realData.averageScore < 70 ?
              (language === 'ar' ? ['تحسين الدرجات', 'مراجعة المفاهيم'] : ['Improve scores', 'Review concepts']) :
              (language === 'ar' ? ['الحفاظ على الأداء', 'التطوير المستمر'] : ['Maintain performance', 'Continuous development'])
          };

          setStudentData(formattedData);
        } else {
          // استخدام بيانات افتراضية إذا لم تتوفر بيانات حقيقية
          const mockData: StudentData = {
          totalSessions: 47,
          totalTime: 2340, // بالدقائق
          questionsAnswered: 156,
          tasksCompleted: 23,
          reportsGenerated: 8,
          averageScore: 87.5,
          weeklyProgress: [65, 72, 78, 85, 87, 89, 92],
          sectionProgress: {
            lectures: 78,
            questions: 85,
            tasks: 67,
            reports: 92
          },
          strengths: language === 'ar' ? [
            'سرعة في حل المسائل الرياضية',
            'فهم ممتاز للمفاهيم النظرية',
            'انتظام في الدراسة',
            'تفاعل جيد مع المحتوى'
          ] : [
            'Quick problem-solving skills',
            'Excellent theoretical understanding',
            'Consistent study habits',
            'Good content engagement'
          ],
          improvements: language === 'ar' ? [
            'تحسين الأداء في المهام العملية',
            'زيادة وقت الدراسة اليومي',
            'مراجعة المواضيع الصعبة',
            'التركيز على التطبيق العملي'
          ] : [
            'Improve practical task performance',
            'Increase daily study time',
            'Review challenging topics',
            'Focus on practical application'
          ]
          };

          setStudentData(mockData);
        }

      } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        // استخدام بيانات افتراضية في حالة الخطأ
        const fallbackData: StudentData = {
          totalSessions: 0,
          totalTime: 0,
          questionsAnswered: 0,
          tasksCompleted: 0,
          reportsGenerated: 0,
          averageScore: 0,
          weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
          sectionProgress: {
            lectures: 0,
            questions: 0,
            tasks: 0,
            reports: 0
          },
          strengths: language === 'ar' ? ['مستخدم جديد'] : ['New user'],
          improvements: language === 'ar' ? ['ابدأ رحلة التعلم'] : ['Start learning journey']
        };
        setStudentData(fallbackData);
      }

      setIsLoading(false);
    };

    loadStudentData();
  }, [language]);

  // تحديث التحليل تلقائياً عند تغيير البيانات
  useEffect(() => {
    if (studentData && !isAnalyzing && !aiAnalysis) {
      // تحليل تلقائي بعد تحميل البيانات بـ 3 ثوان
      const autoAnalysisTimer = setTimeout(() => {
        console.log('🤖 بدء التحليل التلقائي...');
        performAdvancedAIAnalysis(studentData);
      }, 3000);

      return () => clearTimeout(autoAnalysisTimer);
    }
  }, [studentData, isAnalyzing, aiAnalysis]);

  // تحويل الوقت إلى ساعات ودقائق
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours} ${t.hours} ${mins} ${t.minutes}`;
    }
    return `${mins} ${t.minutes}`;
  };

  // دالة التحليل الذكي المتقدم باستخدام نماذج متعددة
  const performAdvancedAIAnalysis = async (data: StudentData) => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    const analysisResults: any[] = [];

    try {
      // تحليل متوازي باستخدام نماذج متعددة
      for (let i = 0; i < AI_MODELS.length; i++) {
        const model = AI_MODELS[i];
        setCurrentModel(model.specialty);
        setAnalysisProgress((i / AI_MODELS.length) * 100);

        try {
          const analysis = await analyzeWithModel(model, data);
          if (analysis) {
            analysisResults.push({
              model: model.name,
              specialty: model.specialty,
              analysis: analysis
            });
          }
        } catch (error) {
          console.error(`❌ فشل النموذج ${model.name}:`, error);
          continue;
        }

        // تأخير قصير بين النماذج
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // دمج النتائج من جميع النماذج
      const combinedAnalysis = combineAnalysisResults(analysisResults, data);
      setAiAnalysis(combinedAnalysis);

      console.log(`✅ تم التحليل بنجاح باستخدام ${analysisResults.length} نموذج`);

    } catch (error) {
      console.error('❌ خطأ في التحليل الذكي:', error);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(100);
      setCurrentModel('');
    }
  };

  // تحليل باستخدام نموذج واحد
  const analyzeWithModel = async (model: any, data: StudentData) => {
    const prompt = createAnalysisPrompt(model.specialty, data);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Educational Analytics Platform'
      },
      body: JSON.stringify({
        model: model.name,
        messages: [
          {
            role: 'system',
            content: `You are an expert educational data analyst specializing in ${model.specialty}. Provide deep, actionable insights based on student performance data.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const result = await response.json();
    return result.choices[0].message.content;
  };

  // إنشاء prompt مخصص لكل نموذج
  const createAnalysisPrompt = (specialty: string, data: StudentData) => {
    const weeklyChange = getWeeklyChange(data.weeklyProgress);
    const totalStudyHours = Math.floor(data.totalTime / 60);
    const avgSessionTime = Math.round(data.totalTime / data.totalSessions);
    const completionRate = Math.round(
      (data.questionsAnswered + data.tasksCompleted + data.reportsGenerated) /
      (data.totalSessions * 3) * 100
    );

    const baseData = `
Student Performance Analytics:
- Total Learning Sessions: ${data.totalSessions}
- Total Study Time: ${data.totalTime} minutes (${totalStudyHours} hours)
- Average Session Duration: ${avgSessionTime} minutes
- Questions Answered: ${data.questionsAnswered}
- Tasks Completed: ${data.tasksCompleted}
- Reports Generated: ${data.reportsGenerated}
- Overall Average Score: ${data.averageScore}%
- Weekly Progress Trend: [${data.weeklyProgress.join(', ')}] (${weeklyChange > 0 ? '+' : ''}${weeklyChange}% change)
- Section Completion Rates:
  * Lectures: ${data.sectionProgress.lectures}%
  * Questions: ${data.sectionProgress.questions}%
  * Tasks: ${data.sectionProgress.tasks}%
  * Reports: ${data.sectionProgress.reports}%
- Activity Completion Rate: ${completionRate}%
- Current Strengths: ${data.strengths.join(', ')}
- Areas for Improvement: ${data.improvements.join(', ')}
`;

    const prompts = {
      'تحليل البيانات المتقدم': `${baseData}
As an advanced data analyst, identify hidden patterns, correlations, and trends in this student's learning data. Focus on:
1. Statistical insights and data patterns
2. Performance correlations across different activities
3. Learning velocity and acceleration patterns
4. Predictive indicators for future performance
Provide analysis in ${language === 'ar' ? 'Arabic' : 'English'}.`,

      'التحليل النفسي التعليمي': `${baseData}
As an educational psychologist, analyze the psychological and behavioral aspects of this student's learning journey. Focus on:
1. Learning motivation and engagement patterns
2. Cognitive load and mental fatigue indicators
3. Learning style preferences and adaptations
4. Emotional learning state assessment
Provide analysis in ${language === 'ar' ? 'Arabic' : 'English'}.`,

      'التوصيات الشخصية': `${baseData}
As a personalized learning specialist, create specific, actionable recommendations for this student. Focus on:
1. Customized study strategies and techniques
2. Optimal learning schedule and time management
3. Skill development priorities and pathways
4. Resource recommendations and learning tools
Provide recommendations in ${language === 'ar' ? 'Arabic' : 'English'}.`,

      'تحليل الأداء': `${baseData}
As a performance analyst, evaluate the student's current performance and progress trajectory. Focus on:
1. Performance benchmarking and comparisons
2. Strength and weakness identification
3. Progress rate analysis and milestones
4. Achievement gap analysis and solutions
Provide analysis in ${language === 'ar' ? 'Arabic' : 'English'}.`,

      'التنبؤ بالأداء': `${baseData}
As a predictive analytics expert, forecast the student's future performance and learning outcomes. Focus on:
1. Short-term and long-term performance predictions
2. Risk assessment and early warning indicators
3. Success probability calculations
4. Intervention timing and strategy recommendations
Provide predictions in ${language === 'ar' ? 'Arabic' : 'English'}.`
    };

    return prompts[specialty as keyof typeof prompts] || prompts['تحليل البيانات المتقدم'];
  };

  // دمج نتائج التحليل من جميع النماذج
  const combineAnalysisResults = (results: any[], data: StudentData): AIAnalysis => {
    const insights: string[] = [];
    const recommendations: string[] = [];
    const strengths: string[] = [];
    const improvements: string[] = [];
    const nextSteps: string[] = [];

    // استخراج المعلومات من كل نموذج
    results.forEach(result => {
      const lines = result.analysis.split('\n').filter((line: string) => line.trim().length > 0);

      // تصنيف المحتوى حسب النوع
      lines.forEach((line: string) => {
        if (line.includes('insight') || line.includes('pattern') || line.includes('تحليل') || line.includes('نمط')) {
          insights.push(line.trim());
        } else if (line.includes('recommend') || line.includes('suggest') || line.includes('توصية') || line.includes('اقتراح')) {
          recommendations.push(line.trim());
        } else if (line.includes('strength') || line.includes('good') || line.includes('قوة') || line.includes('جيد')) {
          strengths.push(line.trim());
        } else if (line.includes('improve') || line.includes('weakness') || line.includes('تحسين') || line.includes('ضعف')) {
          improvements.push(line.trim());
        } else if (line.includes('next') || line.includes('step') || line.includes('التالي') || line.includes('خطوة')) {
          nextSteps.push(line.trim());
        }
      });
    });

    // حساب التنبؤات بناءً على البيانات الحقيقية
    const weeklyTrend = getWeeklyChange(data.weeklyProgress);
    const sessionConsistency = data.totalSessions > 30 ? 0.9 : data.totalSessions / 30 * 0.9;
    const activityBalance = Math.min(1, (data.questionsAnswered + data.tasksCompleted + data.reportsGenerated) / 100);

    const performancePrediction = {
      nextWeek: Math.min(100, Math.max(0,
        data.averageScore + (parseFloat(weeklyTrend) * 0.3) + (sessionConsistency * 5)
      )),
      nextMonth: Math.min(100, Math.max(0,
        data.averageScore + (parseFloat(weeklyTrend) * 1.2) + (activityBalance * 10)
      )),
      confidence: Math.min(95, 60 + (sessionConsistency * 30) + (activityBalance * 15))
    };

    return {
      overallAssessment: language === 'ar'
        ? `تحليل شامل لأداء الطالب باستخدام ${results.length} نموذج ذكي متخصص`
        : `Comprehensive student performance analysis using ${results.length} specialized AI models`,
      detailedInsights: insights.slice(0, 8),
      personalizedRecommendations: recommendations.slice(0, 6),
      learningPathSuggestions: nextSteps.slice(0, 4),
      strengthsAnalysis: strengths.slice(0, 5),
      improvementAreas: improvements.slice(0, 5),
      motivationalMessage: generateMotivationalMessage(data, parseFloat(weeklyTrend), language),
      nextSteps: nextSteps.slice(0, 6),
      performancePrediction
    };
  };

  // حساب التغيير الأسبوعي
  const getWeeklyChange = (data: number[]) => {
    if (data.length < 2) return 0;
    const current = data[data.length - 1];
    const previous = data[data.length - 2];
    return ((current - previous) / previous * 100).toFixed(1);
  };

  // توليد رسالة تحفيزية ذكية بناءً على الأداء
  const generateMotivationalMessage = (data: StudentData, weeklyTrend: number, lang: string) => {
    const isArabic = lang === 'ar';
    const avgScore = data.averageScore;
    const totalSessions = data.totalSessions;
    const activityLevel = data.questionsAnswered + data.tasksCompleted + data.reportsGenerated;

    if (avgScore >= 90 && weeklyTrend > 5) {
      return isArabic
        ? `🌟 أداء استثنائي! أنت في المقدمة مع ${avgScore}% ونمو أسبوعي ${weeklyTrend}%. استمر في هذا التميز!`
        : `🌟 Exceptional performance! You're leading with ${avgScore}% and ${weeklyTrend}% weekly growth. Keep up this excellence!`;
    } else if (avgScore >= 80 && totalSessions > 30) {
      return isArabic
        ? `🚀 أداء قوي ومستمر! ${totalSessions} جلسة تعليمية تظهر التزامك. أنت على الطريق الصحيح!`
        : `🚀 Strong and consistent performance! ${totalSessions} learning sessions show your commitment. You're on the right track!`;
    } else if (weeklyTrend > 0 && activityLevel > 50) {
      return isArabic
        ? `📈 تحسن ملحوظ! نشاطك المتزايد (${activityLevel} نشاط) يؤتي ثماره. استمر في هذا المسار!`
        : `📈 Notable improvement! Your increasing activity (${activityLevel} activities) is paying off. Keep this momentum!`;
    } else if (avgScore >= 70) {
      return isArabic
        ? `💪 أداء جيد! مع المزيد من التركيز يمكنك الوصول للمستوى التالي. أنت قادر على ذلك!`
        : `💪 Good performance! With more focus you can reach the next level. You've got this!`;
    } else {
      return isArabic
        ? `🌱 كل خطوة تقربك من هدفك! ركز على نقاط قوتك وستلاحظ التحسن قريباً.`
        : `🌱 Every step brings you closer to your goal! Focus on your strengths and you'll see improvement soon.`;
    }
  };

  if (isLoading) {
    return (
      <div
        className={`analytics-container ${isDarkMode ? 'dark' : ''} ${language === 'ar' ? 'rtl' : 'ltr'}`}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="analytics-content">
          <motion.div
            className="flex items-center justify-center h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-center">
              <motion.div
                className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full mx-auto mb-4"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <p className="text-gray-600 dark:text-gray-300">
                {language === 'ar' ? 'جاري تحليل البيانات...' : 'Analyzing data...'}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!studentData) return null;

  return (
    <div
      className={`analytics-container ${isDarkMode ? 'dark' : ''} ${language === 'ar' ? 'rtl' : 'ltr'}`}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="analytics-content">
        {/* هيدر التحليل */}
        <motion.div
          className="analytics-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="analytics-title-section">
            <div>
              <h1 className="analytics-title">
                <BarChart3 size={28} />
                {t.title}
              </h1>
              <p className="analytics-subtitle">{t.subtitle}</p>
            </div>
          </div>

          <div className="analytics-quick-stats">
            <div className="analytics-quick-stat">
              <Calendar size={16} />
              <span className="analytics-quick-stat-number">{studentData.totalSessions}</span>
              <span className="analytics-quick-stat-label">{t.sessions}</span>
            </div>
            <div className="analytics-quick-stat">
              <Clock size={16} />
              <span className="analytics-quick-stat-number">{formatTime(studentData.totalTime)}</span>
            </div>
            <div className="analytics-quick-stat">
              <TrendingUp size={16} />
              <span className="analytics-quick-stat-number">{studentData.averageScore}%</span>
              <span className="analytics-quick-stat-label">{t.averageScore}</span>
            </div>
            <div className="analytics-quick-stat">
              <Brain size={16} />
              <span className="analytics-quick-stat-number">
                {getWeeklyChange(studentData.weeklyProgress) > 0 ? '+' : ''}{getWeeklyChange(studentData.weeklyProgress)}%
              </span>
              <span className="analytics-quick-stat-label">{language === 'ar' ? 'النمو الأسبوعي' : 'Weekly Growth'}</span>
            </div>
          </div>

          {/* زر التحليل الذكي المتقدم */}
          <motion.button
            className={`analytics-ai-button ${isAnalyzing ? 'analyzing' : ''}`}
            onClick={() => performAdvancedAIAnalysis(studentData)}
            disabled={isAnalyzing}
            whileHover={!isAnalyzing ? { scale: 1.02 } : {}}
            whileTap={!isAnalyzing ? { scale: 0.98 } : {}}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {isAnalyzing ? (
              <>
                <div className="analytics-ai-spinner"></div>
                <span>{language === 'ar' ? 'جاري التحليل الذكي...' : 'AI Analysis in Progress...'}</span>
              </>
            ) : (
              <>
                <Brain size={20} />
                <span>
                  {aiAnalysis
                    ? (language === 'ar' ? 'إعادة تحليل ذكي' : 'Re-analyze with AI')
                    : (language === 'ar' ? 'تحليل ذكي متقدم بـ 5 نماذج' : 'Advanced AI Analysis with 5 Models')
                  }
                </span>
              </>
            )}
          </motion.button>

          {/* شريط تقدم التحليل */}
          {isAnalyzing && (
            <motion.div
              className="analytics-progress-container"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
              <div className="analytics-progress-bar">
                <motion.div
                  className="analytics-progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${analysisProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="analytics-progress-text">
                <span>{currentModel}</span>
                <span>{Math.round(analysisProgress)}%</span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* عرض نتائج التحليل الذكي */}
        {aiAnalysis && (
          <motion.div
            className="analytics-ai-results"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="analytics-ai-header">
              <h2 className="analytics-ai-title">
                <Brain size={24} />
                {language === 'ar' ? 'نتائج التحليل الذكي المتقدم' : 'Advanced AI Analysis Results'}
              </h2>
              <div className="analytics-ai-badges">
                <div className="analytics-ai-badge">
                  {language === 'ar' ? `${AI_MODELS.length} نماذج ذكية` : `${AI_MODELS.length} AI Models`}
                </div>
                <div className="analytics-ai-badge success">
                  {language === 'ar' ? 'تحليل مكتمل' : 'Analysis Complete'}
                </div>
              </div>
            </div>

            <div className="analytics-ai-grid">
              {/* التقييم العام */}
              <div className="analytics-ai-card">
                <h3>{language === 'ar' ? 'التقييم العام' : 'Overall Assessment'}</h3>
                <p>{aiAnalysis.overallAssessment}</p>
              </div>

              {/* الرؤى التفصيلية */}
              <div className="analytics-ai-card">
                <h3>{language === 'ar' ? 'رؤى تفصيلية' : 'Detailed Insights'}</h3>
                <ul>
                  {aiAnalysis.detailedInsights.map((insight, index) => (
                    <li key={index}>{insight}</li>
                  ))}
                </ul>
              </div>

              {/* التوصيات الشخصية */}
              <div className="analytics-ai-card">
                <h3>{language === 'ar' ? 'توصيات شخصية' : 'Personalized Recommendations'}</h3>
                <ul>
                  {aiAnalysis.personalizedRecommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>

              {/* نقاط القوة */}
              <div className="analytics-ai-card">
                <h3>{language === 'ar' ? 'نقاط القوة' : 'Strengths'}</h3>
                <ul>
                  {aiAnalysis.strengthsAnalysis.map((strength, index) => (
                    <li key={index}>{strength}</li>
                  ))}
                </ul>
              </div>

              {/* مجالات التحسين */}
              <div className="analytics-ai-card">
                <h3>{language === 'ar' ? 'مجالات التحسين' : 'Improvement Areas'}</h3>
                <ul>
                  {aiAnalysis.improvementAreas.map((area, index) => (
                    <li key={index}>{area}</li>
                  ))}
                </ul>
              </div>

              {/* التنبؤ بالأداء */}
              <div className="analytics-ai-card">
                <h3>{language === 'ar' ? 'التنبؤ بالأداء' : 'Performance Prediction'}</h3>
                <div className="analytics-prediction">
                  <div className="analytics-prediction-item">
                    <span>{language === 'ar' ? 'الأسبوع القادم:' : 'Next Week:'}</span>
                    <span className="analytics-prediction-value">{Math.round(aiAnalysis.performancePrediction.nextWeek)}%</span>
                  </div>
                  <div className="analytics-prediction-item">
                    <span>{language === 'ar' ? 'الشهر القادم:' : 'Next Month:'}</span>
                    <span className="analytics-prediction-value">{Math.round(aiAnalysis.performancePrediction.nextMonth)}%</span>
                  </div>
                  <div className="analytics-prediction-item">
                    <span>{language === 'ar' ? 'مستوى الثقة:' : 'Confidence:'}</span>
                    <span className="analytics-prediction-confidence">{Math.round(aiAnalysis.performancePrediction.confidence)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* رسالة تحفيزية */}
            <div className="analytics-motivation">
              <h3>{language === 'ar' ? 'رسالة تحفيزية' : 'Motivational Message'}</h3>
              <p>{aiAnalysis.motivationalMessage}</p>
            </div>
          </motion.div>
        )}

        {/* الشبكة الرئيسية */}
        <div className="analytics-grid">
          {/* الجانب الأيسر - الرسوم البيانية */}
          <div>
            {/* مخطط الأداء */}
            <motion.div
              className="analytics-card"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="analytics-card-header">
                <h3 className="analytics-card-title">
                  <Activity size={20} />
                  {t.performanceChart}
                </h3>
                <button className="analytics-card-action">{t.viewDetails}</button>
              </div>

              <div className="analytics-chart-area">
                <div className="analytics-chart-placeholder">
                  <BarChart3 size={48} />
                  <p>{language === 'ar' ? 'رسم بياني تفاعلي للأداء' : 'Interactive Performance Chart'}</p>
                </div>
              </div>

              <div className="analytics-metrics">
                <div className="analytics-metric">
                  <div className="analytics-metric-value">{studentData.questionsAnswered}</div>
                  <div className="analytics-metric-label">{t.questions} {t.answered}</div>
                </div>
                <div className="analytics-metric">
                  <div className="analytics-metric-value">{studentData.tasksCompleted}</div>
                  <div className="analytics-metric-label">{t.tasks} {t.completed}</div>
                </div>
                <div className="analytics-metric">
                  <div className="analytics-metric-value">{studentData.reportsGenerated}</div>
                  <div className="analytics-metric-label">{t.reports} {t.generated}</div>
                </div>
                <div className="analytics-metric">
                  <div className="analytics-metric-value">
                    {getWeeklyChange(studentData.weeklyProgress) > 0 ? '+' : ''}{getWeeklyChange(studentData.weeklyProgress)}%
                  </div>
                  <div className="analytics-metric-label">{t.weeklyProgress}</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* الجانب الأيمن */}
          <div className="analytics-sidebar">
            {/* بطاقة النصائح الذكية */}
            <motion.div
              className="analytics-tips-card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <h3 className="analytics-tips-title">
                <Lightbulb size={20} />
                {t.smartTips}
              </h3>
              <ul className="analytics-tips-list">
                {studentData.improvements.slice(0, 3).map((tip, index) => (
                  <motion.li
                    key={index}
                    className="analytics-tip-item"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                  >
                    {tip}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* بطاقة تقدم الأقسام */}
            <motion.div
              className="analytics-progress-card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <h3 className="analytics-progress-title">
                <Target size={20} />
                {t.sectionProgress}
              </h3>

              <div className="analytics-progress-item">
                <div className="analytics-progress-label">
                  <span className="analytics-progress-name">
                    <BookOpen size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    {t.lectures}
                  </span>
                  <span className="analytics-progress-value">{studentData.sectionProgress.lectures}%</span>
                </div>
                <div className="analytics-progress-bar">
                  <motion.div
                    className="analytics-progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${studentData.sectionProgress.lectures}%` }}
                    transition={{ duration: 1, delay: 0.6 }}
                  />
                </div>
              </div>

              <div className="analytics-progress-item">
                <div className="analytics-progress-label">
                  <span className="analytics-progress-name">
                    <Brain size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    {t.questions}
                  </span>
                  <span className="analytics-progress-value">{studentData.sectionProgress.questions}%</span>
                </div>
                <div className="analytics-progress-bar">
                  <motion.div
                    className="analytics-progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${studentData.sectionProgress.questions}%` }}
                    transition={{ duration: 1, delay: 0.7 }}
                  />
                </div>
              </div>

              <div className="analytics-progress-item">
                <div className="analytics-progress-label">
                  <span className="analytics-progress-name">
                    <CheckCircle size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    {t.tasks}
                  </span>
                  <span className="analytics-progress-value">{studentData.sectionProgress.tasks}%</span>
                </div>
                <div className="analytics-progress-bar">
                  <motion.div
                    className="analytics-progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${studentData.sectionProgress.tasks}%` }}
                    transition={{ duration: 1, delay: 0.8 }}
                  />
                </div>
              </div>

              <div className="analytics-progress-item">
                <div className="analytics-progress-label">
                  <span className="analytics-progress-name">
                    <Award size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    {t.reports}
                  </span>
                  <span className="analytics-progress-value">{studentData.sectionProgress.reports}%</span>
                </div>
                <div className="analytics-progress-bar">
                  <motion.div
                    className="analytics-progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${studentData.sectionProgress.reports}%` }}
                    transition={{ duration: 1, delay: 0.9 }}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsSection;
