/**
 * ملف تصدير جميع المسارات
 * Routes Index File
 */

const authRoutes = require('./auth');
const userRoutes = require('./users');
const lectureRoutes = require('./lectures');
const questionRoutes = require('./questions');
const taskRoutes = require('./tasks');
const reportRoutes = require('./reports');
const analyticsRoutes = require('./analytics');

module.exports = {
  authRoutes,
  userRoutes,
  lectureRoutes,
  questionRoutes,
  taskRoutes,
  reportRoutes,
  analyticsRoutes
};
