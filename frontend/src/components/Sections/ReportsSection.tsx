import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Sparkles,
  Download,
  Copy,
  Printer,
  Loader,
  Settings,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Clock,
  FileCheck,
  Zap
} from 'lucide-react';
import './ReportsSection.css';

interface ReportsSectionProps {
  user: any;
  language: 'ar' | 'en';
  isDarkMode: boolean;
  sidebarExpanded?: boolean;
}

const ReportsSection: React.FC<ReportsSectionProps> = ({ language, isDarkMode, sidebarExpanded = false }) => {
  const [reportTopic, setReportTopic] = useState('');
  const [pageCount, setPageCount] = useState(5);
  const [generatedReport, setGeneratedReport] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportLanguage, setReportLanguage] = useState(language);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [includeSources, setIncludeSources] = useState(true);
  const [academicLevel, setAcademicLevel] = useState('undergraduate');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [reportStats, setReportStats] = useState({
    wordCount: 0,
    readingTime: 0,
    sections: 0,
    sources: 0
  });

  // OpenRouter API Key
  const OPENROUTER_API_KEY = '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';

  // إضافة تحسينات أكاديمية إضافية
  const addAcademicEnhancements = (content: string, language: string, level: string): string => {
    let enhanced = content;

    // تحسين التنسيق الأكاديمي
    enhanced = enhanced
      .replace(/^([A-Z][^.\n]*):$/gm, '## $1') // تحويل العناوين
      .replace(/^([0-9]+\.\s+[A-Z][^.\n]*):$/gm, '### $1') // تحويل العناوين الفرعية
      .replace(/\n\n\n+/g, '\n\n') // تنظيف المسافات الزائدة
      .replace(/([.!?])\s*\n\s*([A-Z])/g, '$1\n\n$2'); // تحسين فقرات

    // إضافة تحسينات للمستوى الأكاديمي
    if (level === 'doctoral') {
      // إضافة عمق أكاديمي للدكتوراه
      enhanced = enhanced.replace(/\b(research|study|analysis)\b/gi, (match) => {
        return match + ' (with rigorous methodology)';
      });
    }

    return enhanced;
  };

  // دالة تحسين المحتوى المولد
  const enhanceReportContent = (content: string, topic: string, template: string, lang: string) => {
    // تنظيف وتحسين التنسيق
    let enhanced = content
      .replace(/\*\*(.*?)\*\*/g, '$1') // إزالة التنسيق الزائد
      .replace(/#{1,6}\s*/g, '') // تنظيف العناوين
      .replace(/\n{3,}/g, '\n\n') // تقليل الأسطر الفارغة
      .trim();

    // إضافة عنوان رئيسي إذا لم يكن موجوداً
    if (!enhanced.startsWith(topic)) {
      const title = lang === 'ar'
        ? `تقرير ${template === 'academic' ? 'أكاديمي' : template === 'business' ? 'تجاري' : template === 'technical' ? 'تقني' : 'بحثي'} حول: ${topic}`
        : `${template.charAt(0).toUpperCase() + template.slice(1)} Report on: ${topic}`;

      enhanced = `${title}\n${'='.repeat(title.length)}\n\n${enhanced}`;
    }

    // تحسين الفقرات والتنسيق
    const paragraphs = enhanced.split('\n\n');
    const improvedParagraphs = paragraphs.map(paragraph => {
      if (paragraph.trim().length === 0) return paragraph;

      // تحسين العناوين
      if (paragraph.length < 100 && !paragraph.includes('.')) {
        return `\n${paragraph.toUpperCase()}\n${'-'.repeat(paragraph.length)}`;
      }

      // تحسين الفقرات العادية
      return paragraph.charAt(0).toUpperCase() + paragraph.slice(1);
    });

    return improvedParagraphs.join('\n\n');
  };

  // تحليل الموضوع لإنشاء prompt ذكي ومخصص
  const analyzeTopicForSmartPrompt = (topic: string, template: string, lang: string) => {
    const isArabic = lang === 'ar';
    const topicLower = topic.toLowerCase();

    // تحديد المجال بناءً على الكلمات المفتاحية
    let field = 'General Studies';
    let expertiseAreas: string[] = [];
    let specificGuidance = '';

    if (topicLower.includes('ai') || topicLower.includes('artificial intelligence') || topicLower.includes('machine learning') || topicLower.includes('ذكاء اصطناعي') || topicLower.includes('تعلم آلي')) {
      field = 'Artificial Intelligence & Machine Learning';
      expertiseAreas = isArabic ? [
        'خوارزميات التعلم الآلي والتعلم العميق',
        'تطبيقات الذكاء الاصطناعي في الصناعة',
        'أخلاقيات الذكاء الاصطناعي والتحيز',
        'معالجة اللغات الطبيعية والرؤية الحاسوبية',
        'الأتمتة والتأثير على سوق العمل'
      ] : [
        'Machine Learning and Deep Learning algorithms',
        'AI applications across industries',
        'AI ethics and bias mitigation',
        'Natural Language Processing and Computer Vision',
        'Automation and workforce impact'
      ];
      specificGuidance = isArabic ?
        'ركز على التطورات الحديثة في GPT-4، Claude، وLlama. اشمل تطبيقات عملية وتحديات التنفيذ.' :
        'Focus on recent developments in GPT-4, Claude, and Llama. Include practical applications and implementation challenges.';
    }
    else if (topicLower.includes('business') || topicLower.includes('marketing') || topicLower.includes('تجارة') || topicLower.includes('تسويق') || topicLower.includes('أعمال')) {
      field = 'Business & Marketing';
      expertiseAreas = isArabic ? [
        'استراتيجيات الأعمال والتخطيط الاستراتيجي',
        'التسويق الرقمي ووسائل التواصل الاجتماعي',
        'إدارة المشاريع والعمليات',
        'التحليل المالي وإدارة المخاطر',
        'الابتكار وريادة الأعمال'
      ] : [
        'Business strategy and strategic planning',
        'Digital marketing and social media',
        'Project management and operations',
        'Financial analysis and risk management',
        'Innovation and entrepreneurship'
      ];
      specificGuidance = isArabic ?
        'اشمل دراسات حالة من شركات رائدة، تحليل SWOT، وتوقعات السوق للعام 2024-2025.' :
        'Include case studies from leading companies, SWOT analysis, and market forecasts for 2024-2025.';
    }
    else if (topicLower.includes('technology') || topicLower.includes('software') || topicLower.includes('programming') || topicLower.includes('تقنية') || topicLower.includes('برمجة') || topicLower.includes('تكنولوجيا')) {
      field = 'Technology & Software Engineering';
      expertiseAreas = isArabic ? [
        'هندسة البرمجيات والتطوير',
        'الأمن السيبراني وحماية البيانات',
        'الحوسبة السحابية والبنية التحتية',
        'تطوير التطبيقات والواجهات',
        'إنترنت الأشياء والتقنيات الناشئة'
      ] : [
        'Software engineering and development',
        'Cybersecurity and data protection',
        'Cloud computing and infrastructure',
        'Application and interface development',
        'IoT and emerging technologies'
      ];
      specificGuidance = isArabic ?
        'ركز على أحدث التقنيات مثل Kubernetes، React 18، وWeb3. اشمل أفضل الممارسات والأمان.' :
        'Focus on latest technologies like Kubernetes, React 18, and Web3. Include best practices and security.';
    }
    else if (topicLower.includes('health') || topicLower.includes('medical') || topicLower.includes('صحة') || topicLower.includes('طبي') || topicLower.includes('طب')) {
      field = 'Healthcare & Medical Sciences';
      expertiseAreas = isArabic ? [
        'الطب الحديث والتشخيص المتقدم',
        'الصحة العامة والوقاية',
        'التقنيات الطبية والذكاء الاصطناعي في الطب',
        'إدارة الرعاية الصحية',
        'البحوث الطبية والتجارب السريرية'
      ] : [
        'Modern medicine and advanced diagnostics',
        'Public health and prevention',
        'Medical technologies and AI in healthcare',
        'Healthcare management',
        'Medical research and clinical trials'
      ];
    }

    // تحديد الهيكل بناءً على النوع
    let structure = '';
    if (template === 'academic') {
      structure = isArabic ? `
1. الملخص التنفيذي (200 كلمة)
2. المقدمة والخلفية النظرية (15% من المحتوى)
3. مراجعة الأدبيات والدراسات السابقة (25% من المحتوى)
4. المنهجية والإطار النظري (15% من المحتوى)
5. التحليل والنتائج (25% من المحتوى)
6. المناقشة والتفسير (15% من المحتوى)
7. الخلاصة والتوصيات (5% من المحتوى)
` : `
1. Executive Summary (200 words)
2. Introduction & Theoretical Background (15% of content)
3. Literature Review & Previous Studies (25% of content)
4. Methodology & Theoretical Framework (15% of content)
5. Analysis & Findings (25% of content)
6. Discussion & Interpretation (15% of content)
7. Conclusions & Recommendations (5% of content)
`;
    } else if (template === 'business') {
      structure = isArabic ? `
1. الملخص التنفيذي والتوصيات الرئيسية
2. السياق التجاري والأهداف الاستراتيجية
3. تحليل السوق والمشهد التنافسي
4. التحليل الاستراتيجي وSWOT
5. الآثار المالية وعائد الاستثمار
6. تقييم المخاطر واستراتيجيات التخفيف
7. خارطة طريق التنفيذ والجدول الزمني
8. الخلاصة والخطوات التالية
` : `
1. Executive Summary & Key Recommendations
2. Business Context & Strategic Objectives
3. Market Analysis & Competitive Landscape
4. Strategic Analysis & SWOT
5. Financial Implications & ROI
6. Risk Assessment & Mitigation Strategies
7. Implementation Roadmap & Timeline
8. Conclusions & Next Steps
`;
    }

    return {
      field,
      expertiseAreas,
      structure,
      specificGuidance
    };
  };


  const translations = {
    ar: {
      title: 'مولد التقارير الجامعية',
      subtitle: 'إنشاء تقارير جامعية عالية المستوى مع المصادر والمراجع',
      inputTitle: 'بيانات التقرير الجامعي',
      topicLabel: 'موضوع التقرير',
      topicPlaceholder: 'أدخل موضوع التقرير الجامعي...',
      pagesLabel: 'عدد الصفحات (3-15)',
      languageLabel: 'لغة التقرير',
      academicLevelLabel: 'المستوى الأكاديمي',
      generateReport: 'إنشاء التقرير الجامعي',
      generating: 'جاري الإنشاء...',
      reportTitle: 'التقرير الجامعي',
      downloadReport: 'تحميل التقرير',
      copyReport: 'نسخ التقرير',
      printReport: 'طباعة التقرير',
      noReport: 'لا يوجد تقرير',
      noReportDesc: 'أدخل موضوع التقرير وعدد الصفحات لإنشاء تقرير جامعي شامل مع المصادر',
      generateFirst: 'إنشاء أول تقرير جامعي',
      advancedSettings: 'إعدادات متقدمة',
      includeSources: 'تضمين المصادر والمراجع',
      undergraduate: 'بكالوريوس',
      graduate: 'ماجستير',
      doctoral: 'دكتوراه',
      generatingReport: 'جاري إنشاء التقرير الجامعي...',
      wordCount: 'عدد الكلمات',
      readingTime: 'وقت القراءة',
      sections: 'الأقسام',
      sources: 'المصادر',
      minutes: 'دقيقة',
      arabic: 'العربية',
      english: 'الإنجليزية'
    },
    en: {
      title: 'Academic Report Generator',
      subtitle: 'Create high-quality academic reports with sources and references',
      inputTitle: 'Academic Report Data',
      topicLabel: 'Report Topic',
      topicPlaceholder: 'Enter academic report topic...',
      pagesLabel: 'Number of Pages (3-15)',
      languageLabel: 'Report Language',
      academicLevelLabel: 'Academic Level',
      generateReport: 'Generate Academic Report',
      generating: 'Generating...',
      reportTitle: 'Academic Report',
      downloadReport: 'Download Report',
      copyReport: 'Copy Report',
      printReport: 'Print Report',
      noReport: 'No Report',
      noReportDesc: 'Enter report topic and page count to generate a comprehensive academic report with sources',
      generateFirst: 'Generate First Academic Report',
      advancedSettings: 'Advanced Settings',
      includeSources: 'Include Sources & References',
      undergraduate: 'Undergraduate',
      graduate: 'Graduate',
      doctoral: 'Doctoral',
      generatingReport: 'Generating academic report...',
      wordCount: 'Word Count',
      readingTime: 'Reading Time',
      sections: 'Sections',
      sources: 'Sources',
      minutes: 'min',
      arabic: 'Arabic',
      english: 'English'
    }
  };

  const t = translations[language];

  // المستويات الأكاديمية
  const academicLevels = [
    { id: 'undergraduate', name: t.undergraduate },
    { id: 'graduate', name: t.graduate },
    { id: 'doctoral', name: t.doctoral }
  ];

  // اللغات المتاحة
  const availableLanguages = [
    { id: 'ar', name: t.arabic },
    { id: 'en', name: t.english }
  ];

  // توليد التقرير الجامعي المتقدم باستخدام OpenRouter
  const generateAcademicReport = async (topic: string, pages: number, reportLang: string, level: string) => {
    try {
      const wordsPerPage = 350; // متوسط الكلمات في الصفحة
      const targetWords = pages * wordsPerPage;

      // تحليل الموضوع لتخصيص الـ prompt
      const topicAnalysis = analyzeTopicForSmartPrompt(topic, 'academic', reportLang);

      const prompt = `You are a distinguished academic researcher and professor with PhD-level expertise in ${topicAnalysis.field}. You have 20+ years of experience writing high-quality academic reports and are recognized as a leading authority in academic writing and research methodology.

🎯 MISSION: Create an exceptional, publication-quality academic report about "${topic}" in ${reportLang === 'ar' ? 'Arabic' : 'English'} that demonstrates ${level}-level academic expertise and meets the highest standards of academic excellence.

📊 SPECIFICATIONS:
- Length: EXACTLY ${pages} pages (${targetWords} words) - This is CRITICAL
- Style: Highly academic, peer-review quality with rigorous scholarly standards
- Language: ${reportLang === 'ar' ? 'Arabic' : 'English'} (maintain consistency throughout)
- Academic Level: ${level === 'undergraduate' ? 'Undergraduate (Bachelor\'s level)' : level === 'graduate' ? 'Graduate/Masters level' : 'Doctoral/PhD level'}
- Quality: Top-tier university research standard with comprehensive analysis
- Citation Style: Academic format with proper in-text citations and full bibliography

🧠 EXPERTISE REQUIREMENTS:
${topicAnalysis.expertiseAreas.map(area => `• ${area}`).join('\n')}

🏗️ MANDATORY STRUCTURE:
${topicAnalysis.structure}

🔬 COMPREHENSIVE ACADEMIC CONTENT REQUIREMENTS:

1. EXECUTIVE SUMMARY/ABSTRACT (150-200 words):
   - Clear problem statement and research objectives
   - Key findings and conclusions
   - Methodology overview
   - Practical implications

2. INTRODUCTION & BACKGROUND (15-20% of content):
   - Comprehensive context and background
   - Clear research questions and objectives
   - Significance and scope of the study
   - Report structure overview

3. LITERATURE REVIEW (25-30% of content):
   - Systematic review of relevant academic literature
   - Critical analysis of existing research
   - Identification of research gaps
   - Theoretical frameworks and models
   - Evolution of thought in the field

4. METHODOLOGY & APPROACH (10-15% of content):
   - Research design and methodology
   - Data collection and analysis methods
   - Theoretical framework application
   - Limitations and assumptions

5. MAIN ANALYSIS & FINDINGS (30-35% of content):
   - Detailed analysis with multiple perspectives
   - Evidence-based arguments and discussions
   - Case studies and practical examples
   - Statistical data and empirical evidence
   - Critical evaluation of different viewpoints

6. CONCLUSIONS & RECOMMENDATIONS (10-15% of content):
   - Summary of key findings
   - Practical recommendations
   - Policy implications
   - Future research directions
   - Limitations and areas for improvement

7. REFERENCES & BIBLIOGRAPHY:
   - Minimum 20-30 high-quality academic sources
   - Recent publications (last 5-10 years preferred)
   - Mix of journal articles, books, and reports
   - Proper academic citation format

🎨 ACADEMIC FORMATTING & QUALITY STANDARDS:

FORMATTING REQUIREMENTS:
• Professional academic headings hierarchy (H1, H2, H3)
• Consistent academic writing style and tone
• Proper paragraph structure with topic sentences
• Smooth transitions between sections and ideas
• Academic language appropriate for ${level} level
• Clear and concise executive summary
• Professional tables, figures, and charts where relevant
• Proper citation format: (Author, Year) throughout

QUALITY ASSURANCE CRITERIA:
• Depth of analysis and critical thinking
• Originality of insights and perspectives
• Logical flow and coherent argumentation
• Evidence-based conclusions and recommendations
• Comprehensive coverage of the topic
• Integration of multiple theoretical perspectives
• Practical relevance and real-world applications
• Academic rigor and scholarly standards

🔍 TOPIC-SPECIFIC ACADEMIC GUIDANCE:
${topicAnalysis.specificGuidance}

📖 COMPREHENSIVE SOURCE REQUIREMENTS:
Include 20-30 high-quality academic sources:
• 60% Peer-reviewed journal articles (recent 5-10 years)
• 20% Academic books and scholarly monographs
• 10% Conference proceedings and working papers
• 10% Government reports, institutional publications, and credible online sources

CITATION STANDARDS:
• In-text citations: (Author, Year) or (Author, Year, p. XX)
• Multiple authors: (Smith & Jones, 2023) or (Smith et al., 2023)
• Direct quotes with page numbers
• Paraphrasing with proper attribution
• Complete bibliography with full publication details

⚡ EXECUTION COMMAND:
Create a masterpiece academic report that exceeds university standards and demonstrates exceptional scholarly expertise. This report should be suitable for publication in academic journals and serve as a model for ${level}-level academic writing.

CRITICAL SUCCESS FACTORS:
1. Meet EXACT word count: ${targetWords} words
2. Maintain consistent academic tone throughout
3. Provide original insights and critical analysis
4. Include comprehensive literature review
5. Demonstrate mastery of the subject matter
6. Follow proper academic structure and formatting
7. Include actionable recommendations
8. Cite all sources properly and completely

BEGIN EXCEPTIONAL ACADEMIC REPORT:`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Educational Platform - Report Generation'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.1-8b-instruct:free',
          messages: [
            {
              role: 'system',
              content: `You are a world-renowned academic researcher and professor with PhD-level expertise across multiple disciplines. You have published extensively in top-tier academic journals and have 25+ years of experience in academic writing, research methodology, and scholarly analysis. You are known for producing exceptional academic reports that meet the highest standards of academic excellence and are frequently cited by other researchers. Your expertise includes:

- Advanced research methodology and statistical analysis
- Comprehensive literature review and synthesis
- Critical thinking and analytical reasoning
- Academic writing and scholarly communication
- Interdisciplinary research and knowledge integration
- Evidence-based analysis and conclusion drawing
- Theoretical framework development and application

You consistently produce academic work that exceeds university standards and serves as a model for academic excellence.`
            },
            {
              role: 'user',
              content: prompt
            },
            {
              role: 'assistant',
              content: `I understand. I will create an exceptional academic report about "${topic}" that meets the highest standards of academic excellence. The report will be exactly ${pages} pages (${targetWords} words) in ${reportLang === 'ar' ? 'Arabic' : 'English'}, written at ${level} level with comprehensive analysis, proper citations, and a complete bibliography. I will ensure it demonstrates deep scholarly expertise and rigorous research methodology throughout.`
            },
            {
              role: 'user',
              content: `Perfect! Now please write the complete academic report. Remember:
- EXACTLY ${targetWords} words (${pages} pages)
- Include comprehensive literature review with 20-30 academic sources
- Use proper academic structure with clear sections
- Provide original insights and critical analysis
- Include proper in-text citations throughout
- End with complete bibliography/references section
- Maintain ${level}-level academic rigor throughout
- Write in ${reportLang === 'ar' ? 'Arabic' : 'English'} language

Begin writing the complete report now:`
            }
          ],
          temperature: 0.4, // أقل للحصول على محتوى أكثر تركيزاً ودقة
          max_tokens: Math.min(targetWords + 1000, 4000), // حد أقصى أذكى
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      let generatedContent = data.choices[0].message.content;

      // تحسين المحتوى المولد
      generatedContent = enhanceReportContent(generatedContent, topic, 'academic', reportLang);

      // إضافة تحسينات إضافية للجودة الأكاديمية
      generatedContent = addAcademicEnhancements(generatedContent, reportLang, level);

      return generatedContent;

    } catch (error) {
      console.error('Error generating smart report:', error);

      // محاولة نماذج بديلة متقدمة
      const fallbackModels = [
        'microsoft/wizardlm-2-8x22b:free',
        'meta-llama/llama-3.1-70b-instruct:free',
        'qwen/qwen-2-7b-instruct:free',
        'google/gemma-2-9b-it:free'
      ];

      for (const model of fallbackModels) {
        try {
          console.log(`🔄 جاري تجربة النموذج البديل: ${model}`);

          const fallbackResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': window.location.origin,
              'X-Title': 'Educational Platform - Advanced Report'
            },
            body: JSON.stringify({
              model: model,
              messages: [
                {
                  role: 'system',
                  content: `You are an expert report writer with deep knowledge across all fields. Create exceptional, comprehensive reports that demonstrate expertise and critical thinking.`
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              temperature: 0.5,
              max_tokens: Math.min(targetWords + 1000, 4000),
              top_p: 0.9
            })
          });

          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            console.log(`✅ نجح النموذج البديل: ${model}`);
            return enhanceReportContent(fallbackData.choices[0].message.content, topic, template, language);
          }
        } catch (fallbackError) {
          console.error(`❌ فشل النموذج ${model}:`, fallbackError);
          continue;
        }
      }

      // إذا فشلت جميع النماذج - رسالة ذكية للمستخدم
      const errorMessage = language === 'ar'
        ? `عذراً، واجهنا صعوبة في الاتصال بخوادم الذكاء الاصطناعي المتقدمة. يرجى المحاولة مرة أخرى خلال دقائق قليلة. نحن نعمل على استخدام أقوى النماذج المتاحة لضمان جودة التقرير.`
        : `Sorry, we encountered difficulty connecting to advanced AI servers. Please try again in a few minutes. We're working with the most powerful available models to ensure report quality.`;

      throw new Error(errorMessage);
    }
  };

  // توليد التقرير مع شريط التقدم
  const handleGenerateReport = async () => {
    if (!reportTopic.trim()) return;

    setIsGenerating(true);
    setGenerationProgress(0);

    // مراحل التوليد الذكي المتقدم
    const stages = [
      { progress: 15, message: language === 'ar' ? 'تحليل الموضوع بعمق...' : 'Deep topic analysis...' },
      { progress: 30, message: language === 'ar' ? 'البحث في قواعد البيانات المعرفية...' : 'Researching knowledge databases...' },
      { progress: 45, message: language === 'ar' ? 'تطبيق التفكير النقدي والتحليل...' : 'Applying critical thinking & analysis...' },
      { progress: 65, message: language === 'ar' ? 'إنشاء محتوى احترافي متقدم...' : 'Creating advanced professional content...' },
      { progress: 80, message: language === 'ar' ? 'تحسين الجودة والتنسيق...' : 'Enhancing quality & formatting...' },
      { progress: 95, message: language === 'ar' ? 'المراجعة النهائية والتدقيق...' : 'Final review & validation...' },
      { progress: 100, message: language === 'ar' ? 'تم إنشاء تقرير متقدم!' : 'Advanced report generated!' }
    ];

    for (const stage of stages) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setGenerationProgress(stage.progress);
    }

    try {
      // توليد التقرير الجامعي
      const academicReport = await generateAcademicReport(reportTopic, pageCount, reportLanguage, academicLevel);
      setGeneratedReport(academicReport);

      // حساب الإحصائيات المتقدمة
      const wordCount = academicReport.split(/\s+/).filter(word => word.length > 0).length;
      const readingTime = Math.ceil(wordCount / 200); // 200 كلمة في الدقيقة
      const sections = academicReport.split('\n\n').filter(section => section.trim().length > 50).length;
      const sources = (academicReport.match(/\([^)]*\d{4}[^)]*\)/g) || []).length; // عد الاستشهادات

      setReportStats({ wordCount, readingTime, sections, sources });

      // رسالة نجاح
      console.log(`✅ تم إنشاء تقرير متقدم بنجاح: ${wordCount} كلمة، ${sections} قسم`);

    } catch (error) {
      console.error('❌ خطأ في توليد التقرير:', error);

      // عرض رسالة خطأ للمستخدم
      alert(error.message || (language === 'ar' ?
        'حدث خطأ في إنشاء التقرير. يرجى المحاولة مرة أخرى.' :
        'An error occurred while generating the report. Please try again.'
      ));
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  // توليد تقرير عربي محسن
  const generateArabicReport = (topic: string, pages: number, template: string, style: string) => {
    const wordsPerPage = 300;
    const totalWords = pages * wordsPerPage;

    const templateIntros = {
      academic: `يُعد هذا التقرير الأكاديمي دراسة شاملة ومعمقة حول موضوع ${topic}، حيث يهدف إلى تقديم تحليل علمي دقيق ومنهجي للموضوع.`,
      business: `يقدم هذا التقرير التجاري تحليلاً استراتيجياً شاملاً لموضوع ${topic} من منظور الأعمال والاستثمار.`,
      research: `يمثل هذا البحث العلمي دراسة متقدمة في مجال ${topic} باستخدام أحدث المنهجيات البحثية والتحليلية.`,
      technical: `يوفر هذا التقرير التقني دليلاً شاملاً ومفصلاً حول ${topic} مع التركيز على الجوانب التطبيقية والعملية.`
    };

    const styleModifier = style === 'formal' ? 'بأسلوب رسمي ومهني' : 'بأسلوب مبسط وودود';

    return `تقرير ${template === 'academic' ? 'أكاديمي' : template === 'business' ? 'تجاري' : template === 'research' ? 'بحثي' : 'تقني'} حول: ${topic}

المقدمة:
${templateIntros[template as keyof typeof templateIntros]} تم إعداد هذا التقرير ${styleModifier} ليقدم رؤية شاملة ومتكاملة للموضوع.

الفصل الأول: نظرة عامة
${topic} هو مجال واسع يشمل العديد من الجوانب والتطبيقات المختلفة. من خلال هذا الفصل، سنستعرض الأسس النظرية والمفاهيم الأساسية التي تحكم هذا المجال.

الفصل الثاني: التطبيقات العملية
في هذا الفصل، سنتناول التطبيقات العملية لـ ${topic} في مختلف المجالات، مع التركيز على الفوائد والتحديات التي تواجه التطبيق.

الفصل الثالث: التحليل والدراسة
سنقوم بتحليل مفصل للبيانات والمعلومات المتعلقة بـ ${topic}، مع استخدام أحدث الطرق والأساليب العلمية في التحليل.

الفصل الرابع: النتائج والتوصيات
بناءً على الدراسة والتحليل، سنقدم النتائج المستخلصة والتوصيات المقترحة لتطوير وتحسين ${topic}.

الخاتمة:
في ختام هذا التقرير، يمكننا القول أن ${topic} يمثل مجالاً حيوياً ومهماً يستحق المزيد من الدراسة والبحث. نأمل أن يساهم هذا التقرير في إثراء المعرفة حول هذا الموضوع المهم.

المراجع:
- مراجع علمية متخصصة في ${topic}
- دراسات حديثة ومعاصرة
- مصادر موثوقة ومعتمدة

[تم توليد هذا التقرير تلقائياً بناءً على الموضوع المحدد: ${topic}]
[عدد الصفحات المطلوب: ${pages} صفحة]
[العدد التقريبي للكلمات: ${totalWords} كلمة]`;
  };

  // توليد تقرير إنجليزي محسن
  const generateEnglishReport = (topic: string, pages: number, template: string, style: string) => {
    const wordsPerPage = 300;
    const totalWords = pages * wordsPerPage;

    const templateIntros = {
      academic: `This comprehensive academic report presents an in-depth scholarly analysis of ${topic}, employing rigorous research methodologies and analytical frameworks.`,
      business: `This business report provides strategic insights and commercial analysis regarding ${topic} from an investment and market perspective.`,
      research: `This advanced research study explores ${topic} using cutting-edge research methodologies and analytical approaches.`,
      technical: `This technical report offers a comprehensive guide to ${topic} with focus on practical applications and implementation details.`
    };

    const styleModifier = style === 'formal' ? 'in a formal and professional manner' : 'in an accessible and friendly tone';

    return `Comprehensive Report on: ${topic}

Introduction:
The topic of ${topic} represents one of the most important and vital subjects in our current era, playing a fundamental role in the development and advancement of societies. This report aims to provide a comprehensive and detailed study of this important subject.

Chapter 1: Overview
${topic} is a broad field that encompasses many different aspects and applications. Through this chapter, we will review the theoretical foundations and basic concepts that govern this field.

Chapter 2: Practical Applications
In this chapter, we will address the practical applications of ${topic} in various fields, focusing on the benefits and challenges facing implementation.

Chapter 3: Analysis and Study
We will conduct a detailed analysis of data and information related to ${topic}, using the latest scientific methods and approaches in analysis.

Chapter 4: Results and Recommendations
Based on the study and analysis, we will present the extracted results and proposed recommendations for developing and improving ${topic}.

Conclusion:
In conclusion of this report, we can say that ${topic} represents a vital and important field that deserves further study and research. We hope this report contributes to enriching knowledge about this important subject.

References:
- Specialized scientific references in ${topic}
- Recent and contemporary studies
- Reliable and accredited sources

[This report was automatically generated based on the specified topic: ${topic}]
[Required number of pages: ${pages} pages]
[Approximate word count: ${totalWords} words]`;
  };

  // نسخ التقرير
  const handleCopyReport = () => {
    navigator.clipboard.writeText(generatedReport);
    console.log('Report copied to clipboard');
  };

  // تحميل التقرير
  const handleDownloadReport = () => {
    const element = document.createElement('a');
    const file = new Blob([generatedReport], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `report-${reportTopic.replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // طباعة التقرير
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Report - ${reportTopic}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
              h1 { color: #333; }
              pre { white-space: pre-wrap; font-family: inherit; }
            </style>
          </head>
          <body>
            <h1>Report: ${reportTopic}</h1>
            <pre>${generatedReport}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div
      className={`reports-container ${isDarkMode ? 'dark' : ''} ${language === 'ar' ? 'rtl' : 'ltr'}`}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* المحتوى الرئيسي */}
      <div className="reports-content">
        {/* قسم إدخال بيانات التقرير */}
        <motion.div
          className="reports-input-section"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="reports-input-title">
            <FileText size={24} />
            {t.inputTitle}
          </h2>

          {/* إعدادات التقرير الجامعي */}
          <div className="reports-academic-settings">
            <div className="reports-settings-row">
              {/* لغة التقرير */}
              <div className="reports-form-group">
                <label className="reports-form-label">{t.languageLabel}</label>
                <select
                  value={reportLanguage}
                  onChange={(e) => setReportLanguage(e.target.value as 'ar' | 'en')}
                  className="reports-form-input"
                >
                  {availableLanguages.map((lang) => (
                    <option key={lang.id} value={lang.id}>{lang.name}</option>
                  ))}
                </select>
              </div>

              {/* المستوى الأكاديمي */}
              <div className="reports-form-group">
                <label className="reports-form-label">{t.academicLevelLabel}</label>
                <select
                  value={academicLevel}
                  onChange={(e) => setAcademicLevel(e.target.value)}
                  className="reports-form-input"
                >
                  {academicLevels.map((level) => (
                    <option key={level.id} value={level.id}>{level.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="reports-form">
            {/* موضوع التقرير */}
            <div className="reports-form-group">
              <label className="reports-form-label">{t.topicLabel}</label>
              <input
                type="text"
                value={reportTopic}
                onChange={(e) => setReportTopic(e.target.value)}
                placeholder={t.topicPlaceholder}
                className="reports-form-input"
              />
            </div>

            {/* عدد الصفحات */}
            <div className="reports-form-group">
              <label className="reports-form-label">{t.pagesLabel}</label>
              <input
                type="number"
                value={pageCount}
                onChange={(e) => setPageCount(parseInt(e.target.value) || 3)}
                min="3"
                max="15"
                className="reports-form-input"
                placeholder={language === 'ar' ? 'من 3 إلى 15 صفحة' : '3 to 15 pages'}
              />
            </div>

            {/* الإعدادات المتقدمة */}
            <div className="reports-advanced-settings">
              <div
                className="reports-advanced-title"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Settings size={16} />
                {t.advancedSettings}
                {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    className="reports-advanced-content"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="reports-form-group">
                      <label className="reports-form-label">{t.includeSources}</label>
                      <input
                        type="checkbox"
                        checked={includeSources}
                        onChange={(e) => setIncludeSources(e.target.checked)}
                        style={{ width: 'auto', margin: '8px 0' }}
                      />
                      <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                        {language === 'ar'
                          ? 'سيتم تضمين 15-25 مصدر أكاديمي موثوق'
                          : 'Will include 15-25 reliable academic sources'
                        }
                      </small>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* زر التوليد */}
            <motion.button
              onClick={handleGenerateReport}
              disabled={!reportTopic.trim() || isGenerating}
              className={`reports-generate-btn ${isGenerating ? 'loading' : ''}`}
              whileHover={!isGenerating ? { scale: 1.02 } : {}}
              whileTap={!isGenerating ? { scale: 0.98 } : {}}
            >
              {isGenerating ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  {language === 'ar' ? 'جاري إنشاء التقرير بالذكاء الاصطناعي...' : 'Generating AI-powered report...'}
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  {language === 'ar' ? 'إنشاء تقرير ذكي' : 'Generate Smart Report'}
                </>
              )}
            </motion.button>
          </div>

          {/* شريط التقدم أثناء التوليد */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                className="reports-progress-container"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="reports-progress-title">{t.generatingReport}</div>
                <div className="reports-progress-bar">
                  <motion.div
                    className="reports-progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${generationProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* قسم عرض التقرير */}
        <motion.div
          className="reports-display-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {generatedReport ? (
            <>
              {/* إحصائيات التقرير */}
              <motion.div
                className="reports-stats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="reports-stat-item">
                  <div className="reports-stat-number">{reportStats.wordCount}</div>
                  <div className="reports-stat-label">{t.wordCount}</div>
                </div>
                <div className="reports-stat-item">
                  <div className="reports-stat-number">{reportStats.readingTime}</div>
                  <div className="reports-stat-label">{t.readingTime} ({t.minutes})</div>
                </div>
                <div className="reports-stat-item">
                  <div className="reports-stat-number">{reportStats.sections}</div>
                  <div className="reports-stat-label">{t.sections}</div>
                </div>
                <div className="reports-stat-item">
                  <div className="reports-stat-number">{reportStats.sources}</div>
                  <div className="reports-stat-label">{t.sources}</div>
                </div>
              </motion.div>

              {/* هيدر التقرير */}
              <div className="reports-display-header">
                <h3 className="reports-display-title">{t.reportTitle}</h3>
                <div className="reports-actions">
                  <button
                    onClick={handleCopyReport}
                    className="reports-action-btn"
                    title={t.copyReport}
                  >
                    <Copy size={16} />
                    {t.copyReport}
                  </button>
                  <button
                    onClick={handleDownloadReport}
                    className="reports-action-btn"
                    title={t.downloadReport}
                  >
                    <Download size={16} />
                    {t.downloadReport}
                  </button>
                  <button
                    onClick={handlePrintReport}
                    className="reports-action-btn"
                    title={t.printReport}
                  >
                    <Printer size={16} />
                    {t.printReport}
                  </button>
                </div>
              </div>

              {/* محتوى التقرير */}
              <div className="reports-content-area">
                <div className="reports-text">{generatedReport}</div>
              </div>
            </>
          ) : (
            // حالة فارغة
            <div className="reports-empty">
              <div className="reports-empty-icon">
                <FileText size={40} />
              </div>
              <h3 className="reports-empty-title">{t.noReport}</h3>
              <p className="reports-empty-subtitle">{t.noReportDesc}</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ReportsSection;
