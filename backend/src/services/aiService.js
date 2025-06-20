const axios = require('axios');
require('dotenv').config();

/**
 * خدمة الذكاء الاصطناعي باستخدام OpenRouter
 * AI Service using OpenRouter API
 */
class AIService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseURL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    this.appName = process.env.OPENROUTER_APP_NAME || 'AI-Educational-Platform';
    
    // النماذج المجانية المتاحة
    this.models = {
      text: process.env.AI_MODEL_TEXT || 'microsoft/wizardlm-2-8x22b',
      chat: process.env.AI_MODEL_CHAT || 'meta-llama/llama-3.1-8b-instruct:free',
      analysis: process.env.AI_MODEL_ANALYSIS || 'google/gemma-2-9b-it:free',
      coding: process.env.AI_MODEL_CODING || 'qwen/qwen-2.5-coder-32b-instruct'
    };
    
    // إعداد axios
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5000',
        'X-Title': this.appName
      },
      timeout: 60000 // 60 ثانية
    });
  }

  /**
   * إرسال طلب للذكاء الاصطناعي
   */
  async sendRequest(messages, model = 'chat', options = {}) {
    try {
      const requestData = {
        model: this.models[model] || model,
        messages: Array.isArray(messages) ? messages : [{ role: 'user', content: messages }],
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        frequency_penalty: options.frequencyPenalty || 0,
        presence_penalty: options.presencePenalty || 0,
        stream: false
      };

      console.log(`🤖 إرسال طلب للذكاء الاصطناعي - النموذج: ${requestData.model}`);
      
      const response = await this.client.post('/chat/completions', requestData);
      
      if (response.data && response.data.choices && response.data.choices.length > 0) {
        const result = response.data.choices[0].message.content;
        
        console.log(`✅ تم الحصول على الرد من الذكاء الاصطناعي`);
        
        return {
          success: true,
          data: result,
          content: result, // للتوافق مع الكود القديم
          model: requestData.model,
          usage: response.data.usage || {},
          metadata: {
            processingTime: Date.now(),
            tokensUsed: response.data.usage?.total_tokens || 0
          }
        };
      } else {
        throw new Error('لم يتم الحصول على رد صحيح من الذكاء الاصطناعي');
      }
      
    } catch (error) {
      console.error('❌ خطأ في خدمة الذكاء الاصطناعي:', error.message);

      // معالجة أنواع مختلفة من الأخطاء
      let errorMessage = 'حدث خطأ في الاتصال بخدمة الذكاء الاصطناعي';

      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        errorMessage = 'لا يمكن الوصول لخدمة الذكاء الاصطناعي. تحقق من الاتصال بالإنترنت.';
      } else if (error.response?.status === 401) {
        errorMessage = 'مفتاح API غير صحيح أو منتهي الصلاحية.';
      } else if (error.response?.status === 429) {
        errorMessage = 'تم تجاوز الحد المسموح من الطلبات. حاول مرة أخرى لاحقاً.';
      } else if (error.response?.status === 500) {
        errorMessage = 'خطأ في خادم الذكاء الاصطناعي. حاول مرة أخرى.';
      }

      return {
        success: false,
        error: errorMessage,
        originalError: error.message,
        details: error.response?.data || null
      };
    }
  }

  /**
   * توليد أسئلة من محتوى المحاضرة
   */
  async generateQuestions(lectureContent, options = {}) {
    const {
      questionCount = 5,
      difficulty = 'medium',
      questionTypes = ['multiple_choice', 'true_false', 'short_answer'],
      language = 'ar'
    } = options;

    const prompt = `
أنت مساعد ذكي متخصص في التعليم. مهمتك هي توليد أسئلة تعليمية من المحتوى المعطى.

المحتوى:
${lectureContent}

المطلوب:
- عدد الأسئلة: ${questionCount}
- مستوى الصعوبة: ${difficulty}
- أنواع الأسئلة: ${questionTypes.join(', ')}
- اللغة: ${language === 'ar' ? 'العربية' : 'الإنجليزية'}

يرجى إنشاء الأسئلة بصيغة JSON كالتالي:
{
  "questions": [
    {
      "questionText": "نص السؤال",
      "questionType": "multiple_choice",
      "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
      "correctAnswer": "الإجابة الصحيحة",
      "explanation": "تفسير الإجابة",
      "difficulty": "medium",
      "topic": "الموضوع الرئيسي",
      "keywords": ["كلمة1", "كلمة2"]
    }
  ]
}

تأكد من:
1. تنوع الأسئلة وتغطية المحتوى بشكل شامل
2. وضوح الأسئلة والخيارات
3. دقة الإجابات الصحيحة
4. تفسيرات مفيدة للإجابات
5. استخدام اللغة المطلوبة بشكل صحيح
`;

    return await this.sendRequest(prompt, 'analysis', {
      maxTokens: 3000,
      temperature: 0.8
    });
  }

  /**
   * توليد أسئلة ذكية ومتقدمة من المحتوى العلمي
   */
  async generateIntelligentQuestions(content, analysisData = {}, options = {}) {
    const {
      questionCount = 5,
      difficulty = 'medium',
      language = 'ar',
      questionTypes = ['multiple_choice', 'true_false', 'short_answer']
    } = options;

    console.log('🧠 بدء عملية الفهم العميق للمحتوى...');

    // الخطوة 1: فهم المحتوى بعمق
    const deepUnderstanding = await this.deepContentUnderstanding(content, options);

    if (!deepUnderstanding.success) {
      console.warn('⚠️ فشل في الفهم العميق، سيتم استخدام النظام البديل');
      return this.generateFallbackQuestions(content, options);
    }

    console.log('✅ تم فهم المحتوى بنجاح');
    console.log('📊 ملخص الفهم:', deepUnderstanding.understanding?.summary?.substring(0, 100) + '...');

    // الخطوة 2: توليد أسئلة بناءً على الفهم العميق
    return await this.generateQuestionsFromUnderstanding(deepUnderstanding.understanding, {
      questionCount,
      difficulty,
      language: deepUnderstanding.understanding?.detectedLanguage || language
    });

    // تحضير معلومات التحليل المتقدم
    const analysisInfo = analysisData.classification ?
      `\n📊 **تحليل المحتوى:**
- الموضوع الرئيسي: ${analysisData.classification.mainTopic}
- المجال الأكاديمي: ${analysisData.classification.academicField}
- المواضيع الفرعية: ${analysisData.classification.subTopics?.join(', ')}
- الكلمات المفتاحية: ${analysisData.keywords?.slice(0, 10).map(k => k.word).join(', ')}
- مستوى التعقيد: ${analysisData.classification.difficulty}
- نوع المحتوى: ${analysisData.structure?.contentType}
- المفاهيم العلمية: ${scientificConcepts.slice(0, 5).join(', ')}` : '';

    const prompt = language === 'ar' ?
      `أنت خبير في التعليم والتقييم الأكاديمي. مهمتك إنشاء أسئلة ذكية ومتقدمة تختبر الفهم العميق للمحتوى العلمي.

📖 **المحتوى العلمي:**
"${content.substring(0, 4000)}${content.length > 4000 ? '...' : ''}"
${analysisInfo}

🎯 **متطلبات الأسئلة الذكية:**

1. **التحليل والفهم العميق**:
   - اختبر فهم المفاهيم الأساسية وليس الحفظ
   - ركز على العلاقات بين المفاهيم المختلفة
   - اختبر القدرة على التطبيق والتحليل

2. **أنواع الأسئلة المطلوبة**:
   - أسئلة اختيار من متعدد (تحليلية)
   - أسئلة تطبيقية (ماذا يحدث إذا...)
   - أسئلة مقارنة (قارن بين...)
   - أسئلة استنتاج (استنتج من...)
   - أسئلة حل مشاكل

3. **معايير الجودة**:
   - كل سؤال يجب أن يختبر مفهوماً مهماً من المحتوى
   - الخيارات الخاطئة يجب أن تكون منطقية ومعقولة
   - تجنب الأسئلة التافهة أو السطحية
   - ركز على المفاهيم العلمية والتقنية
   - تجنب الأسئلة العامة مثل "من هو المؤلف" أو "متى كتب"
   - لا تسأل عن معلومات شخصية أو تاريخية عامة

4. **التخصص حسب المجال**:
   ${contentAnalysis.domain === 'programming' ? '- أسئلة عن الخوارزميات والمنطق البرمجي\n- اختبار فهم الكود والوظائف\n- أسئلة حل المشاكل البرمجية' : ''}
   ${contentAnalysis.domain === 'science' ? '- أسئلة عن القوانين والنظريات العلمية\n- اختبار فهم العمليات والتفاعلات\n- أسئلة تطبيقية على الظواهر الطبيعية' : ''}
   ${contentAnalysis.domain === 'mathematics' ? '- أسئلة حل المسائل الرياضية\n- اختبار فهم القوانين والقواعد\n- أسئلة تطبيقية على المفاهيم الرياضية' : ''}
   ${contentAnalysis.domain === 'literature' ? '- أسئلة تحليل النصوص والمعاني\n- اختبار فهم الأساليب الأدبية\n- أسئلة عن السياق التاريخي والثقافي' : ''}

5. **أمثلة على الأسئلة المطلوبة**:
   - "ما هو الغرض من استخدام [مفهوم من النص] في هذا السياق؟"
   - "كيف يؤثر [عامل من النص] على [نتيجة مذكورة في النص]؟"
   - "ما هي العلاقة بين [مفهوم 1] و [مفهوم 2] كما ورد في النص؟"
   - "إذا تم تغيير [متغير من النص]، ماذا سيحدث لـ [نتيجة من النص]؟"

6. **أمثلة على الأسئلة المرفوضة**:
   - "من هو مؤلف هذا النص؟"
   - "متى تم كتابة هذا المحتوى؟"
   - "ما هو اسم الكتاب؟"
   - "في أي سنة حدث هذا؟"

أنشئ ${questionCount} سؤال ذكي بمستوى صعوبة ${difficulty === 'easy' ? 'مبتدئ' : difficulty === 'medium' ? 'متوسط' : difficulty === 'hard' ? 'متقدم' : 'متنوع (مزيج من جميع المستويات)'}.

**لغة الأسئلة**: يجب أن تكون الأسئلة باللغة ${contentLanguage === 'ar' ? 'العربية' : contentLanguage === 'en' ? 'الإنجليزية' : 'العربية (لأن المحتوى مختلط)'} لتتناسب مع لغة المحتوى المرفوع.

**تنسيق الإجابة (JSON):**
{
  "questions": [
    {
      "questionText": "نص السؤال الذكي هنا",
      "questionType": "multiple_choice",
      "options": [
        "الخيار الأول (صحيح)",
        "الخيار الثاني (خطأ منطقي)",
        "الخيار الثالث (خطأ منطقي)",
        "الخيار الرابع (خطأ منطقي)"
      ],
      "correctAnswer": 0,
      "explanation": "شرح مفصل لماذا هذه الإجابة صحيحة وما المفهوم المختبر",
      "difficulty": "${difficulty}",
      "category": "المفهوم المختبر",
      "cognitiveLevel": "analysis/application/synthesis",
      "relatedConcepts": ["مفهوم 1", "مفهوم 2"]
    }
  ],
  "metadata": {
    "contentDomain": "${contentAnalysis.domain}",
    "questionTypes": ["multiple_choice"],
    "cognitiveDistribution": {
      "knowledge": 0,
      "comprehension": 1,
      "application": 2,
      "analysis": 2,
      "synthesis": 0,
      "evaluation": 0
    }
  }
}

**ملاحظات مهمة:**
- ركز على المحتوى الفعلي وليس معلومات عامة
- اجعل كل سؤال يختبر مفهوماً مختلفاً
- تأكد من أن الأسئلة تتطلب فهماً وليس حفظاً
- استخدم مصطلحات من المحتوى نفسه

**تحذير مهم جداً:**
يجب أن تكون إجابتك JSON صحيح فقط، بدون أي نص إضافي قبل أو بعد JSON. ابدأ بـ { وانته بـ }` :

      `You are an expert in education and academic assessment. Your task is to create intelligent and advanced questions that test deep understanding of scientific content.

📖 **Scientific Content:**
"${content.substring(0, 4000)}${content.length > 4000 ? '...' : ''}"
${analysisInfo}

🎯 **Intelligent Question Requirements:**

1. **Deep Analysis and Understanding**:
   - Test understanding of core concepts, not memorization
   - Focus on relationships between different concepts
   - Test ability to apply and analyze

2. **Required Question Types**:
   - Multiple choice (analytical)
   - Application questions (what happens if...)
   - Comparison questions (compare between...)
   - Inference questions (infer from...)
   - Problem-solving questions

3. **Quality Standards**:
   - Each question must test an important concept from the content
   - Wrong options should be logical and reasonable
   - Avoid trivial or superficial questions
   - Focus on scientific and technical concepts
   - Avoid general questions like "Who is the author" or "When was this written"
   - Do not ask about personal information or general historical facts

4. **Examples of Required Questions**:
   - "What is the purpose of using [concept from text] in this context?"
   - "How does [factor from text] affect [result mentioned in text]?"
   - "What is the relationship between [concept 1] and [concept 2] as mentioned in the text?"
   - "If [variable from text] is changed, what would happen to [result from text]?"

5. **Examples of Rejected Questions**:
   - "Who is the author of this text?"
   - "When was this content written?"
   - "What is the name of the book?"
   - "In what year did this happen?"

Create ${questionCount} intelligent questions with ${difficulty} difficulty level.

**Question Language**: Questions must be in ${contentLanguage === 'ar' ? 'Arabic' : contentLanguage === 'en' ? 'English' : 'Arabic (since content is mixed)'} to match the uploaded content language.

**Response Format (JSON):**
{
  "questions": [
    {
      "questionText": "Intelligent question text here",
      "questionType": "multiple_choice",
      "options": [
        "First option (correct)",
        "Second option (logical wrong)",
        "Third option (logical wrong)",
        "Fourth option (logical wrong)"
      ],
      "correctAnswer": 0,
      "explanation": "Detailed explanation why this answer is correct and what concept is tested",
      "difficulty": "${difficulty}",
      "category": "Tested concept",
      "cognitiveLevel": "analysis/application/synthesis",
      "relatedConcepts": ["concept 1", "concept 2"]
    }
  ],
  "metadata": {
    "contentDomain": "${contentAnalysis.domain}",
    "questionTypes": ["multiple_choice"],
    "cognitiveDistribution": {
      "knowledge": 0,
      "comprehension": 1,
      "application": 2,
      "analysis": 2,
      "synthesis": 0,
      "evaluation": 0
    }
  }
}

**Important Notes:**
- Focus on actual content, not general information
- Make each question test a different concept
- Ensure questions require understanding, not memorization
- Use terminology from the content itself`;

    const result = await this.sendRequest(prompt, 'analysis', {
      maxTokens: 3000,
      temperature: 0.3
    });

    // معالجة خاصة للاستجابات غير المنسقة
    if (result.success && result.data) {
      try {
        // محاولة تنظيف الاستجابة واستخراج JSON
        let cleanedData = result.data.trim();

        // البحث عن JSON في النص
        const jsonMatch = cleanedData.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedData = jsonMatch[0];

          // التحقق من صحة JSON
          JSON.parse(cleanedData);

          // إرجاع النتيجة المنظفة
          return {
            ...result,
            data: cleanedData
          };
        } else {
          console.warn('⚠️ لم يتم العثور على JSON في الاستجابة، سيتم إنشاء أسئلة بديلة');

          // إنشاء أسئلة بديلة بسيطة من المحتوى
          const fallbackQuestions = this.generateFallbackQuestions(content, options);
          return {
            success: true,
            data: JSON.stringify(fallbackQuestions)
          };
        }
      } catch (parseError) {
        console.warn('⚠️ فشل في تحليل JSON، سيتم إنشاء أسئلة بديلة');

        // إنشاء أسئلة بديلة بسيطة من المحتوى
        const fallbackQuestions = this.generateFallbackQuestions(content, options);
        return {
          success: true,
          data: JSON.stringify(fallbackQuestions)
        };
      }
    }

    return result;
  }

  /**
   * تحليل مجال المحتوى العلمي
   */
  analyzeContentDomain(content) {
    const text = content.toLowerCase();

    // كلمات مفتاحية لكل مجال
    const domains = {
      programming: {
        keywords: ['function', 'variable', 'loop', 'array', 'object', 'class', 'method', 'algorithm', 'code', 'programming', 'دالة', 'متغير', 'حلقة', 'مصفوفة', 'كائن', 'فئة', 'خوارزمية', 'برمجة', 'كود'],
        weight: 0
      },
      mathematics: {
        keywords: ['equation', 'formula', 'theorem', 'proof', 'calculate', 'solve', 'mathematics', 'number', 'معادلة', 'صيغة', 'نظرية', 'برهان', 'حساب', 'حل', 'رياضيات', 'رقم'],
        weight: 0
      },
      science: {
        keywords: ['experiment', 'hypothesis', 'theory', 'research', 'analysis', 'data', 'result', 'conclusion', 'تجربة', 'فرضية', 'نظرية', 'بحث', 'تحليل', 'بيانات', 'نتيجة', 'استنتاج'],
        weight: 0
      },
      literature: {
        keywords: ['author', 'poem', 'story', 'character', 'theme', 'style', 'literary', 'text', 'مؤلف', 'قصيدة', 'قصة', 'شخصية', 'موضوع', 'أسلوب', 'أدبي', 'نص'],
        weight: 0
      },
      history: {
        keywords: ['historical', 'period', 'event', 'civilization', 'culture', 'society', 'war', 'peace', 'تاريخي', 'فترة', 'حدث', 'حضارة', 'ثقافة', 'مجتمع', 'حرب', 'سلام'],
        weight: 0
      },
      business: {
        keywords: ['management', 'strategy', 'market', 'business', 'company', 'profit', 'customer', 'service', 'إدارة', 'استراتيجية', 'سوق', 'أعمال', 'شركة', 'ربح', 'عميل', 'خدمة'],
        weight: 0
      }
    };

    // حساب الوزن لكل مجال
    Object.keys(domains).forEach(domain => {
      domains[domain].keywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi');
        const matches = text.match(regex);
        if (matches) {
          domains[domain].weight += matches.length;
        }
      });
    });

    // تحديد المجال الأكثر احتمالاً
    let dominantDomain = 'general';
    let maxWeight = 0;

    Object.keys(domains).forEach(domain => {
      if (domains[domain].weight > maxWeight) {
        maxWeight = domains[domain].weight;
        dominantDomain = domain;
      }
    });

    return {
      domain: dominantDomain,
      confidence: maxWeight / (content.split(' ').length / 100), // نسبة الثقة
      weights: domains
    };
  }

  /**
   * فهم المحتوى بعمق باستخدام الذكاء الاصطناعي
   */
  async deepContentUnderstanding(content, options = {}) {
    const { language = 'ar' } = options;

    // كشف لغة المحتوى
    const detectedLanguage = this.detectContentLanguage(content);
    const contentLanguage = detectedLanguage === 'en' ? 'en' : detectedLanguage === 'mixed' ? 'mixed' : 'ar';

    console.log('🔍 تحليل المحتوى للفهم العميق...');

    const prompt = contentLanguage === 'ar' || contentLanguage === 'mixed' ?
      `أنت خبير في فهم وتحليل المحتوى العلمي والأكاديمي. مهمتك قراءة وفهم النص التالي بعمق شديد:

📖 **النص المراد فهمه:**
"${content}"

🎯 **مطلوب منك فهم عميق يشمل:**

1. **الفهم الأساسي**:
   - ما هو الموضوع الرئيسي؟
   - ما هي الأفكار الأساسية؟
   - ما هي المفاهيم المهمة؟

2. **التحليل العلمي**:
   - ما هي النظريات أو القوانين المذكورة؟
   - ما هي العمليات أو الخطوات الموضحة؟
   - ما هي العلاقات بين المفاهيم؟

3. **التطبيقات والأمثلة**:
   - ما هي الأمثلة المذكورة؟
   - ما هي التطبيقات العملية؟
   - ما هي الحالات الخاصة؟

4. **النقاط المهمة للاختبار**:
   - ما هي المفاهيم التي يجب أن يفهمها الطالب؟
   - ما هي العلاقات التي يجب أن يدركها؟
   - ما هي التطبيقات التي يجب أن يتقنها؟

**تنسيق الإجابة (JSON):**
{
  "summary": "ملخص شامل للمحتوى في 3-4 جمل",
  "mainTopic": "الموضوع الرئيسي",
  "keyPoints": [
    "النقطة الأولى المهمة",
    "النقطة الثانية المهمة"
  ],
  "concepts": [
    {
      "name": "اسم المفهوم",
      "definition": "تعريف المفهوم",
      "importance": "high/medium/low"
    }
  ],
  "testablePoints": [
    {
      "point": "النقطة القابلة للاختبار",
      "type": "understanding/application/analysis",
      "difficulty": "easy/medium/hard"
    }
  ],
  "detectedLanguage": "${contentLanguage}",
  "complexity": "beginner/intermediate/advanced"
}

**تعليمات مهمة:**
- اقرأ النص بعناية فائقة
- فهم كل جملة ومعناها
- استخرج المعلومات الدقيقة من النص نفسه
- لا تضيف معلومات من خارج النص
- يجب أن تكون إجابتك JSON صحيح فقط` :

      `You are an expert in understanding and analyzing scientific and academic content. Your task is to read and deeply understand the following text:

📖 **Text to Understand:**
"${content}"

🎯 **Required deep understanding includes:**

1. **Basic Understanding**:
   - What is the main topic?
   - What are the key ideas?
   - What are the important concepts?

2. **Scientific Analysis**:
   - What theories or laws are mentioned?
   - What processes or steps are explained?
   - What relationships exist between concepts?

3. **Applications and Examples**:
   - What examples are mentioned?
   - What practical applications exist?

4. **Important Points for Testing**:
   - What concepts should students understand?
   - What relationships should they recognize?
   - What applications should they master?

**Response Format (JSON):**
{
  "summary": "Comprehensive summary of content in 3-4 sentences",
  "mainTopic": "Main topic",
  "keyPoints": [
    "First important point",
    "Second important point"
  ],
  "concepts": [
    {
      "name": "Concept name",
      "definition": "Concept definition",
      "importance": "high/medium/low"
    }
  ],
  "testablePoints": [
    {
      "point": "Testable point",
      "type": "understanding/application/analysis",
      "difficulty": "easy/medium/hard"
    }
  ],
  "detectedLanguage": "${contentLanguage}",
  "complexity": "beginner/intermediate/advanced"
}

**Important Instructions:**
- Read the text with extreme care
- Understand every sentence and its meaning
- Extract precise information from the text itself
- Do not add information from outside the text
- Your response must be valid JSON only`;

    try {
      const result = await this.sendRequest(prompt, 'analysis', {
        maxTokens: 3000,
        temperature: 0.2
      });

      if (result.success && result.data) {
        try {
          // محاولة تنظيف الاستجابة واستخراج JSON
          let cleanedData = result.data.trim();

          // البحث عن JSON في النص
          const jsonMatch = cleanedData.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            cleanedData = jsonMatch[0];

            // التحقق من صحة JSON
            const understanding = JSON.parse(cleanedData);

            console.log('✅ تم فهم المحتوى بنجاح');
            console.log('📊 المفاهيم المستخرجة:', understanding.concepts?.length || 0);
            console.log('📝 النقاط القابلة للاختبار:', understanding.testablePoints?.length || 0);

            return {
              success: true,
              understanding
            };
          } else {
            console.warn('⚠️ لم يتم العثور على JSON، سيتم إنشاء فهم بديل من النص');
            // إنشاء فهم بديل من النص المرجع
            const fallbackUnderstanding = this.createFallbackUnderstanding(content, result.data);
            return {
              success: true,
              understanding: fallbackUnderstanding
            };
          }
        } catch (parseError) {
          console.warn('⚠️ فشل في تحليل JSON، سيتم إنشاء فهم بديل');
          // إنشاء فهم بديل من النص المرجع
          const fallbackUnderstanding = this.createFallbackUnderstanding(content, result.data);
          return {
            success: true,
            understanding: fallbackUnderstanding
          };
        }
      } else {
        console.warn('⚠️ فشل في الحصول على استجابة الفهم، سيتم إنشاء فهم بديل');
        // إنشاء فهم بديل من المحتوى مباشرة
        const fallbackUnderstanding = this.createFallbackUnderstanding(content);
        return {
          success: true,
          understanding: fallbackUnderstanding
        };
      }
    } catch (error) {
      console.error('💥 خطأ في عملية الفهم العميق:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * إنشاء فهم بديل ذكي من المحتوى
   */
  createFallbackUnderstanding(content, aiResponse = '') {
    console.log('🔧 إنشاء فهم بديل ذكي من المحتوى...');

    // كشف لغة المحتوى
    const detectedLanguage = this.detectContentLanguage(content);

    // تحليل المجال
    const domainAnalysis = this.analyzeContentDomain(content);

    // استخراج الجمل المهمة
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const importantSentences = sentences.slice(0, 5);

    // استخراج المفاهيم
    const concepts = this.extractScientificConcepts(content, domainAnalysis.domain);

    // تحليل العناوين والأقسام
    const headings = content.match(/^#+\s+(.+)$/gm) || [];
    const mainTopics = headings.map(h => h.replace(/^#+\s+/, '').trim());

    // إنشاء ملخص ذكي
    const summary = this.createIntelligentSummary(content, importantSentences, concepts);

    // تحديد النقاط القابلة للاختبار
    const testablePoints = this.identifyTestablePoints(content, concepts, domainAnalysis.domain);

    // إنشاء مفاهيم منظمة
    const organizedConcepts = concepts.slice(0, 8).map(concept => ({
      name: concept,
      definition: this.extractConceptDefinition(content, concept),
      importance: this.assessConceptImportance(content, concept),
      relatedTo: concepts.filter(c => c !== concept).slice(0, 2)
    }));

    const fallbackUnderstanding = {
      summary,
      mainTopic: mainTopics[0] || this.extractMainTopic(content),
      keyPoints: this.extractKeyPoints(content, importantSentences),
      concepts: organizedConcepts,
      testablePoints,
      detectedLanguage,
      complexity: this.assessComplexity(content),
      domain: domainAnalysis.domain,
      confidence: 0.8,
      source: 'fallback_analysis'
    };

    console.log('✅ تم إنشاء فهم بديل ذكي');
    console.log('📊 المفاهيم:', organizedConcepts.length);
    console.log('📝 النقاط القابلة للاختبار:', testablePoints.length);

    return fallbackUnderstanding;
  }

  /**
   * إنشاء ملخص ذكي
   */
  createIntelligentSummary(content, sentences, concepts) {
    const mainConcepts = concepts.slice(0, 3).join('، ');
    const firstSentence = sentences[0] || '';
    const lastSentence = sentences[sentences.length - 1] || '';

    if (this.detectContentLanguage(content) === 'en') {
      return `This content discusses ${mainConcepts}. ${firstSentence.substring(0, 100)}. The material covers key concepts and their applications.`;
    } else {
      return `يتناول هذا المحتوى ${mainConcepts}. ${firstSentence.substring(0, 100)}. تغطي المادة المفاهيم الأساسية وتطبيقاتها.`;
    }
  }

  /**
   * استخراج النقاط الرئيسية
   */
  extractKeyPoints(content, sentences) {
    const points = [];

    // البحث عن النقاط المرقمة أو المنقطة
    const bulletPoints = content.match(/^[\s]*[-*•]\s+(.+)$/gm) || [];
    const numberedPoints = content.match(/^[\s]*\d+\.\s+(.+)$/gm) || [];

    // إضافة النقاط المنسقة
    bulletPoints.concat(numberedPoints).forEach(point => {
      const cleanPoint = point.replace(/^[\s]*[-*•\d.]\s+/, '').trim();
      if (cleanPoint.length > 10) {
        points.push(cleanPoint);
      }
    });

    // إذا لم نجد نقاط منسقة، استخدم الجمل المهمة
    if (points.length === 0) {
      sentences.slice(0, 4).forEach(sentence => {
        if (sentence.trim().length > 20) {
          points.push(sentence.trim().substring(0, 100));
        }
      });
    }

    return points.slice(0, 5);
  }

  /**
   * تحديد النقاط القابلة للاختبار
   */
  identifyTestablePoints(content, concepts, domain) {
    const testablePoints = [];

    // نقاط تعريف المفاهيم
    concepts.slice(0, 3).forEach(concept => {
      testablePoints.push({
        point: `فهم مفهوم ${concept}`,
        type: 'understanding',
        difficulty: 'medium',
        why: `${concept} مفهوم أساسي في المحتوى`
      });
    });

    // نقاط التطبيق حسب المجال
    if (domain === 'programming') {
      testablePoints.push({
        point: 'تطبيق المفاهيم البرمجية',
        type: 'application',
        difficulty: 'hard',
        why: 'التطبيق العملي مهم في البرمجة'
      });
    } else if (domain === 'science') {
      testablePoints.push({
        point: 'تحليل العمليات العلمية',
        type: 'analysis',
        difficulty: 'hard',
        why: 'التحليل العلمي مهارة أساسية'
      });
    }

    // نقاط المقارنة
    if (concepts.length > 1) {
      testablePoints.push({
        point: `مقارنة بين ${concepts[0]} و ${concepts[1]}`,
        type: 'analysis',
        difficulty: 'medium',
        why: 'المقارنة تعمق الفهم'
      });
    }

    return testablePoints.slice(0, 6);
  }

  /**
   * استخراج تعريف المفهوم
   */
  extractConceptDefinition(content, concept) {
    const sentences = content.split(/[.!?]+/);

    // البحث عن جملة تحتوي على المفهوم
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(concept.toLowerCase())) {
        const cleanSentence = sentence.trim();
        if (cleanSentence.length > 20 && cleanSentence.length < 200) {
          return cleanSentence;
        }
      }
    }

    return `مفهوم ${concept} مذكور في المحتوى`;
  }

  /**
   * تقييم أهمية المفهوم
   */
  assessConceptImportance(content, concept) {
    const text = content.toLowerCase();
    const conceptLower = concept.toLowerCase();

    // حساب تكرار المفهوم
    const frequency = (text.match(new RegExp(conceptLower, 'g')) || []).length;

    // تحديد الأهمية بناءً على التكرار والموقع
    const inTitle = content.substring(0, 200).toLowerCase().includes(conceptLower);

    if (frequency > 3 || inTitle) return 'high';
    if (frequency > 1) return 'medium';
    return 'low';
  }

  /**
   * استخراج الموضوع الرئيسي
   */
  extractMainTopic(content) {
    // البحث عن العنوان الأول
    const firstHeading = content.match(/^#+\s+(.+)$/m);
    if (firstHeading) {
      return firstHeading[1].trim();
    }

    // استخراج من الجملة الأولى
    const firstSentence = content.split(/[.!?]+/)[0];
    if (firstSentence && firstSentence.length > 10) {
      return firstSentence.trim().substring(0, 50);
    }

    return 'موضوع علمي';
  }

  /**
   * تقييم مستوى التعقيد
   */
  assessComplexity(content) {
    const technicalTerms = (content.match(/\b[A-Za-z\u0600-\u06FF]{8,}\b/g) || []).length;
    const sentences = content.split(/[.!?]+/).length;
    const avgSentenceLength = content.length / sentences;

    if (technicalTerms > 20 || avgSentenceLength > 100) return 'advanced';
    if (technicalTerms > 10 || avgSentenceLength > 50) return 'intermediate';
    return 'beginner';
  }

  /**
   * توليد أسئلة ذكية بناءً على الفهم العميق للمحتوى
   */
  async generateQuestionsFromUnderstanding(understanding, options = {}) {
    const { questionCount = 5, difficulty = 'medium', language = 'ar' } = options;

    console.log('🎯 توليد أسئلة ذكية بناءً على الفهم العميق...');

    const prompt = understanding.detectedLanguage === 'en' ?
      `You are an expert educator who creates intelligent questions based on deep content understanding.

📚 **Content Understanding:**
- **Main Topic**: ${understanding.mainTopic}
- **Summary**: ${understanding.summary}
- **Key Points**: ${understanding.keyPoints?.join(', ')}
- **Concepts**: ${understanding.concepts?.map(c => `${c.name} (${c.importance})`).join(', ')}
- **Testable Points**: ${understanding.testablePoints?.map(t => `${t.point} (${t.type})`).join(', ')}
- **Complexity**: ${understanding.complexity}

🎯 **Create ${questionCount} intelligent questions that:**

1. **Test Deep Understanding**: Focus on concepts, relationships, and applications
2. **Match Content Language**: Questions must be in English
3. **Avoid Superficial Questions**: No questions about author, date, or general information
4. **Test Real Knowledge**: Based on the actual content understanding above

**Question Types to Create:**
- Conceptual understanding questions
- Application and analysis questions
- Relationship and comparison questions
- Problem-solving questions

**Response Format (JSON):**
{
  "questions": [
    {
      "questionText": "Intelligent question based on understanding",
      "questionType": "multiple_choice",
      "options": [
        "Correct answer based on content understanding",
        "Logical wrong option",
        "Another logical wrong option",
        "Third logical wrong option"
      ],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct based on the content",
      "difficulty": "${difficulty}",
      "category": "Concept being tested",
      "cognitiveLevel": "understanding/application/analysis",
      "basedOnConcept": "Which concept from understanding this tests"
    }
  ],
  "metadata": {
    "basedOnUnderstanding": true,
    "mainTopic": "${understanding.mainTopic}",
    "questionTypes": ["multiple_choice"],
    "generationType": "deep_understanding"
  }
}

**Critical Requirements:**
- Questions MUST be based on the content understanding provided above
- Questions MUST be in English since content is in English
- NO questions about author, publication date, or external information
- Focus on the concepts and knowledge from the understanding
- Each question should test a different aspect of the content
- Response must be valid JSON only` :

      `أنت خبير تعليمي ينشئ أسئلة ذكية بناءً على الفهم العميق للمحتوى.

📚 **فهم المحتوى:**
- **الموضوع الرئيسي**: ${understanding.mainTopic}
- **الملخص**: ${understanding.summary}
- **النقاط الرئيسية**: ${understanding.keyPoints?.join(', ')}
- **المفاهيم**: ${understanding.concepts?.map(c => `${c.name} (${c.importance})`).join(', ')}
- **النقاط القابلة للاختبار**: ${understanding.testablePoints?.map(t => `${t.point} (${t.type})`).join(', ')}
- **مستوى التعقيد**: ${understanding.complexity}

🎯 **أنشئ ${questionCount} سؤال ذكي:**

1. **اختبار الفهم العميق**: ركز على المفاهيم والعلاقات والتطبيقات
2. **مطابقة لغة المحتوى**: الأسئلة يجب أن تكون بالعربية
3. **تجنب الأسئلة السطحية**: لا أسئلة عن المؤلف أو التاريخ أو معلومات عامة
4. **اختبار المعرفة الحقيقية**: بناءً على فهم المحتوى الفعلي أعلاه

**أنواع الأسئلة المطلوبة:**
- أسئلة فهم المفاهيم
- أسئلة التطبيق والتحليل
- أسئلة العلاقات والمقارنات
- أسئلة حل المشاكل

**تنسيق الإجابة (JSON):**
{
  "questions": [
    {
      "questionText": "سؤال ذكي بناءً على الفهم",
      "questionType": "multiple_choice",
      "options": [
        "الإجابة الصحيحة بناءً على فهم المحتوى",
        "خيار خطأ منطقي",
        "خيار خطأ منطقي آخر",
        "خيار خطأ منطقي ثالث"
      ],
      "correctAnswer": 0,
      "explanation": "لماذا هذه الإجابة صحيحة بناءً على المحتوى",
      "difficulty": "${difficulty}",
      "category": "المفهوم المختبر",
      "cognitiveLevel": "understanding/application/analysis",
      "basedOnConcept": "أي مفهوم من الفهم يختبره هذا السؤال"
    }
  ],
  "metadata": {
    "basedOnUnderstanding": true,
    "mainTopic": "${understanding.mainTopic}",
    "questionTypes": ["multiple_choice"],
    "generationType": "deep_understanding"
  }
}

**متطلبات حاسمة:**
- الأسئلة يجب أن تكون مبنية على فهم المحتوى المقدم أعلاه
- الأسئلة يجب أن تكون بالعربية لأن المحتوى عربي
- لا أسئلة عن المؤلف أو تاريخ النشر أو معلومات خارجية
- ركز على المفاهيم والمعرفة من الفهم
- كل سؤال يجب أن يختبر جانب مختلف من المحتوى
- الاستجابة يجب أن تكون JSON صحيح فقط`;

    try {
      const result = await this.sendRequest(prompt, 'analysis', {
        maxTokens: 3000,
        temperature: 0.3
      });

      if (result.success && result.data) {
        try {
          // محاولة تنظيف الاستجابة واستخراج JSON
          let cleanedData = result.data.trim();

          // البحث عن JSON في النص
          const jsonMatch = cleanedData.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            cleanedData = jsonMatch[0];

            // التحقق من صحة JSON
            const questionsData = JSON.parse(cleanedData);

            console.log('✅ تم توليد الأسئلة الذكية بناءً على الفهم');
            console.log('📊 عدد الأسئلة المولدة:', questionsData.questions?.length || 0);

            return {
              success: true,
              data: cleanedData
            };
          } else {
            console.warn('⚠️ لم يتم العثور على JSON في استجابة الأسئلة، سيتم استخدام النظام البديل الذكي');
            return this.generateIntelligentFallbackFromUnderstanding(understanding, options);
          }
        } catch (parseError) {
          console.warn('⚠️ فشل في تحليل JSON للأسئلة، سيتم استخدام النظام البديل الذكي');
          return this.generateIntelligentFallbackFromUnderstanding(understanding, options);
        }
      } else {
        console.warn('⚠️ فشل في الحصول على استجابة الأسئلة، سيتم استخدام النظام البديل الذكي');
        return this.generateIntelligentFallbackFromUnderstanding(understanding, options);
      }
    } catch (error) {
      console.error('💥 خطأ في توليد الأسئلة من الفهم:', error);
      return this.generateIntelligentFallbackFromUnderstanding(understanding, options);
    }
  }

  /**
   * توليد أسئلة ذكية بديلة بناءً على الفهم العميق
   */
  generateIntelligentFallbackFromUnderstanding(understanding, options = {}) {
    const { questionCount = 5, difficulty = 'medium', language = 'ar' } = options;

    console.log('🧠 توليد أسئلة ذكية بديلة بناءً على الفهم العميق...');

    const questions = [];
    const usedConcepts = new Set();

    // الأسئلة من المفاهيم
    if (understanding.concepts && understanding.concepts.length > 0) {
      understanding.concepts.slice(0, Math.ceil(questionCount * 0.6)).forEach((concept, index) => {
        const question = this.createConceptBasedQuestion(concept, understanding, language, difficulty);
        if (question) {
          questions.push({
            ...question,
            id: `understanding_concept_${index}`,
            difficulty,
            category: understanding.domain || 'general',
            cognitiveLevel: 'understanding',
            basedOnConcept: concept.name,
            sourceType: 'deep_understanding'
          });
          usedConcepts.add(concept.name);
        }
      });
    }

    // الأسئلة من النقاط القابلة للاختبار
    if (understanding.testablePoints && understanding.testablePoints.length > 0) {
      understanding.testablePoints.slice(0, Math.ceil(questionCount * 0.4)).forEach((point, index) => {
        const question = this.createTestablePointQuestion(point, understanding, language, difficulty);
        if (question) {
          questions.push({
            ...question,
            id: `understanding_point_${index}`,
            difficulty: point.difficulty || difficulty,
            category: understanding.domain || 'general',
            cognitiveLevel: point.type || 'comprehension',
            basedOnPoint: point.point,
            sourceType: 'deep_understanding'
          });
        }
      });
    }

    // إضافة أسئلة تحليلية إذا كان لدينا مفاهيم متعددة
    if (understanding.concepts && understanding.concepts.length > 1) {
      const comparisonQuestion = this.createComparisonQuestion(
        understanding.concepts[0],
        understanding.concepts[1],
        understanding,
        language,
        difficulty
      );
      if (comparisonQuestion) {
        questions.push({
          ...comparisonQuestion,
          id: 'understanding_comparison',
          difficulty,
          category: understanding.domain || 'general',
          cognitiveLevel: 'analysis',
          basedOnConcept: `${understanding.concepts[0].name} vs ${understanding.concepts[1].name}`,
          sourceType: 'deep_understanding'
        });
      }
    }

    // تحديد عدد الأسئلة المطلوب
    const finalQuestions = questions.slice(0, questionCount);

    console.log('✅ تم توليد', finalQuestions.length, 'سؤال ذكي من الفهم العميق');

    return {
      success: true,
      data: JSON.stringify({
        questions: finalQuestions,
        metadata: {
          basedOnUnderstanding: true,
          mainTopic: understanding.mainTopic,
          questionTypes: ['multiple_choice'],
          generationType: 'intelligent_fallback_from_understanding',
          conceptsUsed: Array.from(usedConcepts),
          understandingSource: understanding.source || 'ai_analysis'
        }
      })
    };
  }

  /**
   * إنشاء سؤال بناءً على مفهوم
   */
  createConceptBasedQuestion(concept, understanding, language, difficulty) {
    const templates = {
      ar: {
        definition: `ما هو المقصود بـ "${concept.name}" كما ورد في المحتوى؟`,
        purpose: `ما هو الغرض الأساسي من "${concept.name}" في هذا السياق؟`,
        application: `كيف يتم تطبيق مفهوم "${concept.name}" عملياً؟`,
        importance: `لماذا يعتبر "${concept.name}" مهماً في ${understanding.mainTopic}؟`
      },
      en: {
        definition: `What is meant by "${concept.name}" as mentioned in the content?`,
        purpose: `What is the main purpose of "${concept.name}" in this context?`,
        application: `How is the concept of "${concept.name}" applied practically?`,
        importance: `Why is "${concept.name}" important in ${understanding.mainTopic}?`
      }
    };

    const langTemplates = templates[language] || templates.ar;
    const templateKeys = Object.keys(langTemplates);
    const selectedTemplate = templateKeys[Math.floor(Math.random() * templateKeys.length)];
    const questionText = langTemplates[selectedTemplate];

    // إنشاء خيارات ذكية
    const options = this.createIntelligentOptionsForConcept(concept, understanding, language);

    return {
      questionText,
      questionType: 'multiple_choice',
      options,
      correctAnswer: 0,
      explanation: language === 'ar' ?
        `بناءً على المحتوى: ${concept.definition || `${concept.name} مفهوم مهم في الموضوع`}` :
        `Based on the content: ${concept.definition || `${concept.name} is an important concept in the topic`}`
    };
  }

  /**
   * إنشاء سؤال بناءً على نقطة قابلة للاختبار
   */
  createTestablePointQuestion(point, understanding, language, difficulty) {
    const templates = {
      ar: {
        understanding: `بناءً على المحتوى، ${point.point}؟`,
        application: `كيف يمكن تطبيق ${point.point} في الممارسة العملية؟`,
        analysis: `حلل العلاقة بين ${point.point} والمفاهيم الأخرى في المحتوى؟`
      },
      en: {
        understanding: `Based on the content, ${point.point}?`,
        application: `How can ${point.point} be applied in practice?`,
        analysis: `Analyze the relationship between ${point.point} and other concepts in the content?`
      }
    };

    const langTemplates = templates[language] || templates.ar;
    const questionType = point.type || 'understanding';
    const questionText = langTemplates[questionType] || langTemplates.understanding;

    // إنشاء خيارات ذكية
    const options = this.createIntelligentOptionsForPoint(point, understanding, language);

    return {
      questionText,
      questionType: 'multiple_choice',
      options,
      correctAnswer: 0,
      explanation: language === 'ar' ?
        `هذا السؤال يختبر ${point.why || 'فهم المفهوم المهم'}` :
        `This question tests ${point.why || 'understanding of the important concept'}`
    };
  }

  /**
   * إنشاء سؤال مقارنة
   */
  createComparisonQuestion(concept1, concept2, understanding, language, difficulty) {
    const questionText = language === 'ar' ?
      `ما هو الفرق الأساسي بين "${concept1.name}" و "${concept2.name}" كما ورد في المحتوى؟` :
      `What is the main difference between "${concept1.name}" and "${concept2.name}" as mentioned in the content?`;

    const options = language === 'ar' ? [
      `${concept1.name} و ${concept2.name} لهما خصائص وتطبيقات مختلفة كما هو موضح في المحتوى`,
      `${concept1.name} و ${concept2.name} متطابقان تماماً في الوظيفة`,
      `${concept2.name} أهم من ${concept1.name} في جميع الحالات`,
      `لا يوجد فرق بين ${concept1.name} و ${concept2.name}`
    ] : [
      `${concept1.name} and ${concept2.name} have different characteristics and applications as shown in the content`,
      `${concept1.name} and ${concept2.name} are exactly the same in function`,
      `${concept2.name} is more important than ${concept1.name} in all cases`,
      `There is no difference between ${concept1.name} and ${concept2.name}`
    ];

    return {
      questionText,
      questionType: 'multiple_choice',
      options,
      correctAnswer: 0,
      explanation: language === 'ar' ?
        `المقارنة بين المفاهيم تساعد على فهم خصائص كل منها` :
        `Comparing concepts helps understand the characteristics of each`
    };
  }

  /**
   * إنشاء خيارات ذكية للمفهوم
   */
  createIntelligentOptionsForConcept(concept, understanding, language) {
    if (language === 'ar') {
      return [
        concept.definition || `${concept.name} مفهوم أساسي مذكور في المحتوى بوضوح`,
        `${concept.name} مصطلح ثانوي وليس له أهمية كبيرة`,
        `${concept.name} يشير إلى شيء مختلف تماماً عن السياق`,
        `${concept.name} غير مرتبط بموضوع ${understanding.mainTopic}`
      ];
    } else {
      return [
        concept.definition || `${concept.name} is a fundamental concept clearly mentioned in the content`,
        `${concept.name} is a secondary term with no significant importance`,
        `${concept.name} refers to something completely different from the context`,
        `${concept.name} is unrelated to the topic of ${understanding.mainTopic}`
      ];
    }
  }

  /**
   * إنشاء خيارات ذكية للنقطة
   */
  createIntelligentOptionsForPoint(point, understanding, language) {
    if (language === 'ar') {
      return [
        `${point.point} نقطة مهمة ومرتبطة بالمحتوى المعروض`,
        `${point.point} نقطة ثانوية وليست ذات أهمية`,
        `${point.point} غير مذكورة في المحتوى`,
        `${point.point} تتعارض مع المحتوى المعروض`
      ];
    } else {
      return [
        `${point.point} is an important point related to the presented content`,
        `${point.point} is a secondary point with no importance`,
        `${point.point} is not mentioned in the content`,
        `${point.point} contradicts the presented content`
      ];
    }
  }

  /**
   * إنشاء أسئلة بديلة ذكية من المحتوى مباشرة
   */
  generateFallbackQuestions(content, options = {}) {
    const { questionCount = 5, difficulty = 'medium', language = 'ar' } = options;

    // كشف لغة المحتوى لتوليد أسئلة بنفس اللغة
    const detectedLanguage = this.detectContentLanguage(content);
    const contentLanguage = detectedLanguage === 'en' ? 'en' : detectedLanguage === 'mixed' ? 'ar' : 'ar';

    console.log('🌐 لغة المحتوى في الأسئلة البديلة:', detectedLanguage, '- لغة الأسئلة:', contentLanguage);

    // تحليل المحتوى لاستخراج المفاهيم المهمة
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 30);
    const words = content.split(/\s+/).filter(w => w.length > 4);
    const domain = this.analyzeContentDomain(content);

    // استخراج المصطلحات المهمة
    const importantTerms = this.extractImportantTerms(content, domain.domain);

    const questions = [];

    for (let i = 0; i < Math.min(questionCount, importantTerms.length); i++) {
      const term = importantTerms[i];
      const relatedSentence = sentences.find(s => s.toLowerCase().includes(term.toLowerCase())) || sentences[i % sentences.length];

      // تحديد صعوبة السؤال (إذا كان متعدد، اختر عشوائياً)
      let questionDifficulty = difficulty;
      if (difficulty === 'mixed') {
        const difficulties = ['easy', 'medium', 'hard'];
        questionDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
      }

      // تحديد ما إذا كان السؤال يحتاج خيارات (أول 3 أسئلة فقط)
      const includeOptions = i < 3;

      // إنشاء سؤال ذكي حسب المجال بلغة المحتوى
      const question = this.createDomainSpecificQuestion(term, relatedSentence, domain.domain, questionDifficulty, contentLanguage, includeOptions);

      if (question) {
        questions.push({
          ...question,
          id: `fallback_intelligent_${i}`,
          difficulty: questionDifficulty,
          category: domain.domain,
          cognitiveLevel: this.determineCognitiveLevel(question.questionText),
          relatedConcepts: [term],
          hasOptions: includeOptions
        });
      }
    }

    return {
      questions,
      metadata: {
        contentDomain: domain.domain,
        questionTypes: ['multiple_choice'],
        cognitiveDistribution: {
          knowledge: 1,
          comprehension: 2,
          application: 1,
          analysis: 1,
          synthesis: 0,
          evaluation: 0
        },
        generationType: 'fallback_intelligent'
      }
    };
  }

  /**
   * استخراج المصطلحات المهمة من المحتوى
   */
  extractImportantTerms(content, domain) {
    const text = content.toLowerCase();
    const words = content.split(/\s+/).filter(w => w.length > 3);

    // مصطلحات مهمة حسب المجال
    const domainTerms = {
      programming: ['function', 'variable', 'class', 'object', 'method', 'algorithm', 'loop', 'array', 'دالة', 'متغير', 'فئة', 'كائن', 'خوارزمية', 'حلقة', 'مصفوفة'],
      science: ['theory', 'experiment', 'hypothesis', 'analysis', 'research', 'نظرية', 'تجربة', 'فرضية', 'تحليل', 'بحث'],
      mathematics: ['equation', 'formula', 'theorem', 'proof', 'معادلة', 'صيغة', 'نظرية', 'برهان'],
      literature: ['character', 'theme', 'style', 'author', 'شخصية', 'موضوع', 'أسلوب', 'مؤلف']
    };

    const relevantTerms = domainTerms[domain] || [];
    const foundTerms = [];

    // البحث عن المصطلحات في النص
    relevantTerms.forEach(term => {
      if (text.includes(term.toLowerCase())) {
        foundTerms.push(term);
      }
    });

    // إضافة كلمات مهمة أخرى من النص
    const frequentWords = {};
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w\u0600-\u06FF]/g, '');
      if (cleanWord.length > 4) {
        frequentWords[cleanWord] = (frequentWords[cleanWord] || 0) + 1;
      }
    });

    // أخذ أكثر الكلمات تكراراً
    const sortedWords = Object.entries(frequentWords)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);

    return [...foundTerms, ...sortedWords].slice(0, 10);
  }

  /**
   * إنشاء سؤال متخصص حسب المجال
   */
  createDomainSpecificQuestion(term, context, domain, difficulty, language, includeOptions = true) {
    const templates = {
      programming: {
        ar: [
          `ما هو الغرض الأساسي من ${term} في البرمجة؟`,
          `كيف يتم استخدام ${term} في تطوير البرمجيات؟`,
          `ما هي الخصائص المميزة لـ ${term}؟`,
          `متى نحتاج لاستخدام ${term} في الكود؟`
        ],
        en: [
          `What is the main purpose of ${term} in programming?`,
          `How is ${term} used in software development?`,
          `What are the key characteristics of ${term}?`,
          `When do we need to use ${term} in code?`
        ]
      },
      science: {
        ar: [
          `ما هو التفسير العلمي لـ ${term}؟`,
          `كيف يؤثر ${term} على النتائج التجريبية؟`,
          `ما هي العلاقة بين ${term} والمفاهيم الأخرى؟`,
          `ما أهمية ${term} في البحث العلمي؟`
        ],
        en: [
          `What is the scientific explanation for ${term}?`,
          `How does ${term} affect experimental results?`,
          `What is the relationship between ${term} and other concepts?`,
          `What is the importance of ${term} in scientific research?`
        ]
      },
      general: {
        ar: [
          `ما المقصود بـ ${term} في هذا السياق؟`,
          `كيف يرتبط ${term} بالموضوع الرئيسي؟`,
          `ما أهمية فهم ${term}؟`,
          `ما هي التطبيقات العملية لـ ${term}؟`
        ],
        en: [
          `What is meant by ${term} in this context?`,
          `How does ${term} relate to the main topic?`,
          `What is the importance of understanding ${term}?`,
          `What are the practical applications of ${term}?`
        ]
      }
    };

    const domainTemplates = templates[domain] || templates.general;
    const languageTemplates = domainTemplates[language] || domainTemplates.ar;
    const questionTemplate = languageTemplates[Math.floor(Math.random() * languageTemplates.length)];

    if (includeOptions) {
      // إنشاء خيارات ذكية
      const options = this.generateIntelligentOptions(term, context, domain, language);

      return {
        questionText: questionTemplate,
        questionType: 'multiple_choice',
        options,
        correctAnswer: 0, // الخيار الأول دائماً صحيح
        explanation: language === 'ar' ?
          `بناءً على السياق: "${context.substring(0, 100)}..."` :
          `Based on the context: "${context.substring(0, 100)}..."`
      };
    } else {
      // سؤال بدون خيارات
      return {
        questionText: questionTemplate,
        questionType: 'open_ended',
        options: [], // بدون خيارات
        correctAnswer: null,
        explanation: language === 'ar' ?
          `هذا سؤال مفتوح للتفكير والتأمل في المحتوى` :
          `This is an open-ended question for reflection on the content`
      };
    }
  }

  /**
   * توليد خيارات ذكية للسؤال
   */
  generateIntelligentOptions(term, context, domain, language) {
    if (language === 'ar') {
      return [
        `${term} مفهوم أساسي مذكور في النص ويلعب دوراً مهماً في الموضوع`,
        `${term} مصطلح ثانوي وليس له تأثير كبير على الفهم العام`,
        `${term} يشير إلى شيء مختلف تماماً عن السياق المذكور`,
        `${term} غير مرتبط بالموضوع الرئيسي ولا يحتاج لفهمه`
      ];
    } else {
      return [
        `${term} is a fundamental concept mentioned in the text and plays an important role in the topic`,
        `${term} is a secondary term with no significant impact on general understanding`,
        `${term} refers to something completely different from the mentioned context`,
        `${term} is unrelated to the main topic and doesn't need to be understood`
      ];
    }
  }

  /**
   * تحديد المستوى المعرفي للسؤال
   */
  determineCognitiveLevel(questionText) {
    const text = questionText.toLowerCase();

    if (text.includes('ما هو') || text.includes('what is') || text.includes('تعريف')) {
      return 'knowledge';
    } else if (text.includes('كيف') || text.includes('how') || text.includes('لماذا')) {
      return 'comprehension';
    } else if (text.includes('استخدم') || text.includes('طبق') || text.includes('apply')) {
      return 'application';
    } else if (text.includes('قارن') || text.includes('حلل') || text.includes('analyze')) {
      return 'analysis';
    } else if (text.includes('أنشئ') || text.includes('صمم') || text.includes('create')) {
      return 'synthesis';
    } else if (text.includes('قيم') || text.includes('evaluate') || text.includes('نقد')) {
      return 'evaluation';
    }

    return 'comprehension'; // افتراضي
  }

  /**
   * استخراج المفاهيم العلمية من المحتوى
   */
  extractScientificConcepts(content, domain) {
    const text = content.toLowerCase();
    const concepts = [];

    // مفاهيم علمية حسب المجال
    const domainConcepts = {
      programming: [
        'algorithm', 'data structure', 'function', 'variable', 'loop', 'condition', 'class', 'object', 'inheritance', 'polymorphism',
        'خوارزمية', 'هيكل البيانات', 'دالة', 'متغير', 'حلقة', 'شرط', 'فئة', 'كائن', 'وراثة', 'تعدد الأشكال'
      ],
      science: [
        'hypothesis', 'theory', 'experiment', 'observation', 'analysis', 'conclusion', 'variable', 'control', 'method', 'result',
        'فرضية', 'نظرية', 'تجربة', 'ملاحظة', 'تحليل', 'استنتاج', 'متغير', 'تحكم', 'طريقة', 'نتيجة'
      ],
      mathematics: [
        'equation', 'formula', 'theorem', 'proof', 'function', 'variable', 'constant', 'derivative', 'integral', 'limit',
        'معادلة', 'صيغة', 'نظرية', 'برهان', 'دالة', 'متغير', 'ثابت', 'مشتقة', 'تكامل', 'نهاية'
      ],
      literature: [
        'character', 'theme', 'plot', 'setting', 'style', 'metaphor', 'symbol', 'narrative', 'conflict', 'resolution',
        'شخصية', 'موضوع', 'حبكة', 'مكان', 'أسلوب', 'استعارة', 'رمز', 'سرد', 'صراع', 'حل'
      ]
    };

    const relevantConcepts = domainConcepts[domain] || domainConcepts.science;

    // البحث عن المفاهيم في النص
    relevantConcepts.forEach(concept => {
      if (text.includes(concept.toLowerCase())) {
        concepts.push(concept);
      }
    });

    // إضافة مفاهيم أخرى من النص (كلمات تقنية)
    const technicalWords = content.match(/\b[A-Za-z\u0600-\u06FF]{6,}\b/g) || [];
    const uniqueTechnicalWords = [...new Set(technicalWords)]
      .filter(word => word.length > 5)
      .slice(0, 10);

    return [...concepts, ...uniqueTechnicalWords].slice(0, 15);
  }

  /**
   * كشف لغة المحتوى
   */
  detectContentLanguage(text) {
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    const totalChars = arabicChars + englishChars;

    if (totalChars === 0) return 'unknown';

    const arabicRatio = arabicChars / totalChars;
    const englishRatio = englishChars / totalChars;

    if (arabicRatio > 0.7) {
      return 'ar';
    } else if (englishRatio > 0.7) {
      return 'en';
    } else if (arabicRatio > 0.3 && englishRatio > 0.3) {
      return 'mixed';
    } else if (arabicRatio > englishRatio) {
      return 'ar';
    } else {
      return 'en';
    }
  }

  /**
   * تحليل شامل لأداء الطالب - محسن
   */
  async analyzeComprehensivePerformance(comprehensiveData, options = {}) {
    const { language = 'ar', includeRecommendations = true, includePersonalizedPlan = true } = options;

    console.log('🧠 بدء التحليل الشامل للأداء...');

    const prompt = language === 'ar' ?
      `أنت خبير في التحليل التعليمي والذكاء الاصطناعي. مهمتك تحليل أداء الطالب بشكل شامل ومتقدم.

📊 **بيانات الأداء الشاملة:**

👤 **معلومات الطالب:**
- الاسم: ${comprehensiveData.userProfile.name}
- فترة التحليل: ${comprehensiveData.userProfile.period}

💬 **أداء المحادثات التعليمية:**
- إجمالي المحادثات: ${comprehensiveData.lectureData.stats.totalChats}
- إجمالي الرسائل: ${comprehensiveData.lectureData.stats.totalMessages}
- متوسط مدة المحادثة: ${comprehensiveData.lectureData.stats.avgDuration} دقيقة

📝 **أداء الاختبارات:**
- إجمالي الاختبارات: ${comprehensiveData.quizData.stats.totalQuizzes}
- متوسط النقاط: ${comprehensiveData.quizData.stats.avgScore}%
- أفضل نقاط: ${comprehensiveData.quizData.stats.bestScore}%

🎯 **أداء المهام البرمجية:**
- إجمالي المهام: ${comprehensiveData.taskData.stats.totalTasks}
- المهام المكتملة: ${comprehensiveData.taskData.stats.completedTasks}
- إجمالي النقاط المكتسبة: ${comprehensiveData.taskData.stats.totalPoints}

📈 **المؤشرات العامة:**
- نقاط المشاركة: ${comprehensiveData.overallMetrics.engagementScore}/100
- سرعة التعلم: ${comprehensiveData.overallMetrics.learningVelocity} نشاط/يوم
- نقاط الثبات: ${comprehensiveData.overallMetrics.consistencyScore}%

🎯 **المطلوب منك تحليل شامل وتقديم:**

1. **تقييم عام للأداء** مع درجة من 100
2. **تحليل مفصل** لكل مجال (المحادثات، الاختبارات، المهام)
3. **نقاط القوة** بناءً على البيانات الفعلية
4. **نقاط التحسين** والمجالات التي تحتاج تطوير
5. **توصيات مخصصة** لتحسين الأداء
6. **خطة تعليمية شخصية** للفترة القادمة

**تنسيق الإجابة (JSON صحيح فقط):**
{
  "overallPerformance": {
    "score": 85,
    "grade": "ممتاز",
    "level": "متقدم",
    "summary": "ملخص شامل للأداء العام"
  },
  "detailedAnalysis": {
    "lectures": {
      "performance": "ممتاز",
      "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
      "improvements": ["تحسين 1", "تحسين 2"],
      "insights": "تحليل مفصل لأداء المحادثات"
    },
    "quizzes": {
      "performance": "جيد",
      "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
      "improvements": ["تحسين 1", "تحسين 2"],
      "insights": "تحليل مفصل لأداء الاختبارات"
    },
    "tasks": {
      "performance": "متوسط",
      "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
      "improvements": ["تحسين 1", "تحسين 2"],
      "insights": "تحليل مفصل لأداء المهام"
    }
  },
  "strengths": [
    "نقطة قوة عامة 1",
    "نقطة قوة عامة 2",
    "نقطة قوة عامة 3"
  ],
  "weaknesses": [
    "نقطة ضعف 1",
    "نقطة ضعف 2"
  ],
  "recommendations": [
    "توصية محددة 1",
    "توصية محددة 2",
    "توصية محددة 3",
    "توصية محددة 4"
  ],
  "personalizedPlan": {
    "daily": [
      "نشاط يومي 1",
      "نشاط يومي 2"
    ],
    "weekly": [
      "هدف أسبوعي 1",
      "هدف أسبوعي 2"
    ],
    "monthly": [
      "هدف شهري 1",
      "هدف شهري 2"
    ]
  },
  "nextSteps": [
    "خطوة تالية 1",
    "خطوة تالية 2",
    "خطوة تالية 3"
  ],
  "motivationalMessage": "رسالة تحفيزية شخصية للطالب"
}

**ملاحظات مهمة:**
- كن دقيقاً في التحليل واستخدم البيانات الفعلية
- قدم توصيات عملية وقابلة للتطبيق
- اجعل التحليل إيجابياً ومحفزاً
- يجب أن تكون إجابتك JSON صحيح فقط، بدون أي نص إضافي` :

      `You are an expert in educational analysis and AI. Analyze student performance comprehensively.

📊 **Comprehensive Performance Data:**
- Student: ${comprehensiveData.userProfile.name}
- Period: ${comprehensiveData.userProfile.period}
- Conversations: ${comprehensiveData.lectureData.stats.totalChats}
- Quizzes: ${comprehensiveData.quizData.stats.totalQuizzes} (Avg: ${comprehensiveData.quizData.stats.avgScore}%)
- Tasks: ${comprehensiveData.taskData.stats.completedTasks}/${comprehensiveData.taskData.stats.totalTasks}
- Engagement: ${comprehensiveData.overallMetrics.engagementScore}/100

Provide comprehensive analysis in JSON format with overall performance, detailed analysis, strengths, weaknesses, recommendations, and personalized plan.`;

    return await this.sendRequest(prompt, 'analysis', {
      maxTokens: 4000,
      temperature: 0.3
    });
  }

  /**
   * تحليل أداء الطالب وتقديم توصيات
   */
  async analyzeStudentPerformance(performanceData, options = {}) {
    const { language = 'ar', includeRecommendations = true } = options;

    const prompt = `
أنت مستشار تعليمي ذكي. قم بتحليل أداء الطالب وتقديم تقرير شامل.

بيانات الأداء:
${JSON.stringify(performanceData, null, 2)}

المطلوب تحليل شامل يتضمن:
1. تقييم الأداء العام
2. نقاط القوة والضعف
3. التوصيات للتحسين
4. خطة دراسية مقترحة
5. الأهداف قصيرة وطويلة المدى

يرجى تقديم التحليل بصيغة JSON:
{
  "overallPerformance": {
    "score": 85,
    "grade": "جيد جداً",
    "summary": "ملخص الأداء"
  },
  "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
  "weaknesses": ["نقطة ضعف 1", "نقطة ضعف 2"],
  "recommendations": [
    {
      "category": "فئة التوصية",
      "suggestion": "التوصية",
      "priority": "high/medium/low"
    }
  ],
  "studyPlan": {
    "shortTerm": ["هدف قصير المدى 1"],
    "longTerm": ["هدف طويل المدى 1"]
  }
}

استخدم اللغة ${language === 'ar' ? 'العربية' : 'الإنجليزية'} في جميع النصوص.
`;

    return await this.sendRequest(prompt, 'analysis', {
      maxTokens: 2500,
      temperature: 0.6
    });
  }

  /**
   * توليد تقرير تفصيلي
   */
  async generateDetailedReport(reportData, options = {}) {
    const { 
      reportType = 'performance',
      language = 'ar',
      includeCharts = true,
      includeRecommendations = true 
    } = options;

    const prompt = `
أنت خبير في إعداد التقارير التعليمية. قم بإنشاء تقرير تفصيلي احترافي.

بيانات التقرير:
${JSON.stringify(reportData, null, 2)}

نوع التقرير: ${reportType}
اللغة: ${language === 'ar' ? 'العربية' : 'الإنجليزية'}

المطلوب إنشاء تقرير شامل يتضمن:
1. ملخص تنفيذي
2. تحليل البيانات
3. الرسوم البيانية (إذا طُلب)
4. النتائج والاستنتاجات
5. التوصيات (إذا طُلب)

يرجى تقديم التقرير بصيغة HTML منسقة وجاهزة للعرض.
`;

    return await this.sendRequest(prompt, 'text', {
      maxTokens: 4000,
      temperature: 0.5
    });
  }

  /**
   * مساعدة في حل المهام البرمجية
   */
  async helpWithCodingTask(taskDescription, userCode, error = null, options = {}) {
    const { language = 'ar', programmingLanguage = 'javascript' } = options;

    const prompt = `
أنت مدرس برمجة خبير. ساعد الطالب في حل المهمة البرمجية.

وصف المهمة:
${taskDescription}

كود الطالب:
\`\`\`${programmingLanguage}
${userCode}
\`\`\`

${error ? `الخطأ الذي واجهه الطالب:\n${error}` : ''}

المطلوب:
1. تحليل الكود المكتوب
2. تحديد المشاكل إن وجدت
3. تقديم اقتراحات للتحسين
4. شرح المفاهيم المهمة
5. تقديم حل محسن إذا لزم الأمر

يرجى تقديم المساعدة بصيغة JSON:
{
  "analysis": "تحليل الكود",
  "issues": ["مشكلة 1", "مشكلة 2"],
  "suggestions": ["اقتراح 1", "اقتراح 2"],
  "explanation": "شرح المفاهيم",
  "improvedCode": "الكود المحسن",
  "tips": ["نصيحة 1", "نصيحة 2"]
}

استخدم اللغة ${language === 'ar' ? 'العربية' : 'الإنجليزية'} في جميع النصوص.
`;

    return await this.sendRequest(prompt, 'coding', {
      maxTokens: 3000,
      temperature: 0.4
    });
  }

  /**
   * تحليل محتوى المحاضرة بطريقة متقدمة
   */
  async analyzeLectureContent(content, fileMetadata = {}, options = {}) {
    const { language = 'ar', maxKeywords = 15 } = options;

    // تحضير معلومات الملف
    const fileInfo = fileMetadata.structure ?
      `\n\n📊 **معلومات الملف:**
- عدد الكلمات: ${fileMetadata.wordCount || 0}
- عدد الجمل: ${fileMetadata.sentenceCount || 0}
- عدد الفقرات: ${fileMetadata.paragraphCount || 0}
- اللغة المكتشفة: ${fileMetadata.detectedLanguage || 'غير محدد'}
- مستوى التعقيد: ${fileMetadata.complexity || 'متوسط'}
- وقت القراءة المقدر: ${fileMetadata.readingTime || 0} دقيقة
- العناوين: ${fileMetadata.structure.headings?.length || 0}
- القوائم: ${fileMetadata.structure.lists?.length || 0}
- الجداول: ${fileMetadata.structure.tables?.length || 0}` : '';

    const prompt = `
أنت خبير تحليل المحتوى التعليمي والأكاديمي. قم بتحليل النص التالي بطريقة شاملة ومتقدمة:

📖 **النص المراد تحليله:**
"${content.substring(0, 3000)}${content.length > 3000 ? '...' : ''}"
${fileInfo}

🎯 **التحليل المطلوب:**

1. **الكلمات المفتاحية** (${maxKeywords} كلمة):
   - استخرج أهم المصطلحات والمفاهيم
   - حدد تكرار كل كلمة وأهميتها
   - ركز على المصطلحات التقنية والأكاديمية

2. **الملخص الذكي**:
   - ملخص مختصر (3-4 جمل)
   - النقاط الرئيسية (5-7 نقاط)
   - الأهداف التعليمية المستنتجة

3. **التصنيف والتحليل**:
   - الموضوع الرئيسي والفرعي
   - المجال الأكاديمي (علوم، رياضيات، أدب، إلخ)
   - مستوى الصعوبة (مبتدئ/متوسط/متقدم)
   - الجمهور المستهدف

4. **البنية والتنظيم**:
   - نوع المحتوى (محاضرة، مقال، كتاب، إلخ)
   - جودة التنظيم (ممتاز/جيد/يحتاج تحسين)
   - وجود أمثلة وتطبيقات عملية

5. **التوصيات التعليمية**:
   - طرق تدريس مناسبة
   - أنشطة تعليمية مقترحة
   - مواد مساعدة موصى بها

يرجى تقديم النتيجة بصيغة JSON منظمة:
{
  "keywords": [
    {
      "word": "الكلمة",
      "frequency": 5,
      "importance": "high/medium/low",
      "category": "technical/general/academic"
    }
  ],
  "summary": {
    "brief": "الملخص المختصر",
    "keyPoints": ["النقطة الأولى", "النقطة الثانية"],
    "learningObjectives": ["الهدف الأول", "الهدف الثاني"]
  },
  "classification": {
    "mainTopic": "الموضوع الرئيسي",
    "subTopics": ["موضوع فرعي 1", "موضوع فرعي 2"],
    "academicField": "المجال الأكاديمي",
    "difficulty": "beginner/intermediate/advanced",
    "targetAudience": "الجمهور المستهدف"
  },
  "structure": {
    "contentType": "نوع المحتوى",
    "organizationQuality": "excellent/good/needs_improvement",
    "hasExamples": true/false,
    "hasPracticalApplications": true/false
  },
  "recommendations": {
    "teachingMethods": ["طريقة 1", "طريقة 2"],
    "activities": ["نشاط 1", "نشاط 2"],
    "supplementaryMaterials": ["مادة 1", "مادة 2"]
  },
  "language": "ar/en/mixed",
  "confidence": 0.95
}

استخدم اللغة ${language === 'ar' ? 'العربية' : 'الإنجليزية'} في جميع النصوص.
`;

    return await this.sendRequest(prompt, 'analysis', {
      maxTokens: 2500,
      temperature: 0.2
    });
  }

  /**
   * استخراج الكلمات المفتاحية والملخص من النص (للتوافق مع الكود القديم)
   */
  async extractKeywordsAndSummary(text, options = {}) {
    const { language = 'ar', maxKeywords = 10 } = options;

    const prompt = `
قم بتحليل النص التالي واستخراج الكلمات المفتاحية وإنشاء ملخص.

النص:
${text}

المطلوب:
1. استخراج أهم ${maxKeywords} كلمات مفتاحية
2. إنشاء ملخص مختصر (2-3 جمل)
3. تحديد الموضوع الرئيسي
4. تقدير مستوى الصعوبة

يرجى تقديم النتيجة بصيغة JSON:
{
  "keywords": [
    {
      "word": "الكلمة",
      "frequency": 5,
      "importance": "high/medium/low"
    }
  ],
  "summary": "الملخص المختصر",
  "mainTopic": "الموضوع الرئيسي",
  "difficulty": "easy/medium/hard",
  "language": "ar/en/mixed"
}

استخدم اللغة ${language === 'ar' ? 'العربية' : 'الإنجليزية'} في النصوص.
`;

    return await this.sendRequest(prompt, 'analysis', {
      maxTokens: 1500,
      temperature: 0.3
    });
  }

  /**
   * شرح محتوى المحاضرة بطريقة تفاعلية وذكية
   */
  async explainLectureContent(content, analysisData = {}, userQuestion = '', options = {}) {
    const { language = 'ar', difficulty = 'intermediate', focusArea = 'general' } = options;

    // تحضير معلومات التحليل
    const analysisInfo = analysisData.classification ?
      `\n\n📊 **معلومات التحليل:**
- الموضوع الرئيسي: ${analysisData.classification.mainTopic || 'غير محدد'}
- المجال الأكاديمي: ${analysisData.classification.academicField || 'غير محدد'}
- مستوى الصعوبة: ${analysisData.classification.difficulty || 'متوسط'}
- الجمهور المستهدف: ${analysisData.classification.targetAudience || 'عام'}
- الكلمات المفتاحية: ${analysisData.keywords?.slice(0, 5).map(k => k.word).join(', ') || 'غير متوفر'}` : '';

    const questionContext = userQuestion ?
      `\n\n❓ **سؤال المستخدم:** ${userQuestion}` : '';

    const prompt = language === 'ar' ?
      `أنت مدرس خبير ومتخصص في شرح المحتوى التعليمي. قم بشرح المحتوى التالي بطريقة واضحة ومفهومة:

📖 **المحتوى المراد شرحه:**
"${content.substring(0, 2500)}${content.length > 2500 ? '...' : ''}"
${analysisInfo}
${questionContext}

🎯 **أسلوب الشرح المطلوب:**

1. **مقدمة تمهيدية**:
   - اربط الموضوع بالحياة العملية
   - وضح أهمية هذا المحتوى
   - حدد الأهداف التعليمية

2. **الشرح التفصيلي**:
   - اشرح المفاهيم خطوة بخطوة
   - استخدم أمثلة واقعية ومألوفة
   - اربط المعلومات الجديدة بالمعرفة السابقة
   - وضح العلاقات بين المفاهيم المختلفة

3. **التطبيق العملي**:
   - قدم أمثلة تطبيقية
   - اقترح تمارين وأنشطة
   - اربط النظرية بالممارسة

4. **التلخيص والمراجعة**:
   - لخص النقاط الرئيسية
   - أكد على المفاهيم المهمة
   - قدم نصائح للمراجعة والحفظ

5. **أسئلة للتفكير**:
   - اطرح أسئلة تحفز التفكير النقدي
   - اقترح مواضيع للبحث الإضافي

**مستوى الشرح**: ${difficulty === 'beginner' ? 'مبسط للمبتدئين' : difficulty === 'intermediate' ? 'متوسط' : 'متقدم للخبراء'}

**إرشادات مهمة:**
- استخدم لغة واضحة ومناسبة للمستوى
- أضف الرموز التعبيرية لجعل الشرح أكثر حيوية
- نظم المحتوى بعناوين وفقرات واضحة
- اجعل الشرح تفاعلياً وممتعاً
- ركز على الفهم وليس الحفظ` :

      `You are an expert teacher specialized in explaining educational content. Explain the following content clearly and comprehensively:

📖 **Content to Explain:**
"${content.substring(0, 2500)}${content.length > 2500 ? '...' : ''}"
${analysisInfo}
${questionContext}

🎯 **Required Explanation Style:**

1. **Introduction**:
   - Connect the topic to real life
   - Explain the importance of this content
   - Define learning objectives

2. **Detailed Explanation**:
   - Explain concepts step by step
   - Use real and familiar examples
   - Connect new information to prior knowledge
   - Clarify relationships between different concepts

3. **Practical Application**:
   - Provide practical examples
   - Suggest exercises and activities
   - Connect theory to practice

4. **Summary and Review**:
   - Summarize key points
   - Emphasize important concepts
   - Provide tips for review and memorization

5. **Thinking Questions**:
   - Ask questions that stimulate critical thinking
   - Suggest topics for additional research

**Explanation Level**: ${difficulty}

**Important Guidelines:**
- Use clear language appropriate for the level
- Add emojis to make the explanation more lively
- Organize content with clear headings and paragraphs
- Make the explanation interactive and engaging
- Focus on understanding rather than memorization`;

    return await this.sendRequest(prompt, 'text', {
      maxTokens: 2000,
      temperature: 0.6
    });
  }

  /**
   * مساعدة في سؤال
   */
  async helpWithQuestion(question, options = {}) {
    const { language = 'ar' } = options;

    const prompt = language === 'ar' ?
      `أجب على السؤال التالي بشكل مفصل ومفيد:\n\n${question}\n\nقدم إجابة شاملة مع أمثلة إذا أمكن.` :
      `Answer the following question in detail and helpfully:\n\n${question}\n\nProvide a comprehensive answer with examples if possible.`;

    return this.sendRequest(prompt, 'text', {
      temperature: 0.7,
      maxTokens: 1000
    });
  }

  /**
   * مساعد المحاضرات المتخصص في علوم الحاسوب
   */
  async lecturesAssistant(userMessage, conversationHistory = [], options = {}) {
    const { language = 'ar', topic = null, difficulty = 'intermediate' } = options;

    // بناء السياق المتخصص والذكي
    const systemPrompt = language === 'ar' ?
      `أنت مساعد ذكي ومتطور، متخصص في علوم الحاسوب والبرمجة، ولكنك أيضاً قادر على فهم والرد على أي موضوع يطرحه المستخدم.

🎯 **تخصصك الرئيسي - علوم الحاسوب:**
🔹 **لغات البرمجة**: JavaScript, Python, Java, C++, C#, Go, Rust, PHP, وغيرها
🔹 **هياكل البيانات والخوارزميات**: Arrays, Linked Lists, Trees, Graphs, Sorting, Searching
🔹 **قواعد البيانات**: SQL, NoSQL, MongoDB, PostgreSQL, MySQL
🔹 **تطوير الويب**: Frontend (React, Vue, Angular), Backend (Node.js, Express, Django)
🔹 **الذكاء الاصطناعي**: Machine Learning, Deep Learning, Neural Networks
🔹 **أمن المعلومات**: Cybersecurity, Encryption, Authentication
🔹 **الشبكات**: TCP/IP, HTTP/HTTPS, APIs, Microservices
🔹 **أنظمة التشغيل**: Linux, Windows, Memory Management, Processes
🔹 **هندسة البرمجيات**: Design Patterns, SOLID Principles, Testing
🔹 **الحوسبة السحابية**: AWS, Azure, Docker, Kubernetes

🧠 **قدراتك العامة:**
- فهم وتحليل أي نص أو سؤال
- الرد على الأسئلة العامة والشخصية
- تقديم المساعدة في مواضيع متنوعة
- فهم السياق والمشاعر
- التفاعل بطريقة طبيعية ودودة
- تقديم النصائح والإرشادات
- حل المشاكل والتفكير النقدي

**أسلوبك في التفاعل:**
- اقرأ الرسالة بعناية وافهم المقصود
- إذا كان السؤال عن علوم الحاسوب، قدم إجابة متخصصة ومفصلة
- إذا كان السؤال عاماً، أجب بطريقة مفيدة وودودة
- استخدم أمثلة عملية وواقعية
- اربط المواضيع ببعضها عند الإمكان
- استخدم الرموز التعبيرية لجعل الحديث أكثر حيوية
- كن مفيداً ومتفهماً ومشجعاً
- اطرح أسئلة متابعة عند الحاجة

**مستوى الصعوبة الحالي**: ${difficulty === 'beginner' ? 'مبتدئ' : difficulty === 'intermediate' ? 'متوسط' : 'متقدم'}

**مبدأك الأساسي**: افهم ما يريده المستخدم حقاً وقدم أفضل مساعدة ممكنة، سواء كان في علوم الحاسوب أو أي موضوع آخر!` :

      `You are an intelligent and advanced assistant, specialized in Computer Science and Programming, but also capable of understanding and responding to any topic the user brings up.

🎯 **Your Main Specialization - Computer Science:**
🔹 **Programming Languages**: JavaScript, Python, Java, C++, C#, Go, Rust, PHP, and more
🔹 **Data Structures & Algorithms**: Arrays, Linked Lists, Trees, Graphs, Sorting, Searching
🔹 **Databases**: SQL, NoSQL, MongoDB, PostgreSQL, MySQL
🔹 **Web Development**: Frontend (React, Vue, Angular), Backend (Node.js, Express, Django)
🔹 **Artificial Intelligence**: Machine Learning, Deep Learning, Neural Networks
🔹 **Information Security**: Cybersecurity, Encryption, Authentication
🔹 **Networks**: TCP/IP, HTTP/HTTPS, APIs, Microservices
🔹 **Operating Systems**: Linux, Windows, Memory Management, Processes
🔹 **Software Engineering**: Design Patterns, SOLID Principles, Testing
🔹 **Cloud Computing**: AWS, Azure, Docker, Kubernetes

🧠 **Your General Capabilities:**
- Understanding and analyzing any text or question
- Responding to general and personal questions
- Providing help on various topics
- Understanding context and emotions
- Interacting naturally and friendly
- Offering advice and guidance
- Problem-solving and critical thinking

**Your Interaction Style:**
- Read messages carefully and understand the intent
- If it's about Computer Science, provide specialized and detailed answers
- If it's a general question, respond helpfully and friendly
- Use practical and real-world examples
- Connect topics when possible
- Use emojis to make conversations more lively
- Be helpful, understanding, and encouraging
- Ask follow-up questions when needed

**Current Difficulty Level**: ${difficulty}

**Your Core Principle**: Understand what the user really wants and provide the best possible help, whether in Computer Science or any other topic!`;

    // بناء تاريخ المحادثة
    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationContext = '\n\n**Previous Conversation:**\n';
      conversationHistory.slice(-6).forEach(msg => {
        const role = msg.type === 'user' ? (language === 'ar' ? 'الطالب' : 'Student') : (language === 'ar' ? 'المساعد' : 'Assistant');
        conversationContext += `${role}: ${msg.content}\n`;
      });
    }

    // إضافة سياق الموضوع إذا كان محدداً
    const topicContext = topic ?
      (language === 'ar' ? `\n\n**الموضوع الحالي**: ${topic}` : `\n\n**Current Topic**: ${topic}`) : '';

    const fullPrompt = `${systemPrompt}${conversationContext}${topicContext}\n\n${language === 'ar' ? 'الطالب' : 'Student'}: ${userMessage}\n\n${language === 'ar' ? 'المساعد' : 'Assistant'}:`;

    return this.sendRequest(fullPrompt, 'chat', {
      temperature: 0.7,
      maxTokens: 1500
    });
  }

  /**
   * تحليل نوع الرسالة وتحديد الاستجابة المناسبة
   */
  analyzeMessageType(message, language = 'ar') {
    const lowerMessage = message.toLowerCase();

    // كلمات مفتاحية لعلوم الحاسوب
    const csKeywords = {
      ar: [
        'برمجة', 'كود', 'خوارزمية', 'بيانات', 'قاعدة', 'موقع', 'تطبيق', 'جافا', 'بايثون',
        'جافاسكريبت', 'سي بلس', 'ذكاء اصطناعي', 'شبكة', 'أمان', 'تشفير', 'سيرفر',
        'فرونت اند', 'باك اند', 'ريأكت', 'نود', 'مونجو', 'اس كيو ال', 'أبي آي',
        'خطأ', 'باغ', 'ديباغ', 'تست', 'فنكشن', 'كلاس', 'أوبجكت', 'أراي', 'لوب',
        'كونديشن', 'متغير', 'ثابت', 'مكتبة', 'فريم ورك', 'لينكس', 'ويندوز'
      ],
      en: [
        'programming', 'code', 'algorithm', 'data', 'database', 'website', 'app', 'java', 'python',
        'javascript', 'c++', 'artificial intelligence', 'ai', 'network', 'security', 'encryption', 'server',
        'frontend', 'backend', 'react', 'node', 'mongo', 'sql', 'api',
        'error', 'bug', 'debug', 'test', 'function', 'class', 'object', 'array', 'loop',
        'condition', 'variable', 'constant', 'library', 'framework', 'linux', 'windows'
      ]
    };

    // كلمات مفتاحية للأسئلة العامة
    const generalKeywords = {
      ar: [
        'مرحبا', 'أهلا', 'السلام', 'صباح', 'مساء', 'كيف حالك', 'شكرا', 'عفوا',
        'نصيحة', 'رأي', 'اقتراح', 'مساعدة', 'أريد', 'أحتاج', 'ممكن', 'هل',
        'ماذا', 'كيف', 'متى', 'أين', 'لماذا', 'من', 'ما رأيك', 'تنصحني'
      ],
      en: [
        'hello', 'hi', 'hey', 'good morning', 'good evening', 'how are you', 'thanks', 'sorry',
        'advice', 'opinion', 'suggestion', 'help', 'want', 'need', 'can', 'could',
        'what', 'how', 'when', 'where', 'why', 'who', 'what do you think', 'recommend'
      ]
    };

    const keywords = csKeywords[language] || csKeywords.en;
    const generalWords = generalKeywords[language] || generalKeywords.en;

    // تحقق من وجود كلمات علوم الحاسوب
    const hasCSKeywords = keywords.some(keyword => lowerMessage.includes(keyword));

    // تحقق من وجود كلمات عامة
    const hasGeneralKeywords = generalWords.some(keyword => lowerMessage.includes(keyword));

    // تحديد نوع الرسالة
    if (hasCSKeywords) {
      return 'computer_science';
    } else if (hasGeneralKeywords || message.length < 50) {
      return 'general_conversation';
    } else {
      return 'mixed'; // قد تحتوي على كلاهما أو غير واضحة
    }
  }

  /**
   * مساعد المحاضرات المحسن مع تحليل ذكي
   */
  async smartLecturesAssistant(userMessage, conversationHistory = [], options = {}) {
    const { language = 'ar', topic = null, difficulty = 'intermediate' } = options;


    // تحليل نوع الرسالة
    const messageType = this.analyzeMessageType(userMessage, language);

    // تخصيص الاستجابة حسب نوع الرسالة
    let enhancedPrompt = '';
    let responseGuidance = '';

    if (messageType === 'computer_science') {
      enhancedPrompt = language === 'ar' ?
        `\n\n🎯 **سؤال متخصص في علوم الحاسوب**` :
        `\n\n🎯 **Computer Science Specialized Question**`;

      responseGuidance = language === 'ar' ?
        `\n\n**إرشادات الإجابة:**
- قدم إجابة تفصيلية ومتخصصة
- استخدم أمثلة برمجية إذا كان مناسباً
- اشرح المفاهيم خطوة بخطوة
- اربط الموضوع بمفاهيم أخرى ذات صلة
- قدم نصائح وأفضل الممارسات` :
        `\n\n**Response Guidelines:**
- Provide detailed and specialized answer
- Use code examples if appropriate
- Explain concepts step by step
- Connect topic to related concepts
- Offer tips and best practices`;

    } else if (messageType === 'general_conversation') {
      enhancedPrompt = language === 'ar' ?
        `\n\n💬 **محادثة عامة**` :
        `\n\n💬 **General Conversation**`;

      responseGuidance = language === 'ar' ?
        `\n\n**إرشادات الإجابة:**
- رد بطريقة ودودة ومفيدة
- كن متفهماً ومشجعاً
- إذا أمكن، اربط الموضوع بعلوم الحاسوب بطريقة طبيعية
- اطرح أسئلة متابعة إذا كان مناسباً
- قدم نصائح عملية ومفيدة` :
        `\n\n**Response Guidelines:**
- Respond in a friendly and helpful way
- Be understanding and encouraging
- If possible, naturally connect topic to Computer Science
- Ask follow-up questions if appropriate
- Provide practical and useful advice`;

    } else {
      enhancedPrompt = language === 'ar' ?
        `\n\n🤔 **سؤال مختلط أو معقد**` :
        `\n\n🤔 **Mixed or Complex Question**`;

      responseGuidance = language === 'ar' ?
        `\n\n**إرشادات الإجابة:**
- حلل السؤال بعناية
- قدم إجابة شاملة تغطي جميع الجوانب
- اجمع بين المعلومات التقنية والعامة حسب الحاجة
- كن واضحاً ومفيداً` :
        `\n\n**Response Guidelines:**
- Analyze the question carefully
- Provide comprehensive answer covering all aspects
- Combine technical and general information as needed
- Be clear and helpful`;
    }

    // استخدام المساعد الأصلي مع التحسين والإرشادات
    return this.lecturesAssistant(userMessage + enhancedPrompt + responseGuidance, conversationHistory, {
      language,
      topic,
      difficulty
    });
  }

  /**
   * شرح مفهوم متقدم
   */
  async explainConcept(concept, options = {}) {
    const { language = 'ar', includeCode = true, difficulty = 'intermediate' } = options;

    const prompt = language === 'ar' ?
      `اشرح مفهوم "${concept}" في علوم الحاسوب بطريقة ${difficulty === 'beginner' ? 'مبسطة للمبتدئين' : difficulty === 'intermediate' ? 'متوسطة' : 'متقدمة للخبراء'}:

🎯 **المطلوب:**
1. تعريف واضح للمفهوم
2. أهمية المفهوم في علوم الحاسوب
3. أمثلة عملية وتطبيقات واقعية
${includeCode ? '4. أمثلة برمجية (كود) إذا كان مناسباً' : ''}
5. ربط المفهوم بمفاهيم أخرى ذات صلة
6. نصائح وأفضل الممارسات

استخدم الرموز التعبيرية والتنسيق لجعل الشرح واضحاً وممتعاً.` :

      `Explain the concept of "${concept}" in Computer Science in a ${difficulty} way:

🎯 **Required:**
1. Clear definition of the concept
2. Importance in Computer Science
3. Practical examples and real-world applications
${includeCode ? '4. Code examples if appropriate' : ''}
5. Connection to other related concepts
6. Tips and best practices

Use emojis and formatting to make the explanation clear and engaging.`;

    return this.sendRequest(prompt, 'text', {
      temperature: 0.6,
      maxTokens: 1200
    });
  }

  /**
   * تحليل وشرح الكود
   */
  async analyzeCode(code, language, options = {}) {
    const { analysisType = 'explain', userLanguage = 'ar' } = options;

    const prompts = {
      ar: {
        explain: `حلل واشرح الكود التالي المكتوب بلغة ${language}:

\`\`\`${language}
${code}
\`\`\`

🔍 **المطلوب:**
1. شرح ما يفعله الكود خطوة بخطوة
2. تحديد المفاهيم البرمجية المستخدمة
3. تقييم جودة الكود وأدائه
4. اقتراح تحسينات إذا كان ممكناً
5. شرح أي مشاكل محتملة

استخدم تنسيقاً واضحاً مع الرموز التعبيرية.`,

        optimize: `حسن الكود التالي وقدم نسخة محسنة:

\`\`\`${language}
${code}
\`\`\`

🚀 **المطلوب:**
1. نسخة محسنة من الكود
2. شرح التحسينات المطبقة
3. مقارنة الأداء قبل وبعد
4. أفضل الممارسات المطبقة`,

        debug: `ابحث عن الأخطاء في الكود التالي وصححها:

\`\`\`${language}
${code}
\`\`\`

🐛 **المطلوب:**
1. تحديد الأخطاء الموجودة
2. شرح سبب كل خطأ
3. تقديم الكود المصحح
4. نصائح لتجنب هذه الأخطاء مستقبلاً`
      },
      en: {
        explain: `Analyze and explain the following ${language} code:

\`\`\`${language}
${code}
\`\`\`

🔍 **Required:**
1. Step-by-step explanation of what the code does
2. Identify programming concepts used
3. Evaluate code quality and performance
4. Suggest improvements if possible
5. Explain any potential issues

Use clear formatting with emojis.`,

        optimize: `Optimize the following code and provide an improved version:

\`\`\`${language}
${code}
\`\`\`

🚀 **Required:**
1. Optimized version of the code
2. Explanation of applied improvements
3. Performance comparison before and after
4. Best practices applied`,

        debug: `Find and fix errors in the following code:

\`\`\`${language}
${code}
\`\`\`

🐛 **Required:**
1. Identify existing errors
2. Explain the cause of each error
3. Provide corrected code
4. Tips to avoid these errors in the future`
      }
    };

    const prompt = prompts[userLanguage][analysisType];

    return this.sendRequest(prompt, 'text', {
      temperature: 0.5,
      maxTokens: 1200
    });
  }

  /**
   * توليد أمثلة برمجية
   */
  async generateCodeExample(topic, programmingLanguage, options = {}) {
    const { difficulty = 'intermediate', userLanguage = 'ar', includeComments = true } = options;

    const prompt = userLanguage === 'ar' ?
      `اكتب مثال برمجي عملي عن "${topic}" باستخدام لغة ${programmingLanguage}:

📝 **المتطلبات:**
- مستوى الصعوبة: ${difficulty === 'beginner' ? 'مبتدئ' : difficulty === 'intermediate' ? 'متوسط' : 'متقدم'}
- ${includeComments ? 'أضف تعليقات توضيحية مفصلة' : 'بدون تعليقات'}
- اجعل الكود عملياً وقابلاً للتشغيل
- اشرح الكود بعد كتابته
- قدم نصائح لتطوير المثال أكثر

🎯 **الهدف**: مساعدة الطالب على فهم ${topic} عملياً` :

      `Write a practical code example about "${topic}" using ${programmingLanguage}:

📝 **Requirements:**
- Difficulty level: ${difficulty}
- ${includeComments ? 'Add detailed explanatory comments' : 'No comments'}
- Make the code practical and runnable
- Explain the code after writing it
- Provide tips for further development

🎯 **Goal**: Help the student understand ${topic} practically`;

    return this.sendRequest(prompt, 'text', {
      temperature: 0.6,
      maxTokens: 1000
    });
  }

  /**
   * مقارنة التقنيات والمفاهيم
   */
  async compareConcepts(concept1, concept2, options = {}) {
    const { language = 'ar', includeExamples = true } = options;

    const prompt = language === 'ar' ?
      `قارن بين "${concept1}" و "${concept2}" في علوم الحاسوب:

⚖️ **المقارنة المطلوبة:**
1. **التعريف**: ما هو كل مفهوم؟
2. **أوجه التشابه**: ما هي النقاط المشتركة؟
3. **أوجه الاختلاف**: ما هي الفروقات الرئيسية؟
4. **الاستخدامات**: متى نستخدم كل واحد؟
5. **المزايا والعيوب**: لكل مفهوم
${includeExamples ? '6. **أمثلة عملية**: لكل مفهوم' : ''}
7. **التوصية**: أيهما أفضل في حالات معينة؟

استخدم جداول ورموز تعبيرية لتوضيح المقارنة.` :

      `Compare "${concept1}" and "${concept2}" in Computer Science:

⚖️ **Required Comparison:**
1. **Definition**: What is each concept?
2. **Similarities**: What are the common points?
3. **Differences**: What are the main differences?
4. **Use Cases**: When to use each one?
5. **Pros and Cons**: For each concept
${includeExamples ? '6. **Practical Examples**: For each concept' : ''}
7. **Recommendation**: Which is better in specific cases?

Use tables and emojis to illustrate the comparison.`;

    return this.sendRequest(prompt, 'text', {
      temperature: 0.6,
      maxTokens: 1000
    });
  }

  /**
   * محادثة عامة محسنة وذكية
   */
  async generalChat(message, options = {}) {
    const { language = 'ar', context = 'general' } = options;

    // استخدام المساعد الذكي للمحاضرات
    if (context === 'lectures') {
      return this.smartLecturesAssistant(message, [], { language });
    }

    const contextPrompts = {
      ar: {
        questions: 'أنت مساعد تعليمي متخصص في الأسئلة والاختبارات.',
        tasks: 'أنت مساعد تعليمي متخصص في المهام البرمجية.',
        reports: 'أنت مساعد تعليمي متخصص في التقارير والتحليلات.',
        analytics: 'أنت مساعد تعليمي متخصص في تحليل الأداء.',
        support: 'أنت مساعد دعم فني ودود ومفيد.',
        general: 'أنت مساعد تعليمي ذكي ومفيد.'
      },
      en: {
        questions: 'You are an educational assistant specialized in questions and tests.',
        tasks: 'You are an educational assistant specialized in programming tasks.',
        reports: 'You are an educational assistant specialized in reports and analytics.',
        analytics: 'You are an educational assistant specialized in performance analysis.',
        support: 'You are a friendly and helpful technical support assistant.',
        general: 'You are a smart and helpful educational assistant.'
      }
    };

    const contextPrompt = contextPrompts[language][context] || contextPrompts[language].general;
    const prompt = `${contextPrompt}\n\n${language === 'ar' ? 'المستخدم' : 'User'}: ${message}\n\n${language === 'ar' ? 'المساعد' : 'Assistant'}:`;

    return this.sendRequest(prompt, 'chat', {
      temperature: 0.8,
      maxTokens: 600
    });
  }

  /**
   * التحقق من صحة الاتصال
   */
  async testConnection() {
    try {
      const response = await this.sendRequest('مرحبا، هل يمكنك الرد؟', 'chat', {
        maxTokens: 50
      });

      return {
        success: response.success,
        message: response.success ? 'الاتصال يعمل بشكل صحيح' : 'فشل في الاتصال',
        details: response
      };
    } catch (error) {
      return {
        success: false,
        message: 'خطأ في اختبار الاتصال',
        error: error.message
      };
    }
  }
}

// إنشاء مثيل واحد من الخدمة
const aiService = new AIService();

module.exports = aiService;
