import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Upload,
  FileText,
  Settings,
  Sparkles,
  X,
  Clock,
  CheckCircle,
  Star,
  BookOpen,
  Target,
  Loader
} from 'lucide-react';
import './QuestionsSection.css';

interface QuestionsSectionProps {
  user: any;
  language: 'ar' | 'en';
  isDarkMode: boolean;
  sidebarExpanded?: boolean;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  userAnswer?: number;
  isAnswered: boolean;
  cognitiveLevel?: string; // مستوى التفكير المطلوب
  relatedConcepts?: string[]; // المفاهيم المرتبطة
  isIntelligent?: boolean; // هل هو سؤال ذكي
  sourceAnalysis?: any; // تحليل المصدر
}

const QuestionsSection: React.FC<QuestionsSectionProps> = ({ language, isDarkMode, sidebarExpanded = false }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [preferences, setPreferences] = useState({
    difficulty: 'medium',
    questionCount: 5
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dailyUsage, setDailyUsage] = useState(0);
  const [usageResetDate, setUsageResetDate] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google AI API Key
  const GOOGLE_AI_KEY = 'AIzaSyA3fOUxfsIderXu3IMzrZb8ejhCGOrYm_c';

  // حد الاستخدام اليومي
  const DAILY_LIMIT = 5;

  // تحليل نوع المحتوى تلقائياً
  const analyzeContentType = (content: string) => {
    const lowerContent = content.toLowerCase();

    // كلمات مفتاحية لأنواع مختلفة من المحتوى
    const patterns = {
      programming: ['function', 'class', 'variable', 'algorithm', 'code', 'programming', 'برمجة', 'كود', 'دالة', 'متغير'],
      science: ['experiment', 'theory', 'hypothesis', 'research', 'study', 'تجربة', 'نظرية', 'بحث', 'دراسة'],
      history: ['year', 'century', 'war', 'empire', 'civilization', 'سنة', 'قرن', 'حرب', 'إمبراطورية', 'حضارة'],
      literature: ['poem', 'novel', 'author', 'character', 'story', 'قصيدة', 'رواية', 'مؤلف', 'شخصية', 'قصة'],
      math: ['equation', 'formula', 'theorem', 'proof', 'calculate', 'معادلة', 'صيغة', 'نظرية', 'برهان', 'حساب'],
      business: ['market', 'profit', 'company', 'strategy', 'management', 'سوق', 'ربح', 'شركة', 'استراتيجية', 'إدارة']
    };

    let detectedType = 'general';
    let maxMatches = 0;

    for (const [type, keywords] of Object.entries(patterns)) {
      const matches = keywords.filter(keyword => lowerContent.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedType = type;
      }
    }

    // استخراج الموضوع الرئيسي
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const firstSentence = sentences[0]?.trim() || '';
    const mainTopic = firstSentence.substring(0, 100) + (firstSentence.length > 100 ? '...' : '');

    return {
      type: detectedType,
      mainTopic: mainTopic,
      confidence: maxMatches
    };
  };
  const translations = {
    ar: {
      title: 'مولد الأسئلة الذكي',
      subtitle: 'ارفع ملفك واحصل على أسئلة اختيار متعدد تفاعلية',
      uploadTitle: 'رفع الملف',
      uploadText: 'اسحب وأفلت ملفك هنا أو انقر للاختيار',
      uploadSubtext: 'يدعم PDF, DOC, DOCX, TXT (حتى 10 ميجابايت)',
      preferencesTitle: 'إعدادات الأسئلة',
      difficulty: 'مستوى الصعوبة',
      questionCount: 'عدد الأسئلة',
      easy: 'سهل',
      medium: 'متوسط',
      hard: 'صعب',
      mixed: 'متعدد (جميع المستويات)',
      generateQuestions: 'توليد الأسئلة الذكية',
      generating: 'جاري التوليد...',
      questionTypeInfo: 'نوع الأسئلة: اختيار متعدد (5 خيارات)',
      startQuestion: 'بدء السؤال',
      minutes: 'دقيقة',
      noQuestions: 'لا توجد أسئلة',
      noQuestionsDesc: 'ارفع ملفاً وحدد التفضيلات لتوليد الأسئلة',
      uploadFirst: 'رفع ملف'
    },
    en: {
      title: 'Smart Question Generator',
      subtitle: 'Upload your file and get interactive multiple choice questions',
      uploadTitle: 'Upload File',
      uploadText: 'Drag and drop your file here or click to select',
      uploadSubtext: 'Supports PDF, DOC, DOCX, TXT (up to 10MB)',
      preferencesTitle: 'Question Settings',
      difficulty: 'Difficulty Level',
      questionCount: 'Number of Questions',
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard',
      mixed: 'Mixed (All Levels)',
      generateQuestions: 'Generate Smart Questions',
      generating: 'Generating...',
      questionTypeInfo: 'Question Type: Multiple Choice (5 options)',
      startQuestion: 'Start Question',
      minutes: 'min',
      noQuestions: 'No Questions',
      noQuestionsDesc: 'Upload a file and set preferences to generate questions',
      uploadFirst: 'Upload File'
    }
  };

  const t = translations[language];

  // إدارة الاستخدام اليومي
  const checkDailyUsage = () => {
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem('questionsUsageDate');
    const storedUsage = parseInt(localStorage.getItem('questionsUsageCount') || '0');

    if (storedDate !== today) {
      // يوم جديد، إعادة تعيين العداد
      localStorage.setItem('questionsUsageDate', today);
      localStorage.setItem('questionsUsageCount', '0');
      setDailyUsage(0);
      setUsageResetDate(today);
      return true;
    } else {
      setDailyUsage(storedUsage);
      setUsageResetDate(storedDate);
      return storedUsage < DAILY_LIMIT;
    }
  };

  const incrementUsage = () => {
    const newUsage = dailyUsage + 1;
    setDailyUsage(newUsage);
    localStorage.setItem('questionsUsageCount', newUsage.toString());
  };

  const getRemainingUsage = () => DAILY_LIMIT - dailyUsage;

  // فحص الاستخدام عند تحميل المكون
  React.useEffect(() => {
    checkDailyUsage();
  }, []);

  // وظائف التعامل مع الملفات
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      analyzeFile(file);
    }
  };

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      setUploadedFile(file);
      analyzeFile(file);
    }
  };

  const analyzeFile = async (file: File) => {
    console.log('🔍 بدء تحليل الملف:', file.name, 'حجم:', file.size, 'نوع:', file.type);
    setIsAnalyzing(true);
    setFileContent('');

    try {
      const text = await extractTextFromFile(file);

      if (!text || text.trim().length === 0) {
        throw new Error('الملف فارغ أو لا يحتوي على نص قابل للقراءة');
      }

      if (text.length < 50) {
        throw new Error('النص قصير جداً. يجب أن يحتوي الملف على 50 حرف على الأقل');
      }

      setFileContent(text);
      console.log('✅ تم تحليل الملف بنجاح:', {
        fileName: file.name,
        textLength: text.length,
        wordCount: text.split(/\s+/).length,
        firstChars: text.substring(0, 100) + '...'
      });

      // إظهار رسالة نجاح
      const successMessage = language === 'ar' ?
        `تم تحليل الملف "${file.name}" بنجاح! تم استخراج ${text.split(/\s+/).length} كلمة.` :
        `File "${file.name}" analyzed successfully! Extracted ${text.split(/\s+/).length} words.`;

      console.log('✅', successMessage);

    } catch (error: any) {
      console.error('❌ خطأ في تحليل الملف:', error);

      const errorMessage = language === 'ar' ?
        `خطأ في تحليل الملف: ${error.message || 'خطأ غير معروف'}` :
        `Error analyzing file: ${error.message || 'Unknown error'}`;

      alert(errorMessage);

      // إعادة تعيين الملف المرفوع
      setUploadedFile(null);
      setFileContent('');

      // إعادة تعيين input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    console.log('📄 نوع الملف:', fileType, 'اسم الملف:', fileName);

    // التعامل مع ملفات PDF
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      try {
        console.log('📖 قراءة ملف PDF...');
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('http://localhost:8080/api/files/extract-text', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ تم استخراج النص من PDF بنجاح');
          return result.data?.content || result.content || '';
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ خطأ من الخادم:', errorData);
          throw new Error(errorData.message || 'فشل في قراءة ملف PDF');
        }
      } catch (error) {
        console.error('❌ خطأ في قراءة PDF:', error);
        throw new Error('لا يمكن قراءة ملف PDF. يرجى تحويله إلى نص عادي.');
      }
    }

    // التعامل مع ملفات Word
    if (fileType.includes('word') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
      try {
        console.log('📝 قراءة ملف Word...');
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('http://localhost:8080/api/files/extract-text', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ تم استخراج النص من Word بنجاح');
          return result.data?.content || result.content || '';
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ خطأ من الخادم:', errorData);
          throw new Error(errorData.message || 'فشل في قراءة ملف Word');
        }
      } catch (error) {
        console.error('❌ خطأ في قراءة Word:', error);
        throw new Error('لا يمكن قراءة ملف Word. يرجى تحويله إلى نص عادي.');
      }
    }

    // التعامل مع الملفات النصية العادية
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        console.log('✅ تم قراءة الملف النصي بنجاح، طول النص:', text.length);
        resolve(text);
      };
      reader.onerror = (error) => {
        console.error('❌ خطأ في قراءة الملف:', error);
        reject(error);
      };
      reader.readAsText(file, 'UTF-8');
    });
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleFileRemove = () => {
    setUploadedFile(null);
    setQuestions([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // توليد الأسئلة باستخدام Google AI
  const handleGenerateQuestions = async () => {
    console.log('🧠 بدء توليد الأسئلة...');

    // فحص حد الاستخدام اليومي
    if (!checkDailyUsage()) {
      alert(language === 'ar' ?
        `لقد استنفدت استخداماتك اليومية (${DAILY_LIMIT} مرات). يرجى المحاولة غداً.` :
        `You have exhausted your daily usage (${DAILY_LIMIT} times). Please try again tomorrow.`
      );
      return;
    }

    if (!fileContent) {
      console.log('❌ لا يوجد محتوى للملف');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('🤖 إرسال طلب إلى خدمة الذكاء الاصطناعي المحسنة...');

      // محاولة استخدام خدمة الخادم أولاً
      try {
        const response = await fetch('http://localhost:8080/api/questions/generate-from-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: fileContent,
            questionCount: preferences.questionCount,
            difficulty: preferences.difficulty,
            language: language
          })
        });

        if (response.ok) {
          const result = await response.json();

          if (result.success && result.data && result.data.length > 0) {
            console.log('✅ تم توليد الأسئلة الذكية بنجاح من الخادم');
            console.log('📊 معلومات الأسئلة:', result.metadata);

            const formattedQuestions: Question[] = result.data.map((q: any, index: number) => ({
              id: q.id || `intelligent-q-${Date.now()}-${index}`,
              question: q.questionText || q.question,
              options: q.options || [],
              correctAnswer: q.correctAnswer || 0,
              explanation: q.explanation || '',
              difficulty: q.difficulty || preferences.difficulty,
              category: q.category || 'general',
              cognitiveLevel: q.cognitiveLevel || 'comprehension',
              relatedConcepts: q.relatedConcepts || [],
              isAnswered: false,
              isIntelligent: true, // علامة للأسئلة الذكية
              sourceAnalysis: q.sourceAnalysis || null
            }));

            setQuestions(formattedQuestions);
            setShowQuiz(true);
            incrementUsage();

            // إظهار رسالة نجاح مع معلومات إضافية
            const successMessage = language === 'ar' ?
              `تم توليد ${formattedQuestions.length} سؤال ذكي بنجاح! المجال: ${result.metadata?.contentDomain || 'عام'}` :
              `Successfully generated ${formattedQuestions.length} intelligent questions! Domain: ${result.metadata?.contentDomain || 'general'}`;

            console.log('✅', successMessage);
            return;
          }
        }
      } catch (serverError) {
        console.log('⚠️ فشل الخادم، التبديل إلى النظام البديل:', serverError);
      }

      // في حالة فشل الخادم، استخدم Google AI مباشرة
      console.log('📡 استخدام Google AI مباشرة كنظام بديل...');

      // تحليل نوع المحتوى تلقائياً
      const contentAnalysis = analyzeContentType(fileContent);

      const prompt = `Generate ${preferences.questionCount} ${preferences.difficulty}-level multiple choice questions in ${language === 'ar' ? 'Arabic' : 'English'} based on this content:

${fileContent.substring(0, 4000)}

Return a JSON array with this exact format:
[
  {
    "question": "Question text here",
    "options": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option", "E) Fifth option"],
    "ans": "A) First option",
    "explanation": "Brief explanation"
  }
]

Requirements:
- Generate exactly ${preferences.questionCount} questions
- Each question has exactly 5 options (A, B, C, D, E)
- Only one option is correct
- Questions test understanding of the provided content
- Use ${language === 'ar' ? 'Arabic' : 'English'} language
- Keep explanations under 150 characters
- Return only valid JSON array, no other text`;

      // استخدام Gemini 1.5 Pro مباشرة
      console.log('🚀 استخدام Gemini 1.5 Pro...');
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GOOGLE_AI_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
            responseMimeType: "application/json"
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      });

      console.log('📊 حالة الاستجابة:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ خطأ في API:', errorText);
        throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📥 استجابة Gemini 1.5 Pro:', data);

      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        console.error('❌ بنية استجابة غير صحيحة:', data);
        throw new Error('Invalid response structure from Gemini API');
      }

      const generatedText = data.candidates[0].content.parts[0].text;
      console.log('📝 النص المولد من Gemini:', generatedText);

      // تنظيف النص واستخراج JSON
      let cleanText = generatedText.trim();
      console.log('📝 النص الخام من Gemini:', cleanText);

      // إزالة أي نص قبل أو بعد JSON
      // البحث عن بداية ونهاية JSON array
      const arrayStart = cleanText.indexOf('[');
      const arrayEnd = cleanText.lastIndexOf(']') + 1;

      if (arrayStart !== -1 && arrayEnd !== -1 && arrayStart < arrayEnd) {
        cleanText = cleanText.substring(arrayStart, arrayEnd);
        console.log('📋 تم استخراج JSON array:', cleanText);
      } else {
        console.log('❌ لم يتم العثور على JSON array صحيح');
        throw new Error('No valid JSON array found in response');
      }

      // تنظيف إضافي للنص
      cleanText = cleanText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .replace(/^\s*[\r\n]/gm, '')
        .trim();

      console.log('🧹 النص المنظف النهائي:', cleanText);

      try {
        let questionsData;

        // محاولة تحليل JSON
        const parsedData = JSON.parse(cleanText);
        console.log('🔍 البيانات المحللة:', parsedData);

        // التحقق من نوع البيانات
        if (Array.isArray(parsedData)) {
          questionsData = parsedData;
          console.log('📋 البيانات عبارة عن array مباشرة');
        } else if (parsedData.questions && Array.isArray(parsedData.questions)) {
          questionsData = parsedData.questions;
          console.log('📦 البيانات في خاصية questions');
        } else if (parsedData.data && Array.isArray(parsedData.data)) {
          questionsData = parsedData.data;
          console.log('📦 البيانات في خاصية data');
        } else {
          console.log('❌ تنسيق غير معروف:', parsedData);
          throw new Error('Invalid JSON format - no questions array found');
        }

        console.log('✅ تم تحليل JSON بنجاح:', questionsData);

        if (!Array.isArray(questionsData) || questionsData.length === 0) {
          throw new Error('Invalid questions format - empty or not an array');
        }

        const formattedQuestions: Question[] = questionsData.map((q: any, index: number) => {
          console.log(`🔍 معالجة السؤال ${index + 1}:`, q);

          // استخراج الإجابة الصحيحة من النص مثل "A) Paris"
          let correctAnswerIndex = 0;
          if (q.ans) {
            const answerLetter = q.ans.charAt(0).toUpperCase();
            const letterToIndex = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4 };
            correctAnswerIndex = letterToIndex[answerLetter as keyof typeof letterToIndex] || 0;
            console.log(`✅ الإجابة الصحيحة للسؤال ${index + 1}: ${answerLetter} (فهرس ${correctAnswerIndex})`);
          }

          // التأكد من وجود 5 خيارات
          let options = q.options || [];
          if (options.length < 5) {
            console.log(`⚠️ السؤال ${index + 1} يحتوي على ${options.length} خيارات فقط، سيتم إضافة خيارات افتراضية`);
            while (options.length < 5) {
              const letter = String.fromCharCode(65 + options.length);
              options.push(`${letter}) خيار إضافي ${options.length + 1}`);
            }
          }

          return {
            id: `gemini_q_${index}`,
            question: q.question || `سؤال ${index + 1}`,
            options: options.slice(0, 5), // التأكد من 5 خيارات فقط
            correctAnswer: correctAnswerIndex,
            explanation: q.explanation || 'لا يوجد تفسير متاح',
            difficulty: preferences.difficulty,
            category: 'multiple-choice',
            isAnswered: false
          };
        });

        console.log('🎯 الأسئلة المنسقة من Gemini 1.5 Pro:', formattedQuestions);
        setQuestions(formattedQuestions);
        setShowQuiz(true);

        // زيادة عداد الاستخدام
        incrementUsage();

        console.log('✅ تم إنشاء الأسئلة بنجاح باستخدام Gemini 1.5 Pro!');

      } catch (parseError) {
        console.error('❌ خطأ في تحليل JSON:', parseError);
        console.log('📄 النص الذي فشل في التحليل:', cleanText);

        // رمي الخطأ للانتقال إلى النظام البديل الذكي
        throw new Error(`JSON parsing failed: ${parseError.message}`);
      }

    } catch (error) {
      console.error('❌ خطأ عام في توليد الأسئلة:', error);
      console.log('🔍 تفاصيل الخطأ:', {
        message: error.message,
        stack: error.stack,
        fileContentLength: fileContent.length,
        preferences: preferences
      });

      // إنشاء أسئلة ذكية من المحتوى كبديل
      console.log('🔄 إنشاء أسئلة بديلة ذكية من المحتوى...');

      const contentAnalysis = analyzeContentType(fileContent);
      const sentences = fileContent.split(/[.!?]+/).filter(s => s.trim().length > 30);
      const fallbackQuestions: Question[] = [];

      // أنواع مختلفة من الأسئلة حسب المحتوى
      const questionTemplates = {
        programming: {
          ar: [
            'ما هو الغرض من',
            'كيف يعمل',
            'ما هي خصائص',
            'متى نستخدم'
          ],
          en: [
            'What is the purpose of',
            'How does',
            'What are the characteristics of',
            'When do we use'
          ]
        },
        general: {
          ar: [
            'ما المقصود بـ',
            'كيف يمكن تفسير',
            'ما أهمية',
            'ما العلاقة بين'
          ],
          en: [
            'What is meant by',
            'How can we explain',
            'What is the importance of',
            'What is the relationship between'
          ]
        }
      };

      const templates = questionTemplates[contentAnalysis.type as keyof typeof questionTemplates] || questionTemplates.general;
      const currentTemplates = templates[language];

      for (let i = 0; i < Math.min(preferences.questionCount, sentences.length); i++) {
        const sentence = sentences[i].trim();
        const words = sentence.split(' ').filter(w => w.length > 4);

        if (words.length > 0) {
          const keyWord = words[Math.floor(Math.random() * Math.min(3, words.length))];
          const template = currentTemplates[i % currentTemplates.length];

          fallbackQuestions.push({
            id: `smart_fallback_${i}`,
            question: `${template} "${keyWord}"؟`,
            options: language === 'ar' ?
              [
                `A) ${keyWord} هو مفهوم أساسي مذكور في النص`,
                `B) ${keyWord} مصطلح ثانوي في السياق`,
                `C) ${keyWord} يشير إلى شيء مختلف تماماً`,
                `D) ${keyWord} غير مرتبط بالموضوع الرئيسي`,
                `E) ${keyWord} مصطلح غير موجود في النص`
              ] :
              [
                `A) ${keyWord} is a fundamental concept mentioned in the text`,
                `B) ${keyWord} is a secondary term in the context`,
                `C) ${keyWord} refers to something completely different`,
                `D) ${keyWord} is unrelated to the main topic`,
                `E) ${keyWord} is not mentioned in the text`
              ],
            correctAnswer: 0,
            explanation: language === 'ar' ?
              `بناءً على السياق: "${sentence.substring(0, 150)}..."` :
              `Based on the context: "${sentence.substring(0, 150)}..."`,
            difficulty: preferences.difficulty,
            category: 'multiple-choice',
            isAnswered: false
          });
        }
      }

      if (fallbackQuestions.length > 0) {
        setQuestions(fallbackQuestions);
        setShowQuiz(true);
        incrementUsage(); // زيادة العداد حتى للأسئلة البديلة
        console.log('✅ تم إنشاء أسئلة بديلة ذكية بنجاح');

        // إشعار المستخدم أن الأسئلة تم إنشاؤها من المحتوى مباشرة
        setTimeout(() => {
          alert(language === 'ar' ?
            'تم إنشاء الأسئلة من تحليل المحتوى مباشرة. قد تختلف جودتها عن الأسئلة المولدة بالذكاء الاصطناعي.' :
            'Questions generated from direct content analysis. Quality may differ from AI-generated questions.'
          );
        }, 1000);
      } else {
        alert(language === 'ar' ?
          'فشل في توليد الأسئلة. يرجى التأكد من أن الملف يحتوي على نص كافٍ.' :
          'Failed to generate questions. Please ensure the file contains sufficient text.'
        );
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestionIndex] = {
      ...updatedQuestions[currentQuestionIndex],
      userAnswer: answerIndex,
      isAnswered: true
    };
    setQuestions(updatedQuestions);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setShowResults(true);
      setShowQuiz(false);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const calculateScore = () => {
    const correctAnswers = questions.filter(q => q.userAnswer === q.correctAnswer).length;
    return Math.round((correctAnswers / questions.length) * 100);
  };

  const resetQuiz = () => {
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setShowQuiz(false);
    setShowResults(false);
    setUploadedFile(null);
    setFileContent('');
  };

  const handleQuestionStart = (questionId: string) => {
    setCurrentQuestionIndex(0);
    setShowQuiz(true);
  };

  return (
    <div
      className={`questions-container ${isDarkMode ? 'dark' : ''} ${language === 'ar' ? 'rtl' : 'ltr'}`}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* المحتوى الرئيسي */}
      <div className="questions-content">
        {/* قسم رفع الملفات */}
        <motion.div
          className="questions-upload-section"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="questions-upload-title">
            <Upload size={24} />
            {t.uploadTitle}
          </h2>

          {!uploadedFile ? (
            <div
              className={`questions-dropzone ${dragOver ? 'dragover' : ''}`}
              onDrop={handleFileDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="questions-dropzone-icon">
                <FileText size={24} />
              </div>
              <div className="questions-dropzone-text">{t.uploadText}</div>
              <div className="questions-dropzone-subtext">{t.uploadSubtext}</div>
            </div>
          ) : (
            <motion.div
              className="questions-uploaded-file"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="questions-file-icon">
                <FileText size={16} />
              </div>
              <div className="questions-file-info">
                <div className="questions-file-name">{uploadedFile.name}</div>
                <div className="questions-file-size">
                  {formatFileSize(uploadedFile.size)}
                  {isAnalyzing && (
                    <span style={{ marginLeft: '8px', color: '#8b5cf6' }}>
                      <Loader className="animate-spin" size={12} style={{ display: 'inline' }} />
                      {language === 'ar' ? ' جاري التحليل...' : ' Analyzing...'}
                    </span>
                  )}
                </div>
              </div>
              <button className="questions-file-remove" onClick={handleFileRemove}>
                <X size={16} />
              </button>
            </motion.div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            className="questions-file-input"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
          />
        </motion.div>

        {/* قسم التفضيلات - يظهر دائماً */}
        <motion.div
            className="questions-preferences-elegant"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              width: '100%',
              minHeight: 'fit-content',
              height: 'auto',
              padding: '24px',
              marginBottom: '20px',
              background: 'var(--card-bg)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}
          >
            <div className="preferences-header" style={{
              width: '100%',
              flex: 'none'
            }}>
              <h3 className="preferences-title" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 0 12px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--text-color)'
              }}>
                <Settings size={20} />
                {t.preferencesTitle}
              </h3>
              <div className="preferences-note" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                color: 'var(--text-secondary)',
                background: 'var(--secondary-bg)',
                padding: '8px 12px',
                borderRadius: '8px',
                width: 'fit-content'
              }}>
                <Target size={14} />
                <span>{language === 'ar' ? 'الأسئلة من نوع اختيارات متعددة' : 'Questions are multiple choice format'}</span>
              </div>
            </div>

            <div className="preferences-content" style={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              flex: 'none'
            }}>
              <div className="preference-item" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <label className="preference-label" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-color)'
                }}>
                  <span className="label-icon">🔢</span>
                  {t.questionCount}
                </label>
                <select
                  className="preference-select"
                  value={preferences.questionCount}
                  onChange={(e) => setPreferences(prev => ({ ...prev, questionCount: parseInt(e.target.value) }))}
                  disabled={isGenerating || isAnalyzing}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--input-bg)',
                    color: 'var(--text-color)',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <option value={3}>3 {language === 'ar' ? 'أسئلة' : 'Questions'}</option>
                  <option value={5}>5 {language === 'ar' ? 'أسئلة' : 'Questions'}</option>
                  <option value={7}>7 {language === 'ar' ? 'أسئلة' : 'Questions'}</option>
                  <option value={10}>10 {language === 'ar' ? 'أسئلة' : 'Questions'}</option>
                </select>
              </div>

              <div className="preference-item" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <label className="preference-label" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-color)'
                }}>
                  <span className="label-icon">⚡</span>
                  {t.difficulty}
                </label>
                <select
                  className="preference-select"
                  value={preferences.difficulty}
                  onChange={(e) => setPreferences(prev => ({ ...prev, difficulty: e.target.value }))}
                  disabled={isGenerating || isAnalyzing}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--input-bg)',
                    color: 'var(--text-color)',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="easy">🟢 {t.easy}</option>
                  <option value="medium">🟡 {t.medium}</option>
                  <option value="hard">⭕️ {t.hard}</option>
                  <option value="mixed">🌈 {t.mixed}</option>
                </select>
              </div>
            </div>

            {/* عرض حالة الاستخدام اليومي */}
            <div className="usage-status" style={{
              width: '100%',
              padding: '16px',
              background: 'var(--secondary-bg)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              flex: 'none'
            }}>
              <div className="usage-info">
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span className="usage-text" style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'var(--text-color)'
                  }}>
                    {language === 'ar' ? 'الاستخدام اليومي' : 'Daily Usage'}
                  </span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--text-color)'
                  }}>
                    {getRemainingUsage()} / {DAILY_LIMIT}
                  </span>
                </div>
                <div className="usage-bar" style={{
                  width: '100%',
                  height: '8px',
                  background: 'var(--border-color)',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div
                    className="usage-fill"
                    style={{
                      width: `${(dailyUsage / DAILY_LIMIT) * 100}%`,
                      height: '100%',
                      background: getRemainingUsage() > 0
                        ? 'linear-gradient(90deg, #10b981, #059669)'
                        : 'linear-gradient(90deg, #ef4444, #dc2626)',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* زر توليد الأسئلة - محسن */}
            <div className="generate-questions-container" style={{
              width: '100%',
              padding: '20px',
              background: 'var(--secondary-bg)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              textAlign: 'center',
              flex: 'none'
            }}>
              <button
                className="generate-questions-btn"
                onClick={handleGenerateQuestions}
                disabled={isGenerating || !uploadedFile || !fileContent || getRemainingUsage() <= 0 || isAnalyzing}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: (!uploadedFile || !fileContent || getRemainingUsage() <= 0 || isAnalyzing || isGenerating) ? 'not-allowed' : 'pointer',
                  background: (!uploadedFile || !fileContent || getRemainingUsage() <= 0 || isAnalyzing || isGenerating)
                    ? 'var(--border-color)'
                    : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  color: (!uploadedFile || !fileContent || getRemainingUsage() <= 0 || isAnalyzing || isGenerating) ? 'var(--text-secondary)' : 'white',
                  transition: 'all 0.3s ease',
                  opacity: (!uploadedFile || !fileContent || getRemainingUsage() <= 0 || isAnalyzing || isGenerating) ? 0.7 : 1,
                  boxShadow: (!uploadedFile || !fileContent || getRemainingUsage() <= 0 || isAnalyzing || isGenerating)
                    ? 'none'
                    : '0 6px 20px rgba(59, 130, 246, 0.3)',
                  transform: 'translateY(0)'
                }}
                onMouseEnter={(e) => {
                  if (!(!uploadedFile || !fileContent || getRemainingUsage() <= 0 || isAnalyzing || isGenerating)) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(!uploadedFile || !fileContent || getRemainingUsage() <= 0 || isAnalyzing || isGenerating)) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.3)';
                  }
                }}
              >
                {isGenerating ? (
                  <>
                    <span style={{ marginRight: '8px' }}>⏳</span>
                    {language === 'ar' ? 'جاري توليد الأسئلة...' : 'Generating Questions...'}
                  </>
                ) : isAnalyzing ? (
                  <>
                    <span style={{ marginRight: '8px' }}>🔍</span>
                    {language === 'ar' ? 'جاري تحليل الملف...' : 'Analyzing File...'}
                  </>
                ) : (
                  <>
                    <span style={{ marginRight: '8px' }}>✨</span>
                    {language === 'ar' ? 'توليد الأسئلة الذكية' : 'Generate Smart Questions'}
                  </>
                )}
              </button>

              {/* رسالة الحالة */}
              <div style={{
                marginTop: '16px',
                padding: '12px',
                borderRadius: '8px',
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)'
              }}>
                {!uploadedFile ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: '#f59e0b',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    <span>⚠️</span>
                    <span>{language === 'ar' ? 'يرجى رفع ملف أولاً' : 'Please upload a file first'}</span>
                  </div>
                ) : isAnalyzing ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: '#3b82f6',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    <span className="animate-spin">🔄</span>
                    <span>{language === 'ar' ? 'جاري تحليل الملف...' : 'Analyzing file...'}</span>
                  </div>
                ) : !fileContent ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: '#ef4444',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    <span>❌</span>
                    <span>{language === 'ar' ? 'فشل في تحليل الملف' : 'Failed to analyze file'}</span>
                  </div>
                ) : getRemainingUsage() <= 0 ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: '#ef4444',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    <span>🚫</span>
                    <span>{language === 'ar' ? 'تم استنفاد الاستخدامات اليومية' : 'Daily usage limit reached'}</span>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: '#10b981',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    <span>✅</span>
                    <span>{language === 'ar' ? 'جاهز لتوليد الأسئلة!' : 'Ready to generate questions!'}</span>
                  </div>
                )}
              </div>
            </div>
        </motion.div>

        {/* نموذج الأسئلة التفاعلي */}
        <AnimatePresence>
          {showQuiz && questions.length > 0 && (
            <motion.div
              className="quiz-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="quiz-content">
                <div className="quiz-header">
                  <div className="quiz-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                      />
                    </div>
                    <span className="question-counter">
                      {currentQuestionIndex + 1} / {questions.length}
                    </span>
                  </div>
                  <button
                    className="quiz-close"
                    onClick={() => setShowQuiz(false)}
                  >
                    ×
                  </button>
                </div>

                <div className="question-card-quiz">
                  <h3 className="question-text">
                    {questions[currentQuestionIndex]?.question}
                  </h3>

                  {questions[currentQuestionIndex]?.options && questions[currentQuestionIndex]?.options.length > 0 ? (
                    <div className="options-list">
                      {questions[currentQuestionIndex]?.options.map((option, index) => (
                        <motion.button
                          key={index}
                          className={`option-btn ${
                            questions[currentQuestionIndex]?.userAnswer === index ? 'selected' : ''
                          } ${
                            questions[currentQuestionIndex]?.isAnswered &&
                            index === questions[currentQuestionIndex]?.correctAnswer ? 'correct' : ''
                          } ${
                            questions[currentQuestionIndex]?.isAnswered &&
                            questions[currentQuestionIndex]?.userAnswer === index &&
                            index !== questions[currentQuestionIndex]?.correctAnswer ? 'incorrect' : ''
                          }`}
                          onClick={() => handleAnswerSelect(index)}
                          disabled={questions[currentQuestionIndex]?.isAnswered}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                          <span className="option-text">{option}</span>
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <div className="no-options-message">
                      <p>{language === 'ar' ? 'هذا السؤال لا يحتوي على خيارات متعددة' : 'This question does not have multiple choice options'}</p>
                      <button
                        className="mark-as-read-btn"
                        onClick={() => {
                          const updatedQuestions = [...questions];
                          updatedQuestions[currentQuestionIndex].isAnswered = true;
                          updatedQuestions[currentQuestionIndex].userAnswer = 0; // علامة كقراءة
                          setQuestions(updatedQuestions);
                        }}
                        disabled={questions[currentQuestionIndex]?.isAnswered}
                      >
                        {questions[currentQuestionIndex]?.isAnswered ?
                          (language === 'ar' ? 'تم القراءة' : 'Read') :
                          (language === 'ar' ? 'تم القراءة' : 'Mark as Read')
                        }
                      </button>
                    </div>
                  )}

                  {questions[currentQuestionIndex]?.isAnswered && (
                    <motion.div
                      className="explanation-box"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <h4>{language === 'ar' ? 'التفسير' : 'Explanation'}</h4>
                      <p>{questions[currentQuestionIndex]?.explanation}</p>
                    </motion.div>
                  )}

                  <div className="quiz-controls">
                    <button
                      className="control-btn secondary"
                      onClick={previousQuestion}
                      disabled={currentQuestionIndex === 0}
                    >
                      {language === 'ar' ? 'السابق' : 'Previous'}
                    </button>

                    {currentQuestionIndex === questions.length - 1 ? (
                      <button
                        className="control-btn primary"
                        onClick={() => setShowResults(true)}
                        disabled={!questions[currentQuestionIndex]?.isAnswered}
                      >
                        {language === 'ar' ? 'النتائج' : 'Results'}
                      </button>
                    ) : (
                      <button
                        className="control-btn primary"
                        onClick={nextQuestion}
                        disabled={!questions[currentQuestionIndex]?.isAnswered}
                      >
                        {language === 'ar' ? 'التالي' : 'Next'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* نتائج الاختبار */}
        <AnimatePresence>
          {showResults && (
            <motion.div
              className="results-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="results-content">
                <div className="score-circle">
                  <div className="score-number">{calculateScore()}%</div>
                  <div className="score-label">{language === 'ar' ? 'النتيجة' : 'Score'}</div>
                </div>

                <div className="results-summary">
                  <div className="result-item correct">
                    <span>{questions.filter(q => q.userAnswer === q.correctAnswer).length}</span>
                    <span>{language === 'ar' ? 'صحيح' : 'Correct'}</span>
                  </div>
                  <div className="result-item incorrect">
                    <span>{questions.filter(q => q.userAnswer !== q.correctAnswer).length}</span>
                    <span>{language === 'ar' ? 'خطأ' : 'Incorrect'}</span>
                  </div>
                </div>

                <div className="results-actions">
                  <button className="restart-btn" onClick={resetQuiz}>
                    {language === 'ar' ? 'إعادة البدء' : 'Restart'}
                  </button>
                  <button className="close-btn" onClick={() => setShowResults(false)}>
                    {language === 'ar' ? 'إغلاق' : 'Close'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* الأسئلة المولدة */}
        <AnimatePresence>
          {questions.length > 0 && !showQuiz && !showResults && (
            <motion.div
              className="questions-grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {questions.map((question, index) => (
                <motion.div
                  key={question.id}
                  className="question-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ y: -4 }}
                  onClick={() => handleQuestionStart(question.id)}
                >
                  {/* رأس البطاقة */}
                  <div className="question-card-header">
                    <span className={`question-difficulty ${question.difficulty}`}>
                      {question.difficulty === 'easy' ? (language === 'ar' ? 'سهل' : 'Easy') :
                       question.difficulty === 'medium' ? (language === 'ar' ? 'متوسط' : 'Medium') :
                       (language === 'ar' ? 'صعب' : 'Hard')}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Target size={14} color="#3b82f6" />
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        {question.options && question.options.length > 0 ?
                          `${question.options.length} ${language === 'ar' ? 'خيارات' : 'options'}` :
                          (language === 'ar' ? 'بدون خيارات' : 'No options')
                        }
                      </span>
                    </div>
                  </div>

                  {/* محتوى السؤال */}
                  <h3 className="question-title">{question.question}</h3>
                  <p className="question-preview">
                    {question.options && question.options.length > 0 ? (
                      question.options.slice(0, 2).map((option, idx) => (
                        <span key={idx} style={{ display: 'block', marginBottom: '4px' }}>
                          {String.fromCharCode(65 + idx)}. {option.substring(0, 50)}...
                        </span>
                      ))
                    ) : (
                      <span style={{ color: '#6b7280', fontStyle: 'italic' }}>
                        {language === 'ar' ? 'سؤال بدون خيارات متعددة' : 'Question without multiple choice options'}
                      </span>
                    )}
                  </p>

                  {/* تذييل البطاقة */}
                  <div className="question-card-footer">
                    <div className="question-stats">
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={12} color={question.isAnswered ? '#10b981' : '#6b7280'} />
                        {question.isAnswered ?
                          (language === 'ar' ? 'تمت الإجابة' : 'Answered') :
                          (language === 'ar' ? 'لم تتم الإجابة' : 'Not answered')
                        }
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <BookOpen size={12} />
                        {question.category}
                      </span>
                    </div>
                    <button
                      className="question-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuestionStart(question.id);
                      }}
                    >
                      {language === 'ar' ? 'بدء السؤال' : 'Start Question'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* حالة فارغة */}
          {!uploadedFile && questions.length === 0 && (
            <motion.div
              className="questions-empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="questions-empty-icon">
                <Upload size={40} />
              </div>
              <h3 className="questions-empty-title">{t.noQuestions}</h3>
              <p className="questions-empty-subtitle">{t.noQuestionsDesc}</p>
              <button
                className="questions-empty-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                {t.uploadFirst}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QuestionsSection;
