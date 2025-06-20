const mongoose = require('mongoose');
require('dotenv').config();

/**
 * إعداد الاتصال بقاعدة البيانات MongoDB Atlas
 */
class DatabaseConfig {
  constructor() {
    this.connectionString = this.buildConnectionString();
    this.options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      family: 4,
      bufferCommands: false
    };
  }

  /**
   * بناء سلسلة الاتصال مع كلمة المرور
   */
  buildConnectionString() {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error('MongoDB URI غير محددة في متغيرات البيئة');
    }

    // استخدام URI مباشرة مع كلمة المرور المدمجة
    return uri;
  }

  /**
   * الاتصال بقاعدة البيانات
   */
  async connect() {
    try {
      console.log('🔄 جاري الاتصال بقاعدة البيانات MongoDB Atlas...');
      console.log('🔗 URI:', this.connectionString.replace(/\/\/.*:.*@/, '//***:***@'));

      await mongoose.connect(this.connectionString, this.options);

      console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
      console.log(`📊 قاعدة البيانات: ${mongoose.connection.name || 'educational_platform'}`);
      console.log(`🌐 الخادم: ${mongoose.connection.host}`);
      console.log(`📡 حالة الاتصال: ${mongoose.connection.readyState}`);

      // إعداد مستمعي الأحداث
      this.setupEventListeners();

      return true;

    } catch (error) {
      console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error.message);

      if (error.message.includes('IP')) {
        console.log('🔒 تحقق من إعدادات IP Whitelist في MongoDB Atlas');
      }
      if (error.message.includes('authentication')) {
        console.log('� تحقق من اسم المستخدم وكلمة المرور');
      }

      // لا نرمي الخطأ، بل نعيد false للسماح للخادم بالعمل بدون قاعدة البيانات
      return false;
    }
  }

  /**
   * إعداد مستمعي أحداث قاعدة البيانات
   */
  setupEventListeners() {
    mongoose.connection.on('connected', () => {
      console.log('🔗 Mongoose متصل بـ MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ خطأ في اتصال Mongoose:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 تم قطع اتصال Mongoose');
    });

    // إغلاق الاتصال عند إنهاء التطبيق
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * قطع الاتصال بقاعدة البيانات
   */
  async disconnect() {
    try {
      await mongoose.connection.close();
      console.log('🔌 تم إغلاق اتصال قاعدة البيانات');
    } catch (error) {
      console.error('❌ خطأ في إغلاق اتصال قاعدة البيانات:', error.message);
    }
  }

  /**
   * التحقق من حالة الاتصال
   */
  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  /**
   * الحصول على معلومات قاعدة البيانات
   */
  getConnectionInfo() {
    if (!this.isConnected()) {
      return null;
    }

    return {
      name: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      readyState: mongoose.connection.readyState,
      collections: Object.keys(mongoose.connection.collections)
    };
  }
}

// إنشاء مثيل واحد من إعداد قاعدة البيانات
const databaseConfig = new DatabaseConfig();

module.exports = databaseConfig;
