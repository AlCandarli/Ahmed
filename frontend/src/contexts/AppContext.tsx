/**
 * سياق التطبيق لإدارة الحالة العامة
 * App Context for Global State Management
 */

import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';

// أنواع البيانات المبسطة
interface UserPreferences {
  theme: 'light' | 'dark';
  language: 'ar' | 'en';
  sidebarCollapsed: boolean;
  lastActiveSection: string;
}

interface UserSession {
  token: string;
  refreshToken: string;
  user: any;
  loginTime: string;
  lastActivity: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  section: string;
  metadata?: any;
}

interface AppState {
  // حالة المصادقة
  isAuthenticated: boolean;
  user: any | null;
  session: UserSession | null;

  // التفضيلات
  preferences: UserPreferences;

  // حالة التطبيق
  currentSection: string;
  isLoading: boolean;
  error: string | null;

  // البيانات
  lectures: any[];
  questions: any[];
  tasks: any[];
  reports: any[];
  analytics: any[];
  chatMessages: ChatMessage[];

  // حالة الاتصال
  isOnline: boolean;
  lastSync: Date | null;
}

// أنواع الإجراءات
type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER'; payload: { user: any; session: UserSession } }
  | { type: 'LOGOUT' }
  | { type: 'SET_PREFERENCES'; payload: UserPreferences }
  | { type: 'SET_CURRENT_SECTION'; payload: string }
  | { type: 'SET_LECTURES'; payload: any[] }
  | { type: 'SET_QUESTIONS'; payload: any[] }
  | { type: 'SET_TASKS'; payload: any[] }
  | { type: 'SET_REPORTS'; payload: any[] }
  | { type: 'SET_ANALYTICS'; payload: any[] }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_CHAT_MESSAGES'; payload: ChatMessage[] }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'SET_LAST_SYNC'; payload: Date | null }
  | { type: 'INITIALIZE_APP'; payload: Partial<AppState> };

// الحالة الأولية
const initialState: AppState = {
  isAuthenticated: false,
  user: null,
  session: null,
  preferences: {
    theme: 'light',
    language: 'ar',
    sidebarCollapsed: false,
    lastActiveSection: 'lectures'
  },
  currentSection: '', // فارغ في البداية حتى يتم تحديده بعد تسجيل الدخول
  isLoading: false,
  error: null,
  lectures: [],
  questions: [],
  tasks: [],
  reports: [],
  analytics: [],
  chatMessages: [],
  isOnline: navigator.onLine,
  lastSync: null
};

// مخفض الحالة
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload };
      
    case 'SET_USER':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        session: action.payload.session
      };
      
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        session: null,
        lectures: [],
        questions: [],
        tasks: [],
        reports: [],
        analytics: [],
        chatMessages: []
      };
      
    case 'SET_PREFERENCES':
      return { ...state, preferences: action.payload };
      
    case 'SET_CURRENT_SECTION':
      return { ...state, currentSection: action.payload };
      
    case 'SET_LECTURES':
      return { ...state, lectures: action.payload };
      
    case 'SET_QUESTIONS':
      return { ...state, questions: action.payload };
      
    case 'SET_TASKS':
      return { ...state, tasks: action.payload };
      
    case 'SET_REPORTS':
      return { ...state, reports: action.payload };
      
    case 'SET_ANALYTICS':
      return { ...state, analytics: action.payload };
      
    case 'ADD_CHAT_MESSAGE':
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.payload]
      };
      
    case 'SET_CHAT_MESSAGES':
      return { ...state, chatMessages: action.payload };
      
    case 'SET_ONLINE_STATUS':
      return { ...state, isOnline: action.payload };
      
    case 'SET_LAST_SYNC':
      return { ...state, lastSync: action.payload };
      
    case 'INITIALIZE_APP':
      return { ...state, ...action.payload };
      
    default:
      return state;
  }
}

// سياق التطبيق
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // دوال المصادقة
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: any) => Promise<boolean>;
  logout: () => Promise<void>;
  
  // دوال التفضيلات
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  toggleTheme: () => void;
  toggleLanguage: () => void;
  toggleSidebar: () => void;
  
  // دوال البيانات
  loadUserData: () => Promise<void>;
  syncData: () => Promise<void>;
  
  // دوال المحادثة
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  getChatMessages: (section?: string) => ChatMessage[];
  
  // دوال الأقسام
  setCurrentSection: (section: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// موفر السياق
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // دالة تطبيق المظهر البسيطة
  const applyTheme = (theme: 'light' | 'dark') => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      document.body.className = theme === 'dark' ? 'dark-mode' : 'light-mode';
    } catch (error) {
      console.error('خطأ في تطبيق المظهر:', error);
    }
  };

  // تهيئة التطبيق
  useEffect(() => {
    console.log('🚀 بدء تهيئة التطبيق...');

    try {
      // تطبيق المظهر الافتراضي
      applyTheme('light');

      // تحميل الجلسة المحفوظة
      const savedSession = localStorage.getItem('user_session');
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          console.log('🔍 تم العثور على جلسة محفوظة:', session);

          if (session.user && session.token) {
            dispatch({ type: 'SET_USER', payload: { user: session.user, session } });
            console.log('✅ تم تسجيل الدخول تلقائياً');

            // تحميل محادثات المستخدم
            loadUserChatMessages(session.user._id, session.token);
          }
        } catch (error) {
          console.error('خطأ في تحليل الجلسة:', error);
          localStorage.removeItem('user_session');
        }
      }

      console.log('✅ تم تهيئة التطبيق بنجاح');
    } catch (error) {
      console.error('❌ خطأ في التهيئة:', error);
    }
  }, []);



  // تحميل محادثات المستخدم من قاعدة البيانات
  const loadUserChatMessages = async (userId: string, token: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/chat/messages/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success && data.data) {
        // تحويل البيانات لتنسيق ChatMessage وحفظها في localStorage
        const chatMessages = data.data.map((msg: any) => ({
          id: msg.messageId,
          type: msg.type,
          content: msg.content,
          section: msg.section,
          timestamp: msg.timestamp,
          metadata: msg.metadata || {}
        }));

        // حفظ في localStorage مرتبط بالمستخدم
        const userChatKey = `chat_messages_${userId}`;
        localStorage.setItem(userChatKey, JSON.stringify(chatMessages));

        console.log(`💾 تم تحميل ${chatMessages.length} رسالة للمستخدم`);
      }
    } catch (error) {
      console.error('خطأ في تحميل المحادثات:', error);
    }
  };

  // دوال المصادقة الحقيقية
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // إرسال طلب تسجيل الدخول للخادم
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        const session = {
          token: data.data.token,
          refreshToken: data.data.refreshToken,
          user: data.data.user,
          loginTime: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        };

        // حفظ الجلسة في localStorage
        localStorage.setItem('user_session', JSON.stringify(session));
        localStorage.setItem('userId', data.data.user._id);
        localStorage.setItem('token', data.data.token);
        console.log('💾 تم حفظ الجلسة في localStorage');

        dispatch({ type: 'SET_USER', payload: { user: data.data.user, session } });

        // تحميل محادثات المستخدم من قاعدة البيانات
        await loadUserChatMessages(data.data.user._id, data.data.token);

        return true;
      } else {
        console.error('فشل تسجيل الدخول:', data.message);
        return false;
      }
    } catch (error) {
      console.error('خطأ في تسجيل الدخول:', error);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const register = async (userData: any): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // إرسال طلب التسجيل للخادم
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userData.name,
          email: userData.email,
          password: userData.password,
          confirmPassword: userData.confirmPassword
        }),
      });

      const data = await response.json();

      if (data.success) {
        const session = {
          token: data.data.token,
          refreshToken: data.data.refreshToken,
          user: data.data.user,
          loginTime: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        };

        // حفظ الجلسة في localStorage
        localStorage.setItem('user_session', JSON.stringify(session));
        localStorage.setItem('userId', data.data.user._id);
        localStorage.setItem('token', data.data.token);
        console.log('💾 تم حفظ الجلسة في localStorage');

        dispatch({ type: 'SET_USER', payload: { user: data.data.user, session } });

        // تحميل محادثات المستخدم من قاعدة البيانات
        await loadUserChatMessages(data.data.user._id, data.data.token);

        return true;
      } else {
        console.error('فشل التسجيل:', data.message);
        return false;
      }
    } catch (error) {
      console.error('خطأ في التسجيل:', error);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = async (): Promise<void> => {
    // حذف الجلسة من localStorage
    const userId = localStorage.getItem('userId');
    localStorage.removeItem('user_session');
    localStorage.removeItem('token');
    localStorage.removeItem('userId');

    // حذف محادثات المستخدم الحالي
    if (userId) {
      localStorage.removeItem(`chat_messages_${userId}`);
    }

    console.log('🗑️ تم حذف الجلسة من localStorage');

    dispatch({ type: 'LOGOUT' });
  };



  // دوال التفضيلات المبسطة
  const updatePreferences = (newPreferences: Partial<UserPreferences>) => {
    const updatedPreferences = { ...state.preferences, ...newPreferences };
    dispatch({ type: 'SET_PREFERENCES', payload: updatedPreferences });

    if (newPreferences.theme) {
      applyTheme(newPreferences.theme);
    }
  };

  const toggleTheme = () => {
    const newTheme = state.preferences.theme === 'light' ? 'dark' : 'light';
    updatePreferences({ theme: newTheme });
  };

  const toggleLanguage = () => {
    const newLanguage = state.preferences.language === 'ar' ? 'en' : 'ar';
    updatePreferences({ language: newLanguage });
  };

  const toggleSidebar = () => {
    updatePreferences({ sidebarCollapsed: !state.preferences.sidebarCollapsed });
  };

  // دوال البيانات المبسطة
  const loadUserData = async () => {
    // محاكاة تحميل البيانات
    console.log('تحميل بيانات المستخدم...');
  };

  const syncData = async () => {
    // محاكاة مزامنة البيانات
    dispatch({ type: 'SET_LAST_SYNC', payload: new Date() });
  };

  // دوال المحادثة مع حفظ في قاعدة البيانات
  const addChatMessage = async (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const fullMessage: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    // إضافة للحالة المحلية فوراً
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: fullMessage });

    // حفظ في localStorage مرتبط بالمستخدم
    const userId = localStorage.getItem('userId');
    if (userId) {
      const userChatKey = `chat_messages_${userId}`;
      const savedMessages = localStorage.getItem(userChatKey);
      const messages = savedMessages ? JSON.parse(savedMessages) : [];
      messages.push(fullMessage);
      localStorage.setItem(userChatKey, JSON.stringify(messages));
    }

    // حفظ في قاعدة البيانات
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');

      if (token && userId && userId !== 'undefined') {
        await fetch('http://localhost:5000/api/chat/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            userId,
            message: fullMessage
          }),
        });
        console.log('💾 تم حفظ الرسالة في قاعدة البيانات');
      } else {
        console.log('⚠️ لا يمكن حفظ الرسالة - المستخدم غير مسجل دخول');
      }
    } catch (error) {
      console.error('خطأ في حفظ الرسالة:', error);
    }
  };

  const getChatMessages = (section?: string): ChatMessage[] => {
    const userId = localStorage.getItem('userId');
    if (!userId) return [];

    const userChatKey = `chat_messages_${userId}`;
    const savedMessages = localStorage.getItem(userChatKey);
    if (!savedMessages) return [];

    const messages = JSON.parse(savedMessages);
    return section ? messages.filter((msg: ChatMessage) => msg.section === section) : messages;
  };

  // دوال الأقسام المبسطة
  const setCurrentSection = (section: string) => {
    dispatch({ type: 'SET_CURRENT_SECTION', payload: section });
    updatePreferences({ lastActiveSection: section });
  };



  const contextValue: AppContextType = {
    state,
    dispatch,
    login,
    register,
    logout,
    updatePreferences,
    toggleTheme,
    toggleLanguage,
    toggleSidebar,
    loadUserData,
    syncData,
    addChatMessage,
    getChatMessages,
    setCurrentSection
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

// Hook لاستخدام السياق
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
