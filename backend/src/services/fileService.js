const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');

/**
 * خدمة معالجة الملفات
 * File Processing Service
 */
class FileService {
  constructor() {
    this.uploadPath = process.env.UPLOAD_PATH || './uploads';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760; // 10MB
    this.allowedTypes = {
      documents: ['pdf', 'doc', 'docx', 'txt'],
      images: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      videos: ['mp4', 'avi', 'mov', 'wmv'],
      audio: ['mp3', 'wav', 'ogg']
    };
    
    this.initializeUploadDirectory();
  }

  /**
   * إنشاء مجلد الرفع إذا لم يكن موجوداً
   */
  async initializeUploadDirectory() {
    try {
      await fs.access(this.uploadPath);
    } catch (error) {
      await fs.mkdir(this.uploadPath, { recursive: true });
      console.log(`📁 تم إنشاء مجلد الرفع: ${this.uploadPath}`);
    }
  }

  /**
   * إعداد multer للرفع
   */
  getMulterConfig(options = {}) {
    const {
      destination = this.uploadPath,
      fileTypes = 'documents',
      maxSize = this.maxFileSize
    } = options;

    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadDir = path.join(destination, fileTypes);
        try {
          await fs.access(uploadDir);
        } catch (error) {
          await fs.mkdir(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        const sanitizedName = name.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
        cb(null, `${sanitizedName}_${uniqueSuffix}${ext}`);
      }
    });

    const fileFilter = (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().slice(1);
      const allowedExts = this.allowedTypes[fileTypes] || this.allowedTypes.documents;
      
      if (allowedExts.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error(`نوع الملف غير مدعوم. الأنواع المسموحة: ${allowedExts.join(', ')}`), false);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: maxSize,
        files: 5 // الحد الأقصى لعدد الملفات
      }
    });
  }

  /**
   * قراءة محتوى الملف النصي
   */
  async readTextFile(filePath) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      
      switch (ext) {
        case '.txt':
          return await this.readPlainText(filePath);
        case '.pdf':
          return await this.readPDF(filePath);
        case '.doc':
        case '.docx':
          return await this.readWord(filePath);
        default:
          throw new Error(`نوع الملف ${ext} غير مدعوم للقراءة`);
      }
    } catch (error) {
      console.error('خطأ في قراءة الملف:', error);
      throw error;
    }
  }

  /**
   * قراءة ملف نصي عادي مع تحليل متقدم
   */
  async readPlainText(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');

      // تنظيف وتحليل النص
      const cleanedText = this.cleanAndAnalyzeText(content);

      return {
        content: cleanedText.text,
        wordCount: cleanedText.wordCount,
        charCount: cleanedText.charCount,
        structure: cleanedText.structure,
        language: cleanedText.detectedLanguage,
        readingTime: Math.ceil(cleanedText.wordCount / 200), // دقائق
        complexity: cleanedText.complexity,
        encoding: 'utf8'
      };
    } catch (error) {
      throw new Error(`فشل في قراءة الملف النصي: ${error.message}`);
    }
  }

  /**
   * قراءة ملف PDF مع تحليل متقدم
   */
  async readPDF(filePath) {
    try {
      const pdfParse = require('pdf-parse');
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);

      // تنظيف وتحليل النص
      const cleanedText = this.cleanAndAnalyzeText(data.text);

      return {
        content: cleanedText.text,
        wordCount: cleanedText.wordCount,
        charCount: cleanedText.charCount,
        pageCount: data.numpages,
        metadata: data.metadata,
        structure: cleanedText.structure,
        language: cleanedText.detectedLanguage,
        readingTime: Math.ceil(cleanedText.wordCount / 200), // دقائق
        complexity: cleanedText.complexity
      };
    } catch (error) {
      console.error('خطأ في قراءة ملف PDF:', error);
      throw new Error(`فشل في قراءة ملف PDF: ${error.message}`);
    }
  }

  /**
   * قراءة ملف Word مع تحليل متقدم
   */
  async readWord(filePath) {
    try {
      const mammoth = require('mammoth');

      // استخراج النص مع الحفاظ على التنسيق
      const result = await mammoth.extractRawText({ path: filePath });

      // تنظيف وتحليل النص
      const cleanedText = this.cleanAndAnalyzeText(result.value);

      return {
        content: cleanedText.text,
        wordCount: cleanedText.wordCount,
        charCount: cleanedText.charCount,
        structure: cleanedText.structure,
        language: cleanedText.detectedLanguage,
        readingTime: Math.ceil(cleanedText.wordCount / 200), // دقائق
        complexity: cleanedText.complexity,
        messages: result.messages,
        warnings: result.messages.filter(m => m.type === 'warning'),
        errors: result.messages.filter(m => m.type === 'error')
      };
    } catch (error) {
      console.error('خطأ في قراءة ملف Word:', error);
      throw new Error(`فشل في قراءة ملف Word: ${error.message}`);
    }
  }

  /**
   * تنظيف وتحليل النص بطريقة متقدمة
   */
  cleanAndAnalyzeText(rawText) {
    try {
      // تنظيف النص الأساسي
      let cleanText = rawText
        .replace(/\r\n/g, '\n')  // توحيد أسطر جديدة
        .replace(/\r/g, '\n')    // توحيد أسطر جديدة
        .replace(/\n{3,}/g, '\n\n') // تقليل الأسطر الفارغة المتعددة
        .replace(/[ \t]+/g, ' ')  // تقليل المسافات المتعددة
        .trim();

      // تحليل البنية
      const structure = this.analyzeTextStructure(cleanText);

      // كشف اللغة
      const detectedLanguage = this.detectLanguage(cleanText);

      // حساب التعقيد
      const complexity = this.calculateComplexity(cleanText);

      // إحصائيات أساسية
      const words = cleanText.split(/\s+/).filter(word => word.length > 0);
      const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const paragraphs = cleanText.split(/\n\s*\n/).filter(p => p.trim().length > 0);

      return {
        text: cleanText,
        wordCount: words.length,
        charCount: cleanText.length,
        sentenceCount: sentences.length,
        paragraphCount: paragraphs.length,
        structure,
        detectedLanguage,
        complexity,
        averageWordsPerSentence: sentences.length > 0 ? Math.round(words.length / sentences.length) : 0,
        averageSentencesPerParagraph: paragraphs.length > 0 ? Math.round(sentences.length / paragraphs.length) : 0
      };
    } catch (error) {
      console.error('خطأ في تحليل النص:', error);
      const words = rawText.split(/\s+/).filter(word => word.length > 0);
      const sentences = rawText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const paragraphs = rawText.split(/\n\s*\n/).filter(p => p.trim().length > 0);

      return {
        text: rawText.trim(),
        wordCount: words.length,
        charCount: rawText.length,
        sentenceCount: sentences.length,
        paragraphCount: paragraphs.length,
        structure: { headings: [], lists: [], tables: [], codeBlocks: [], quotes: [] },
        detectedLanguage: 'unknown',
        complexity: 'medium',
        averageWordsPerSentence: sentences.length > 0 ? Math.round(words.length / sentences.length) : 0,
        averageSentencesPerParagraph: paragraphs.length > 0 ? Math.round(sentences.length / paragraphs.length) : 0
      };
    }
  }

  /**
   * تحليل بنية النص (عناوين، قوائم، جداول)
   */
  analyzeTextStructure(text) {
    const structure = {
      headings: [],
      lists: [],
      tables: [],
      codeBlocks: [],
      quotes: []
    };

    const lines = text.split('\n');

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // كشف العناوين
      if (trimmedLine.match(/^#{1,6}\s+/) || // Markdown headings
          trimmedLine.match(/^[A-Za-z\u0600-\u06FF].{10,50}$/) && // عناوين محتملة
          lines[index + 1] && lines[index + 1].trim() === '') {
        structure.headings.push({
          text: trimmedLine.replace(/^#+\s*/, ''),
          level: (trimmedLine.match(/^#+/) || [''])[0].length || 1,
          line: index + 1
        });
      }

      // كشف القوائم
      if (trimmedLine.match(/^[-*+]\s+/) || // قوائم نقطية
          trimmedLine.match(/^\d+\.\s+/)) {   // قوائم مرقمة
        structure.lists.push({
          text: trimmedLine,
          type: trimmedLine.match(/^\d+\./) ? 'ordered' : 'unordered',
          line: index + 1
        });
      }

      // كشف الجداول (تقريبي)
      if (trimmedLine.includes('|') && trimmedLine.split('|').length > 2) {
        structure.tables.push({
          text: trimmedLine,
          columns: trimmedLine.split('|').length - 1,
          line: index + 1
        });
      }

      // كشف كتل الكود
      if (trimmedLine.match(/^```/) || trimmedLine.match(/^`{3,}/)) {
        structure.codeBlocks.push({
          language: trimmedLine.replace(/^`+/, '').trim(),
          line: index + 1
        });
      }

      // كشف الاقتباسات
      if (trimmedLine.match(/^>\s+/)) {
        structure.quotes.push({
          text: trimmedLine.replace(/^>\s*/, ''),
          line: index + 1
        });
      }
    });

    return structure;
  }

  /**
   * كشف لغة النص
   */
  detectLanguage(text) {
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    const totalChars = arabicChars + englishChars;

    if (totalChars === 0) return 'unknown';

    const arabicRatio = arabicChars / totalChars;
    const englishRatio = englishChars / totalChars;

    if (arabicRatio > 0.6) return 'ar';
    if (englishRatio > 0.6) return 'en';
    if (arabicRatio > 0.3 && englishRatio > 0.3) return 'mixed';

    return 'unknown';
  }

  /**
   * حساب مستوى تعقيد النص
   */
  calculateComplexity(text) {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    if (words.length === 0 || sentences.length === 0) return 'low';

    // متوسط طول الكلمات
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;

    // متوسط طول الجمل
    const avgSentenceLength = words.length / sentences.length;

    // كلمات معقدة (أكثر من 6 أحرف)
    const complexWords = words.filter(word => word.length > 6).length;
    const complexWordRatio = complexWords / words.length;

    // حساب النقاط
    let complexityScore = 0;

    if (avgWordLength > 6) complexityScore += 1;
    if (avgSentenceLength > 20) complexityScore += 1;
    if (complexWordRatio > 0.3) complexityScore += 1;

    // تحديد المستوى
    if (complexityScore >= 2) return 'high';
    if (complexityScore === 1) return 'medium';
    return 'low';
  }

  /**
   * حفظ الملف مع معلومات إضافية
   */
  async saveFileWithMetadata(file, userId, additionalData = {}) {
    try {
      const fileInfo = {
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        uploadedBy: userId,
        uploadedAt: new Date(),
        ...additionalData
      };

      // حساب hash للملف للتحقق من التكرار
      const fileBuffer = await fs.readFile(file.path);
      fileInfo.hash = crypto.createHash('md5').update(fileBuffer).digest('hex');

      return fileInfo;
    } catch (error) {
      throw new Error(`فشل في حفظ معلومات الملف: ${error.message}`);
    }
  }

  /**
   * حذف الملف
   */
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      console.log(`🗑️ تم حذف الملف: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`خطأ في حذف الملف ${filePath}:`, error);
      return false;
    }
  }

  /**
   * الحصول على معلومات الملف
   */
  async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      return {
        path: filePath,
        size: stats.size,
        extension: ext,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      throw new Error(`فشل في الحصول على معلومات الملف: ${error.message}`);
    }
  }

  /**
   * تنظيف الملفات القديمة
   */
  async cleanupOldFiles(maxAge = 30) { // 30 يوم افتراضياً
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAge);

      const files = await this.getAllFiles(this.uploadPath);
      let deletedCount = 0;

      for (const file of files) {
        const stats = await fs.stat(file);
        if (stats.mtime < cutoffDate) {
          await this.deleteFile(file);
          deletedCount++;
        }
      }

      console.log(`🧹 تم حذف ${deletedCount} ملف قديم`);
      return deletedCount;
    } catch (error) {
      console.error('خطأ في تنظيف الملفات القديمة:', error);
      return 0;
    }
  }

  /**
   * الحصول على جميع الملفات في مجلد
   */
  async getAllFiles(dirPath, fileList = []) {
    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory()) {
          await this.getAllFiles(filePath, fileList);
        } else {
          fileList.push(filePath);
        }
      }
      
      return fileList;
    } catch (error) {
      console.error('خطأ في قراءة المجلد:', error);
      return fileList;
    }
  }

  /**
   * تحويل حجم الملف إلى صيغة قابلة للقراءة
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * التحقق من صحة نوع الملف
   */
  isValidFileType(filename, category = 'documents') {
    const ext = path.extname(filename).toLowerCase().slice(1);
    const allowedExts = this.allowedTypes[category] || this.allowedTypes.documents;
    return allowedExts.includes(ext);
  }

  /**
   * إنشاء رابط آمن للملف
   */
  generateSecureFileUrl(filePath, expiresIn = 3600) { // ساعة واحدة افتراضياً
    const timestamp = Date.now() + (expiresIn * 1000);
    const token = crypto.createHash('sha256')
      .update(`${filePath}${timestamp}${process.env.JWT_SECRET}`)
      .digest('hex');
    
    return {
      url: `/api/files/secure/${encodeURIComponent(path.basename(filePath))}`,
      token,
      expires: new Date(timestamp)
    };
  }
}

// إنشاء مثيل واحد من الخدمة
const fileService = new FileService();

module.exports = fileService;
