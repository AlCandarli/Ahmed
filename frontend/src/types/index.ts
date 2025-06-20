// User Types
export interface User {
  uid: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  photoURL?: string;
  role: 'student' | 'teacher' | 'admin';
  grade?: string;
  major?: string;
  institution?: string;
  isActive: boolean;
  isVerified: boolean;
  preferences: UserPreferences;
  stats: UserStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  language: 'ar' | 'en';
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private';
    showEmail: boolean;
    showPhone: boolean;
  };
}

export interface UserStats {
  lecturesCompleted: number;
  questionsAnswered: number;
  tasksCompleted: number;
  reportsWritten: number;
  totalStudyTime: number;
  averageScore: number;
  streak: number;
  lastActivity?: Date;
}

// Lecture Types
export interface Lecture {
  id: string;
  title: string;
  description: string;
  subject: string;
  topic?: string;
  courseId?: string;
  content: LectureContent;
  category: 'math' | 'science' | 'language' | 'history' | 'arts' | 'technology' | 'other';
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  language: 'ar' | 'en';
  duration: number;
  wordCount: number;
  createdBy: string;
  isPublic: boolean;
  status: 'draft' | 'published' | 'archived';
  views: number;
  likes: number;
  downloads: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface LectureContent {
  originalText: string;
  processedText?: string;
  summary?: string;
  keyPoints: string[];
  explanation?: string;
  examples?: string[];
}

// Question Types
export interface Question {
  id: string;
  lectureId: string;
  courseId?: string;
  title: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  question: string;
  options?: string[];
  correctAnswer: string | boolean;
  explanation?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  points: number;
  createdBy: string;
  isActive: boolean;
  createdAt: Date;
}

// Task Types
export interface Task {
  id: string;
  title: string;
  description: string;
  courseId?: string;
  lectureId?: string;
  type: 'homework' | 'project' | 'quiz' | 'assignment';
  instructions: string;
  dueDate: Date;
  maxScore: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  createdBy: string;
  assignedTo: string[];
  status: 'active' | 'completed' | 'overdue' | 'cancelled';
  submissionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Course Types
export interface Course {
  id: string;
  title: string;
  description: string;
  subject: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  createdBy: string;
  isPublic: boolean;
  status: 'draft' | 'published' | 'archived';
  enrollmentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics Types
export interface Analytics {
  id: string;
  userId: string;
  date: Date;
  dailyStats: {
    lecturesViewed: number;
    questionsAnswered: number;
    tasksCompleted: number;
    studyTime: number;
    averageScore: number;
  };
  weeklyStats?: {
    totalStudyTime: number;
    lecturesCompleted: number;
    averageScore: number;
    streak: number;
  };
  monthlyStats?: {
    totalStudyTime: number;
    lecturesCompleted: number;
    averageScore: number;
    improvement: number;
  };
}

// Report Types
export interface Report {
  id: string;
  title: string;
  userId: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  content: string;
  status: 'draft' | 'completed' | 'shared';
  createdAt: Date;
  updatedAt: Date;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'task_assigned' | 'lecture_added';
  isRead: boolean;
  createdAt: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LanguageProps {
  language: 'ar' | 'en';
}

export interface ThemeProps {
  isDarkMode: boolean;
}
