const express = require('express');
const { User } = require('../models');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validatePagination, validateSearch } = require('../middleware/validation');

const router = express.Router();

/**
 * الحصول على قائمة المستخدمين (للمديرين فقط)
 * GET /api/users
 */
router.get('/', authenticateToken, authorize('admin'), validatePagination, validateSearch, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.q;
    const { role, isActive } = req.query;

    // بناء الاستعلام
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // الحصول على المستخدمين
    const users = await User.find(query)
      .select('-password')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    // عدد المستخدمين الإجمالي
    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users: users.map(user => user.getPublicProfile()),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('خطأ في الحصول على المستخدمين:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * الحصول على مستخدم محدد
 * GET /api/users/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // التحقق من الصلاحية (المستخدم نفسه أو مدير)
    if (req.user._id.toString() !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية للوصول لهذا المستخدم'
      });
    }

    const user = await User.findById(id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    res.json({
      success: true,
      data: {
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('خطأ في الحصول على المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * تحديث مستخدم (للمديرين فقط)
 * PUT /api/users/:id
 */
router.put('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive } = req.body;

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // تحديث البيانات المسموحة
    if (name && name.trim().length >= 2) {
      user.name = name.trim();
    }

    if (email && email.includes('@')) {
      // التحقق من عدم وجود البريد مسبقاً
      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني مستخدم مسبقاً'
        });
      }
      user.email = email.toLowerCase();
    }

    if (role && ['student', 'admin'].includes(role)) {
      user.role = role;
    }

    if (typeof isActive === 'boolean') {
      user.isActive = isActive;
    }

    await user.save();

    res.json({
      success: true,
      message: 'تم تحديث المستخدم بنجاح',
      data: {
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('خطأ في تحديث المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * حذف مستخدم (للمديرين فقط)
 * DELETE /api/users/:id
 */
router.delete('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // منع حذف المدير لنفسه
    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكنك حذف حسابك الخاص'
      });
    }

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // حذف جميع البيانات المرتبطة بالمستخدم
    const { Lecture, Question, Task, Report, Analytics } = require('../models');
    
    await Promise.all([
      Lecture.deleteMany({ userId: id }),
      Question.deleteMany({ userId: id }),
      Report.deleteMany({ userId: id }),
      Analytics.deleteMany({ userId: id }),
      // إزالة محاولات المستخدم من المهام
      Task.updateMany(
        { 'submissions.userId': id },
        { $pull: { submissions: { userId: id } } }
      )
    ]);

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'تم حذف المستخدم وجميع بياناته بنجاح'
    });

  } catch (error) {
    console.error('خطأ في حذف المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * إحصائيات المستخدمين (للمديرين فقط)
 * GET /api/users/stats/overview
 */
router.get('/stats/overview', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    // إحصائيات عامة
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const studentUsers = await User.countDocuments({ role: 'student' });

    // المستخدمين الجدد (آخر 30 يوم)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers = await User.countDocuments({ 
      createdAt: { $gte: thirtyDaysAgo } 
    });

    // المستخدمين النشطين (آخر 7 أيام)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentlyActiveUsers = await User.countDocuments({ 
      lastLogin: { $gte: sevenDaysAgo } 
    });

    // إحصائيات النقاط
    const pointsStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalPoints: { $sum: '$stats.totalPoints' },
          averagePoints: { $avg: '$stats.totalPoints' },
          maxPoints: { $max: '$stats.totalPoints' }
        }
      }
    ]);

    // توزيع المستخدمين حسب المستوى
    const levelDistribution = await User.aggregate([
      {
        $addFields: {
          level: {
            $switch: {
              branches: [
                { case: { $lt: ['$stats.totalPoints', 100] }, then: 'مبتدئ' },
                { case: { $lt: ['$stats.totalPoints', 500] }, then: 'متوسط' },
                { case: { $lt: ['$stats.totalPoints', 1000] }, then: 'متقدم' }
              ],
              default: 'خبير'
            }
          }
        }
      },
      {
        $group: {
          _id: '$level',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          adminUsers,
          studentUsers,
          newUsers,
          recentlyActiveUsers
        },
        points: pointsStats[0] || {
          totalPoints: 0,
          averagePoints: 0,
          maxPoints: 0
        },
        levelDistribution
      }
    });

  } catch (error) {
    console.error('خطأ في الحصول على إحصائيات المستخدمين:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * أفضل المستخدمين (لوحة المتصدرين)
 * GET /api/users/leaderboard
 */
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const { limit = 10, period = 'all' } = req.query;

    let query = { isActive: true };
    
    // تصفية حسب الفترة الزمنية
    if (period !== 'all') {
      const date = new Date();
      if (period === 'week') {
        date.setDate(date.getDate() - 7);
      } else if (period === 'month') {
        date.setDate(date.getDate() - 30);
      }
      query.lastLogin = { $gte: date };
    }

    // الحصول على أفضل المستخدمين حسب النقاط
    const topUsers = await User.find(query)
      .select('name stats level createdAt lastLogin')
      .sort({ 'stats.totalPoints': -1 })
      .limit(parseInt(limit));

    // إضافة ترتيب المستخدم الحالي
    const currentUserRank = await User.countDocuments({
      ...query,
      'stats.totalPoints': { $gt: req.user.stats.totalPoints }
    }) + 1;

    res.json({
      success: true,
      data: {
        leaderboard: topUsers.map((user, index) => ({
          rank: index + 1,
          ...user.getPublicProfile()
        })),
        currentUser: {
          rank: currentUserRank,
          ...req.user.getPublicProfile()
        }
      }
    });

  } catch (error) {
    console.error('خطأ في الحصول على لوحة المتصدرين:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

/**
 * البحث عن المستخدمين
 * GET /api/users/search
 */
router.get('/search', authenticateToken, validateSearch, async (req, res) => {
  try {
    const { q: searchTerm, limit = 10 } = req.query;

    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'نص البحث يجب أن يكون على الأقل حرفين'
      });
    }

    const users = await User.find({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ],
      isActive: true
    })
    .select('name email stats level createdAt')
    .limit(parseInt(limit))
    .sort({ 'stats.totalPoints': -1 });

    res.json({
      success: true,
      data: {
        users: users.map(user => user.getPublicProfile()),
        total: users.length
      }
    });

  } catch (error) {
    console.error('خطأ في البحث عن المستخدمين:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

module.exports = router;
