import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, User, Bot, Loader, Trash2, RotateCcw } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import './LecturesSimple.css';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  files?: File[];
  isLoading?: boolean;
  metadata?: any;
}

interface LecturesSimpleProps {
  user: any;
  language: 'ar' | 'en';
  isDarkMode: boolean;
  sidebarExpanded?: boolean;
}

const LecturesSimple: React.FC<LecturesSimpleProps> = ({ user, language, isDarkMode, sidebarExpanded = false }) => {
  const { state, addChatMessage, getChatMessages } = useApp();
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);
  const [fileContent, setFileContent] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef<number>(0);

  // تحميل المحادثات المحفوظة عند تحميل المكون
  useEffect(() => {
    loadSavedMessages();
    createChatSession();
  }, []);

  // التمرير للأسفل مع تحسينات لمنع الاهتزاز
  const scrollToBottom = useCallback((force = false) => {
    const now = Date.now();

    // منع التمرير المفرط - فقط كل 100ms
    if (!force && now - lastScrollTime.current < 100) {
      return;
    }

    lastScrollTime.current = now;

    if (messagesEndRef.current && messagesContainerRef.current) {
      // التحقق من أن المستخدم لم يقم بالتمرير يدوياً
      const container = messagesContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

      if (force || isNearBottom) {
        // استخدام requestAnimationFrame لتحسين الأداء ومنع الاهتزاز
        requestAnimationFrame(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({
              behavior: force ? 'auto' : 'smooth',
              block: 'end',
              inline: 'nearest'
            });
          }
        });
      }
    }
  }, []);

  // تحسين التمرير - فقط عند الحاجة الفعلية
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];

    // التمرير فقط في الحالات التالية:
    // 1. رسالة جديدة من المستخدم
    // 2. انتهاء تحميل رسالة الذكاء الاصطناعي
    // 3. أول رسالة في المحادثة
    if (messages.length === 0) return;

    if (lastMessage?.sender === 'user' ||
        (lastMessage?.sender === 'ai' && !isLoading) ||
        messages.length === 1) {
      // تأخير بسيط لضمان عرض المحتوى
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [messages.length, isLoading, scrollToBottom]);

  const loadSavedMessages = () => {
    const savedMessages = getChatMessages('lectures');
    if (savedMessages.length > 0) {
      const formattedMessages = savedMessages.map(msg => ({
        id: msg.id,
        text: msg.content,
        sender: msg.type as 'user' | 'ai',
        timestamp: new Date(msg.timestamp),
        metadata: msg.metadata
      }));
      setMessages(formattedMessages);
    } else {
      // رسالة ترحيب افتراضية
      const welcomeMessage: Message = {
        id: 'welcome_1',
        text: language === 'ar'
          ? 'مرحباً! أنا مساعدك الذكي للتعلم. كيف يمكنني مساعدتك اليوم؟'
          : 'Hello! I am your smart learning assistant. How can I help you today?',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
      addChatMessage({
        type: 'ai',
        content: welcomeMessage.text,
        section: 'lectures'
      });
    }
  };

  const createChatSession = async () => {
    // محاكاة إنشاء جلسة محادثة
    setCurrentChatId(`chat_${Date.now()}`);
  };

  const translations = {
    ar: {
      placeholder: 'اكتب رسالتك هنا...',
      send: 'إرسال',
      typing: 'يكتب...'
    },
    en: {
      placeholder: 'Type your message here...',
      send: 'Send',
      typing: 'Typing...'
    }
  };

  const t = translations[language];

  // دالة الذكاء المحلي المحسنة
  const handleLocalAI = async (userInput: string) => {
    console.log('🧠 تشغيل الذكاء المحلي للنص:', userInput);

    // محاكاة تأخير التفكير
    await new Promise(resolve => setTimeout(resolve, 1500));

    // إزالة مؤشر الكتابة
    setMessages(prev => prev.filter(msg => msg.id !== 'typing'));

    // تحليل السؤال وإنتاج رد ذكي
    const lowerInput = userInput.toLowerCase();
    const arabicInput = userInput;
    let response = '';

    console.log('🔍 تحليل النص:', { lowerInput, arabicInput });

    // ردود متخصصة في علوم الحاسوب
    if (lowerInput.includes('javascript') || lowerInput.includes('جافاسكريبت')) {
      response = language === 'ar' ?
        `🚀 **JavaScript** هي لغة برمجة قوية ومتعددة الاستخدامات!\n\n✨ **المميزات:**\n• لغة ديناميكية وسهلة التعلم\n• تعمل في المتصفح والخادم (Node.js)\n• مجتمع كبير ومكتبات متنوعة\n\n💡 **الاستخدامات:**\n• تطوير المواقع التفاعلية\n• تطبيقات الهاتف المحمول\n• تطبيقات سطح المكتب\n\nهل تريد معرفة المزيد عن موضوع معين في JavaScript؟` :
        `🚀 **JavaScript** is a powerful and versatile programming language!\n\n✨ **Features:**\n• Dynamic and easy to learn\n• Works in browser and server (Node.js)\n• Large community and diverse libraries\n\n💡 **Uses:**\n• Interactive web development\n• Mobile applications\n• Desktop applications\n\nWould you like to know more about a specific JavaScript topic?`;
    } else if (lowerInput.includes('python') || lowerInput.includes('بايثون')) {
      response = language === 'ar' ?
        `🐍 **Python** لغة برمجة رائعة للمبتدئين والخبراء!\n\n🌟 **لماذا Python؟**\n• بساطة في الكتابة والقراءة\n• مكتبات قوية للذكاء الاصطناعي\n• مجتمع داعم ومتنوع\n\n🔥 **المجالات:**\n• تطوير الويب (Django, Flask)\n• الذكاء الاصطناعي والتعلم الآلي\n• تحليل البيانات\n• الأتمتة والسكريبتات\n\nما الذي تريد تعلمه في Python؟` :
        `🐍 **Python** is an excellent programming language for beginners and experts!\n\n🌟 **Why Python?**\n• Simple to write and read\n• Powerful AI libraries\n• Supportive and diverse community\n\n🔥 **Fields:**\n• Web development (Django, Flask)\n• AI and Machine Learning\n• Data analysis\n• Automation and scripting\n\nWhat would you like to learn in Python?`;
    } else if (lowerInput.includes('مرحبا') || lowerInput.includes('hello') || lowerInput.includes('hi')) {
      response = language === 'ar' ?
        `👋 مرحباً بك! أنا مساعدك الذكي المتخصص في علوم الحاسوب!\n\n🎯 **يمكنني مساعدتك في:**\n• شرح مفاهيم البرمجة\n• حل المشاكل التقنية\n• تعلم لغات البرمجة\n• فهم الخوارزميات\n• تطوير المشاريع\n\n💡 جرب أن تسألني عن أي موضوع في علوم الحاسوب!` :
        `👋 Welcome! I'm your AI assistant specialized in Computer Science!\n\n🎯 **I can help you with:**\n• Explaining programming concepts\n• Solving technical problems\n• Learning programming languages\n• Understanding algorithms\n• Developing projects\n\n💡 Try asking me about any Computer Science topic!`;
    } else if (lowerInput.includes('خوارزمية') || lowerInput.includes('algorithm')) {
      response = language === 'ar' ?
        `🧮 **الخوارزميات** هي قلب علوم الحاسوب!\n\n📚 **التعريف:**\nمجموعة من الخطوات المنطقية لحل مشكلة معينة\n\n🔍 **أنواع مهمة:**\n• خوارزميات الترتيب (Sorting)\n• خوارزميات البحث (Searching)\n• خوارزميات الرسوم البيانية (Graph)\n• البرمجة الديناميكية (Dynamic Programming)\n\n⚡ **لماذا مهمة؟**\n• تحسين الأداء\n• حل المشاكل المعقدة\n• أساس التفكير البرمجي\n\nأي نوع من الخوارزميات تريد أن نتعمق فيه؟` :
        `🧮 **Algorithms** are the heart of Computer Science!\n\n📚 **Definition:**\nA set of logical steps to solve a specific problem\n\n🔍 **Important types:**\n• Sorting algorithms\n• Searching algorithms\n• Graph algorithms\n• Dynamic Programming\n\n⚡ **Why important?**\n• Performance optimization\n• Solving complex problems\n• Foundation of programming thinking\n\nWhich type of algorithm would you like to dive into?`;
    } else {
      // رد عام ذكي
      response = language === 'ar' ?
        `🤔 سؤال مثير للاهتمام! كمساعد متخصص في علوم الحاسوب، دعني أساعدك.\n\n💭 **بناءً على رسالتك:**\n"${userInput}"\n\n🎯 **يمكنني تقديم:**\n• شرح مفصل للمفاهيم\n• أمثلة عملية وكود\n• نصائح وأفضل الممارسات\n• ربط الموضوع بمجالات أخرى\n\n💡 **نصيحة:** كن أكثر تحديداً في سؤالك لأحصل على إجابة أفضل!\n\nمثال: "اشرح لي مفهوم البرمجة الكائنية" أو "كيف أتعلم React؟"` :
        `🤔 Interesting question! As a Computer Science specialist, let me help you.\n\n💭 **Based on your message:**\n"${userInput}"\n\n🎯 **I can provide:**\n• Detailed concept explanations\n• Practical examples and code\n• Tips and best practices\n• Connect topic to other fields\n\n💡 **Tip:** Be more specific in your question for better answers!\n\nExample: "Explain Object-Oriented Programming" or "How do I learn React?"`;
    }

    const aiMessage: Message = {
      id: `ai_${Date.now()}`,
      text: response,
      sender: 'ai',
      timestamp: new Date(),
      metadata: { local: true, intelligent: true }
    };

    setMessages(prev => [...prev, aiMessage]);
  };

  // التمرير التلقائي عند إضافة رسائل جديدة
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    }
  }, [messages]);



  // تحميل المحادثة المحفوظة عند بدء التشغيل - مربوطة بالمستخدم
  useEffect(() => {
    if (!user?.id) {
      addWelcomeMessage();
      return;
    }

    const userStorageKey = `lectures_messages_${user.id}`;
    const userChatIdKey = `lectures_chatId_${user.id}`;

    const savedMessages = localStorage.getItem(userStorageKey);
    const savedChatId = localStorage.getItem(userChatIdKey);

    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        // تحويل timestamp من string إلى Date
        const messagesWithDates = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(messagesWithDates);
        console.log('✅ تم تحميل المحادثة المحفوظة للمستخدم:', user.id, '- عدد الرسائل:', messagesWithDates.length);
      } catch (error) {
        console.error('خطأ في تحميل المحادثة:', error);
        // إضافة رسالة ترحيب في حالة الخطأ
        addWelcomeMessage();
      }
    } else {
      // إضافة رسالة ترحيب للمستخدمين الجدد
      addWelcomeMessage();
    }

    if (savedChatId) {
      setCurrentChatId(savedChatId);
    }
  }, [user?.id]);

  // دالة إضافة رسالة الترحيب
  const addWelcomeMessage = () => {
    const welcomeMessage: Message = {
      id: `welcome_${Date.now()}`,
      text: language === 'ar' ?
        `👋 أهلاً وسهلاً بك! أنا مساعدك الذكي، وأتشرف بخدمتك في جميع المجالات.

🌟 **أستطيع مساعدتك في:**
• علوم الحاسوب والبرمجة والتكنولوجيا
• العلوم الطبيعية والرياضيات والطب
• التاريخ والأدب والفلسفة
• الاقتصاد والإدارة وريادة الأعمال
• الفنون والموسيقى والثقافة
• وأي موضوع تريد معرفة المزيد عنه!

📎 **يمكنك أيضاً رفع ملفات** (PDF, Word, TXT) وسأقوم بشرحها وتحليلها لك بالتفصيل!

💬 **اطرح سؤالك بحرية** وسأبذل قصارى جهدي لأقدم لك إجابة مفيدة وواضحة باللغة العربية الجميلة.` :

        `👋 Hello! I'm your intelligent assistant specialized in all fields.

🎯 **I can help you with:**
• Computer Science and Programming
• Sciences and Mathematics
• History and Literature
• Business and Economics
• Arts and Culture
• And any other topic!

📎 **You can also upload files** (PDF, Word, TXT) and I'll explain and analyze them in detail!

💡 Write your question and I'll answer it accurately and clearly.`,
      sender: 'ai',
      timestamp: new Date(),
      metadata: { welcome: true }
    };

    setMessages([welcomeMessage]);
  };

  // حفظ المحادثة عند تغيير الرسائل - مربوطة بالمستخدم
  useEffect(() => {
    if (messages.length > 0 && user?.id) {
      const userStorageKey = `lectures_messages_${user.id}`;
      localStorage.setItem(userStorageKey, JSON.stringify(messages));
      console.log('💾 تم حفظ المحادثة للمستخدم:', user.id);
    }
  }, [messages, user?.id]);

  // حفظ معرف المحادثة - مربوط بالمستخدم
  useEffect(() => {
    if (currentChatId && user?.id) {
      const userChatIdKey = `lectures_chatId_${user.id}`;
      localStorage.setItem(userChatIdKey, currentChatId);
    }
  }, [currentChatId, user?.id]);

  // تم إزالة تتبع الـ Sidebar - سيتم التحكم من Layout الرئيسي

  const handleSend = async () => {
    if (!inputText.trim() && selectedFiles.length === 0) return;
    if (isLoading) return;

    console.log('🚀 بدء إرسال الرسالة:', inputText.trim());

    const userMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
      files: selectedFiles.length > 0 ? [...selectedFiles] : undefined
    };

    // إضافة رسالة المستخدم
    setMessages(prev => [...prev, userMessage]);
    addChatMessage({
      type: 'user',
      content: userMessage.text,
      section: 'lectures',
      metadata: {
        filesCount: selectedFiles.length,
        fileNames: selectedFiles.map(f => f.name)
      }
    });

    setInputText('');
    setSelectedFiles([]);
    setFileContent('');
    setIsLoading(true);

    // إضافة مؤشر التحميل المحسن والسريع
    const loadingMessages = language === 'ar' ? [
      '🤔 دعني أفكر في هذا...',
      '🧠 أحلل سؤالك بعناية...',
      '⚡ أعد لك إجابة مفيدة...',
      '🔍 أبحث في معرفتي...',
      '💭 أصيغ الرد المناسب...',
      '🎯 أركز على التفاصيل المهمة...',
      '📚 أراجع المعلومات...',
      '✨ أحضر لك الإجابة...',
      '🚀 تقريباً انتهيت من التحضير...'
    ] : [
      '🤔 Thinking...',
      '🧠 Analyzing...',
      '⚡ Preparing...',
      '🔍 Searching...',
      '💭 Formulating...',
      '🎯 Focusing...',
      '📚 Reviewing...',
      '✨ Getting answer...',
      '🚀 Almost done...'
    ];

    const randomLoadingMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];

    const typingMessage: Message = {
      id: 'typing',
      text: randomLoadingMessage,
      sender: 'ai',
      timestamp: new Date(),
      isLoading: true
    };
    setMessages(prev => [...prev, typingMessage]);

    // تحديث رسالة التحميل كل 2 ثانية
    const loadingInterval = setInterval(() => {
      const newLoadingMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
      setMessages(prev => prev.map(msg =>
        msg.id === 'typing'
          ? { ...msg, text: newLoadingMessage }
          : msg
      ));
    }, 2000);

    try {
      console.log('🤖 استخدام OpenRouter مباشرة...');

      // إزالة مؤشر الكتابة وتنظيف الـ interval
      clearInterval(loadingInterval);
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'));

      // استدعاء OpenRouter مباشرة
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer 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',
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'AI-Educational-Platform'
        },
        body: JSON.stringify({
          model: language === 'ar' ? 'meta-llama/llama-3.1-8b-instruct:free' : 'google/gemma-2-9b-it:free',
          messages: [
            {
              role: 'system',
              content: language === 'ar' ?
                `أنت مساعد ذكي متخصص في جميع المجالات، وتتحدث العربية بطلاقة وطبيعية.

🎯 **مهمتك:**
أن تكون مساعداً مفيداً ومثقفاً يجيب على الأسئلة باللغة العربية الفصحى الواضحة والمفهومة.

🧠 **مجالات خبرتك:**
• علوم الحاسوب والبرمجة والتكنولوجيا
• العلوم الطبيعية والرياضيات والطب
• التاريخ والأدب والفلسفة وعلم النفس
• الاقتصاد والإدارة وريادة الأعمال
• الفنون والموسيقى والسينما
• الثقافة العامة والجغرافيا والسياسة

📝 **أسلوب إجابتك:**
- استخدم العربية الفصحى الواضحة والمفهومة
- اجعل إجاباتك طبيعية ومتدفقة
- استخدم أمثلة من الثقافة العربية عند الإمكان
- كن ودوداً ومشجعاً في ردودك
- اشرح المفاهيم بطريقة بسيطة ومفهومة
- استخدم الرموز التعبيرية بشكل مناسب

🎨 **نبرة الحديث:**
كن ودوداً ومتفهماً، واستخدم تعبيرات عربية طبيعية مثل "بالطبع"، "في الواقع"، "دعني أوضح لك"، "هذا سؤال ممتاز".` :

                `You are an intelligent, cultured assistant aware of all fields, with strong specialization in Computer Science and Technology.

🧠 **Your Comprehensive Knowledge:**
• **Technology:** Programming, AI, Cybersecurity, Blockchain, IoT
• **Sciences:** Mathematics, Physics, Chemistry, Biology, Medicine
• **Humanities:** History, Literature, Philosophy, Psychology, Sociology
• **Business:** Economics, Management, Marketing, Entrepreneurship
• **Arts:** Design, Music, Cinema, Drawing
• **General Culture:** Geography, Politics, Sports, Cooking

🎯 **Your Principles:**
- Answer accurately and clearly according to the question only
- Don't elaborate unless asked
- Use current and accurate information
- Be helpful and direct
- Adapt to the questioner's level

**Your Style:** Smart, cultured, concise, and helpful.`
            },
            {
              role: 'user',
              content: language === 'ar' ?
                `${userMessage.text}${fileContent ? `\n\n📎 **محتوى الملفات المرفقة:**\n${fileContent}` : ''}

[ملاحظة: يرجى الإجابة باللغة العربية الفصحى الطبيعية والواضحة، واستخدام تعبيرات عربية مألوفة. إذا كان هناك ملفات مرفقة، يرجى شرحها وتحليلها بالتفصيل.]` :
                `${userMessage.text}${fileContent ? `\n\n📎 **Attached Files Content:**\n${fileContent}` : ''}`
            }
          ],
          max_tokens: 2000,
          temperature: 0.8,
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0.1
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ OpenRouter response:', data);

        const aiContent = data.choices?.[0]?.message?.content || 'عذراً، لم أتمكن من الحصول على رد.';

        // إضافة تأثير الكتابة التدريجية
        const aiMessage: Message = {
          id: `ai_${Date.now()}`,
          text: '',
          sender: 'ai',
          timestamp: new Date(),
          metadata: { source: 'openrouter', model: 'llama-3.1-8b', typing: true }
        };

        setMessages(prev => [...prev, aiMessage]);

        // تأثير الكتابة السريع
        let currentText = '';
        const words = aiContent.split(' ');
        let wordIndex = 0;

        const typingEffect = setInterval(() => {
          if (wordIndex < words.length) {
            // إضافة 2-3 كلمات في المرة الواحدة للسرعة
            const wordsToAdd = Math.min(3, words.length - wordIndex);
            for (let i = 0; i < wordsToAdd; i++) {
              currentText += (wordIndex > 0 ? ' ' : '') + words[wordIndex];
              wordIndex++;
            }

            setMessages(prev => prev.map(msg =>
              msg.id === aiMessage.id
                ? { ...msg, text: currentText + '▋' }
                : msg
            ));
          } else {
            // إنهاء التأثير
            setMessages(prev => prev.map(msg =>
              msg.id === aiMessage.id
                ? { ...msg, text: aiContent, metadata: { ...msg.metadata, typing: false } }
                : msg
            ));
            clearInterval(typingEffect);
          }
        }, 50); // تسريع من 100ms إلى 50ms

        console.log('✅ تم إضافة رد الذكاء الاصطناعي مع تأثير الكتابة');
      } else {
        const errorData = await response.text();
        console.error('❌ OpenRouter error:', errorData);
        throw new Error('فشل في الاتصال مع OpenRouter');
      }

    } catch (error) {
      console.error('❌ خطأ في OpenRouter:', error);

      // إزالة مؤشر الكتابة وتنظيف الـ interval
      clearInterval(loadingInterval);
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'));

      // رد خطأ الحد اليومي
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        text: language === 'ar' ?
          '⏰ تم الوصول للحد اليومي المسموح من الاستخدام. سيتم تجديد الخدمة تلقائياً خلال 24 ساعة. شكراً لتفهمك!' :
          '⏰ Daily usage limit reached. The service will be automatically renewed within 24 hours. Thank you for your understanding!',
        sender: 'ai',
        timestamp: new Date(),
        metadata: { error: true, errorType: 'rate_limit' }
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // دالة استخراج النص من الملفات
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
        throw new Error('فشل في قراءة ملف PDF');
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
        throw new Error('فشل في قراءة ملف Word');
      }
    }

    // التعامل مع ملفات النص العادي
    if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      try {
        console.log('📄 قراءة ملف نصي...');
        const text = await file.text();
        console.log('✅ تم قراءة الملف النصي بنجاح');
        return text;
      } catch (error) {
        console.error('❌ خطأ في قراءة الملف النصي:', error);
        throw new Error('فشل في قراءة الملف النصي');
      }
    }

    // أنواع ملفات غير مدعومة
    throw new Error(`نوع الملف غير مدعوم: ${fileType || 'غير معروف'}`);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsAnalyzingFile(true);

    try {
      // معالجة كل ملف وستخراج النص منه
      const fileContents: string[] = [];

      for (const file of files) {
        console.log('🔍 بدء تحليل الملف:', file.name);

        try {
          const text = await extractTextFromFile(file);

          if (!text || text.trim().length === 0) {
            throw new Error('الملف فارغ أو لا يحتوي على نص قابل للقراءة');
          }

          if (text.length < 50) {
            throw new Error('النص قصير جداً. يجب أن يحتوي الملف على 50 حرف على الأقل');
          }

          fileContents.push(`📄 **${file.name}**:\n${text}`);
          console.log('✅ تم تحليل الملف بنجاح:', file.name);

        } catch (error: any) {
          console.error('❌ خطأ في تحليل الملف:', file.name, error);
          fileContents.push(`❌ **${file.name}**: ${error.message}`);
        }
      }

      // حفظ محتوى الملفات
      setFileContent(fileContents.join('\n\n'));
      setSelectedFiles(files);

    } catch (error: any) {
      console.error('❌ خطأ عام في معالجة الملفات:', error);
      alert(language === 'ar' ?
        `خطأ في معالجة الملفات: ${error.message}` :
        `Error processing files: ${error.message}`
      );
    } finally {
      setIsAnalyzingFile(false);
    }
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  // دالة مسح المحادثة
  const handleClearChat = () => {
    setShowClearConfirm(true);
  };

  // تأكيد مسح المحادثة - مربوط بالمستخدم
  const confirmClearChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    setShowClearConfirm(false);

    // حذف البيانات المحفوظة للمستخدم المحدد
    if (user?.id) {
      const userStorageKey = `lectures_messages_${user.id}`;
      const userChatIdKey = `lectures_chatId_${user.id}`;
      localStorage.removeItem(userStorageKey);
      localStorage.removeItem(userChatIdKey);
      console.log('🗑️ تم حذف محادثة المستخدم:', user.id);
    }

    // إضافة رسالة ترحيب جديدة
    const welcomeMessage: Message = {
      id: `welcome_${Date.now()}`,
      text: language === 'ar' ?
        '✨ تم مسح المحادثة بنجاح! أهلاً بك من جديد، كيف يمكنني خدمتك اليوم؟' :
        '✨ Chat cleared successfully! How can I help you today?',
      sender: 'ai',
      timestamp: new Date(),
      metadata: { welcome: true, cleared: true }
    };

    setTimeout(() => {
      setMessages([welcomeMessage]);
    }, 300);
  };

  // إلغاء مسح المحادثة
  const cancelClearChat = () => {
    setShowClearConfirm(false);
  };



  return (
    <div
      className={`lectures-container ${isDarkMode ? 'dark' : ''}`}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Header المحادثة */}
      <div className="chat-header">
        <div className="chat-info">
          <div className="chat-title">
            <Bot size={24} className="chat-icon" />
            <div>
              <h3>{language === 'ar' ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}</h3>
              <p>{language === 'ar' ? 'متصل ومستعد للمساعدة' : 'Online and ready to help'}</p>
            </div>
          </div>
        </div>

        <div className="chat-actions">
          <button
            onClick={handleClearChat}
            className="clear-chat-btn"
            title={language === 'ar' ? 'مسح المحادثة' : 'Clear Chat'}
          >
            <Trash2 size={18} />
            <span>{language === 'ar' ? 'مسح' : 'Clear'}</span>
          </button>
        </div>
      </div>

      {/* منطقة الرسائل */}
      <div className="lectures-messages" ref={messagesContainerRef}>
        {messages.map((message) => (
          <div key={message.id} className={`message-bubble ${message.sender}`}>
            <div className={`message-avatar ${message.sender}`}>
              {message.sender === 'ai' ? (
                message.isLoading ? <Loader className="spinning" size={20} /> : <Bot size={20} />
              ) : (
                <User size={20} />
              )}
            </div>
            <div className={`message-content ${message.sender}`}>
              <p className={`message-text ${message.isLoading ? 'loading' : ''}`}>
                {message.text}
              </p>
              {message.files && message.files.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
                  📎 {message.files.length} {language === 'ar' ? 'ملف مرفق' : 'file(s) attached'}
                </div>
              )}
              <div className="message-time">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* مستطيل الكتابة في أقصى الأسفل */}
      <div className="lectures-input-container">
        {/* مؤشر تحليل الملفات */}
        {isAnalyzingFile && (
          <div style={{
            marginBottom: '12px',
            padding: '12px',
            background: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color: isDarkMode ? '#60a5fa' : '#2563eb'
          }}>
            <Loader className="spinning" size={16} />
            {language === 'ar' ? '🔍 جاري تحليل الملفات...' : '🔍 Analyzing files...'}
          </div>
        )}

        {/* عرض الملفات المحددة */}
        {selectedFiles.length > 0 && !isAnalyzingFile && (
          <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {selectedFiles.map((file, index) => (
              <div key={index} style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '8px',
                padding: '4px 8px',
                fontSize: '12px',
                color: isDarkMode ? '#4ade80' : '#16a34a',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                ✅ {file.name}
                <button
                  onClick={() => {
                    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                    setFileContent('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    padding: '0',
                    marginLeft: '4px',
                    fontSize: '12px'
                  }}
                  title={language === 'ar' ? 'إزالة الملف' : 'Remove file'}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="lectures-input-wrapper">
          {/* مربع النص */}
          <div className="lectures-input-field-wrapper">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t.placeholder}
              className="lectures-input-field"
              rows={1}
              style={{
                resize: 'none',
                minHeight: '48px',
                maxHeight: '120px',
                overflow: 'hidden'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
            />
          </div>

          {/* الأزرار */}
          <div className="lectures-action-buttons">
            {/* زر رفع الملفات */}
            <button
              onClick={handleFileButtonClick}
              className="lectures-action-button lectures-file-button"
              title={language === 'ar' ? 'رفع ملف' : 'Upload file'}
            >
              <Paperclip size={20} />
            </button>

            {/* زر الإرسال */}
            <button
              onClick={handleSend}
              disabled={(!inputText.trim() && selectedFiles.length === 0) || isAnalyzingFile || isLoading}
              className={`lectures-action-button lectures-send-button ${
                (inputText.trim() || selectedFiles.length > 0) && !isAnalyzingFile && !isLoading ? 'active' : 'inactive'
              }`}
              title={language === 'ar' ? 'إرسال' : 'Send'}
            >
              {isLoading ? <Loader className="spinning" size={20} /> : <Send size={20} />}
            </button>
          </div>

          {/* input مخفي للملفات */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="lectures-file-input"
            accept=".pdf,.doc,.docx,.txt"
          />
        </div>
      </div>

      {/* مودال تأكيد المسح */}
      {showClearConfirm && (
        <div className="clear-confirm-overlay">
          <div className="clear-confirm-modal">
            <div className="confirm-icon">
              <Trash2 size={32} />
            </div>
            <h3>{language === 'ar' ? 'مسح المحادثة' : 'Clear Chat'}</h3>
            <p>
              {language === 'ar' ?
                'هل أنت متأكد من مسح جميع الرسائل؟ لا يمكن التراجع عن هذا الإجراء.' :
                'Are you sure you want to clear all messages? This action cannot be undone.'
              }
            </p>
            <div className="confirm-actions">
              <button onClick={cancelClearChat} className="cancel-btn">
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={confirmClearChat} className="confirm-btn">
                <Trash2 size={16} />
                {language === 'ar' ? 'مسح' : 'Clear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturesSimple;
