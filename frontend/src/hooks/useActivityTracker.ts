import { useEffect, useRef } from 'react';
import statisticsService from '../services/statisticsService';

interface ActivityTrackerOptions {
  section: string;
  trackTime?: boolean;
  trackActions?: boolean;
}

export const useActivityTracker = (options: ActivityTrackerOptions) => {
  const startTimeRef = useRef<Date>(new Date());
  const activitiesRef = useRef<any[]>([]);

  // تسجيل بداية الجلسة
  useEffect(() => {
    startTimeRef.current = new Date();
    
    // تحديث آخر نشاط
    statisticsService.updateLastActive();
    
    return () => {
      // تسجيل نهاية الجلسة عند مغادرة المكون
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - startTimeRef.current.getTime()) / 1000 / 60); // بالدقائق
      
      if (duration > 0) {
        statisticsService.recordSession({
          section: options.section,
          duration,
          activities: activitiesRef.current,
          metadata: {
            startTime: startTimeRef.current,
            endTime,
            userAgent: navigator.userAgent
          }
        });
      }
    };
  }, [options.section]);

  // دالة تسجيل النشاط
  const recordActivity = (action: string, data?: any) => {
    if (options.trackActions) {
      activitiesRef.current.push({
        action,
        data,
        timestamp: new Date()
      });
    }
  };

  // دالة تسجيل إجابة سؤال
  const recordQuestionAnswer = async (questionData: {
    title: string;
    content: string;
    options: string[];
    correctAnswer: number;
    userAnswer: number;
    score: number;
    difficulty: string;
    timeSpent: number;
  }) => {
    await statisticsService.recordQuestionAnswer(questionData);
    recordActivity('question_answered', {
      score: questionData.score,
      correct: questionData.userAnswer === questionData.correctAnswer
    });
  };

  // دالة تسجيل إكمال مهمة
  const recordTaskCompletion = async (taskData: {
    title: string;
    description: string;
    category: string;
    language: string;
    difficulty: string;
    points: number;
    solution: string;
    score: number;
    timeSpent: number;
  }) => {
    await statisticsService.recordTaskCompletion(taskData);
    recordActivity('task_completed', {
      points: taskData.points,
      score: taskData.score
    });
  };

  // دالة تسجيل إنشاء تقرير
  const recordReportGeneration = async (reportData: {
    title: string;
    content: string;
    template: string;
    style: string;
    pageCount: number;
    wordCount: number;
    readingTime: number;
    sections: number;
    language: string;
    generationTime: number;
    aiModel: string;
  }) => {
    await statisticsService.recordReportGeneration(reportData);
    recordActivity('report_generated', {
      pageCount: reportData.pageCount,
      wordCount: reportData.wordCount
    });
  };

  return {
    recordActivity,
    recordQuestionAnswer,
    recordTaskCompletion,
    recordReportGeneration
  };
};
