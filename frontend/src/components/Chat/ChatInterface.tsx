/**
 * واجهة المحادثة مع الذكاء الاصطناعي
 * AI Chat Interface Component
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Upload, Bot, User, Loader, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { apiService } from '../../utils/api';
import './ChatInterface.css';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: string;
  metadata?: any;
}

interface ChatInterfaceProps {
  section: string;
  isVisible: boolean;
  onClose: () => void;
  language: 'ar' | 'en';
  isDarkMode: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  section,
  isVisible,
  onClose,
  language,
  isDarkMode
}) => {
  const { state, addChatMessage, getChatMessages } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // تحميل الرسائل عند تغيير القسم
  useEffect(() => {
    if (isVisible) {
      loadChatMessages();
      createNewChatSession();
    }
  }, [section, isVisible]);

  // التمرير للأسفل عند إضافة رسائل جديدة
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatMessages = () => {
    const sectionMessages = getChatMessages(section);
    setMessages(sectionMessages);
  };

  const createNewChatSession = async () => {
    if (!state.isAuthenticated) return;

    try {
      const response = await fetch('/api/chats/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.session?.token}`
        },
        body: JSON.stringify({
          section,
          language,
          deviceInfo: {
            browser: navigator.userAgent,
            language: navigator.language
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        setCurrentChatId(data.data.chat.id);
      }
    } catch (error) {
      console.error('خطأ في إنشاء جلسة المحادثة:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    // إضافة رسالة المستخدم
    setMessages(prev => [...prev, userMessage]);
    addChatMessage({
      type: 'user',
      content: userMessage.content,
      section
    });

    setInputMessage('');
    setIsLoading(true);

    try {
      // إرسال الرسالة للخادم
      if (currentChatId) {
        const response = await fetch(`/api/chats/${currentChatId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.session?.token}`
          },
          body: JSON.stringify({
            content: userMessage.content,
            type: 'user'
          })
        });

        const data = await response.json();
        if (data.success && data.data.aiResponse) {
          const aiMessage: ChatMessage = {
            id: data.data.aiResponse.id,
            type: 'ai',
            content: data.data.aiResponse.content,
            timestamp: data.data.aiResponse.timestamp,
            metadata: data.data.aiResponse.metadata
          };

          setMessages(prev => [...prev, aiMessage]);
          addChatMessage({
            type: 'ai',
            content: aiMessage.content,
            section
          });
        }
      }
    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
      
      // إضافة رسالة خطأ
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'system',
        content: language === 'ar' ? 
          'عذراً، حدث خطأ في إرسال الرسالة. يرجى المحاولة مرة أخرى.' :
          'Sorry, there was an error sending the message. Please try again.',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // معالجة رفع الملف
      console.log('ملف مرفوع:', file.name);
      // يمكن إضافة منطق رفع الملف هنا
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSectionTitle = () => {
    const titles = {
      ar: {
        lectures: 'مساعد المحاضرات',
        questions: 'مساعد الأسئلة',
        tasks: 'مساعد المهام',
        reports: 'مساعد التقارير',
        analytics: 'مساعد التحليلات',
        support: 'الدعم الفني'
      },
      en: {
        lectures: 'Lectures Assistant',
        questions: 'Questions Assistant',
        tasks: 'Tasks Assistant',
        reports: 'Reports Assistant',
        analytics: 'Analytics Assistant',
        support: 'Technical Support'
      }
    };

    return titles[language][section as keyof typeof titles.ar] || 
           (language === 'ar' ? 'المساعد الذكي' : 'AI Assistant');
  };

  if (!isVisible) return null;

  return (
    <div className={`chat-interface ${isDarkMode ? 'dark' : 'light'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* رأس المحادثة */}
      <div className="chat-header">
        <div className="chat-title">
          <Bot className="chat-icon" />
          <span>{getSectionTitle()}</span>
        </div>
        <button className="close-button" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      {/* منطقة الرسائل */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="welcome-message">
            <Bot size={48} className="welcome-icon" />
            <h3>
              {language === 'ar' ? 'مرحباً بك!' : 'Welcome!'}
            </h3>
            <p>
              {language === 'ar' ? 
                'كيف يمكنني مساعدتك اليوم؟' : 
                'How can I help you today?'}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="message-avatar">
                {message.type === 'user' ? (
                  <User size={20} />
                ) : message.type === 'ai' ? (
                  <Bot size={20} />
                ) : (
                  <div className="system-icon">!</div>
                )}
              </div>
              <div className="message-content">
                <div className="message-text">
                  {message.content}
                </div>
                <div className="message-time">
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="message ai">
            <div className="message-avatar">
              <Bot size={20} />
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <Loader className="spinning" size={16} />
                <span>
                  {language === 'ar' ? 'يكتب...' : 'Typing...'}
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* منطقة الإدخال */}
      <div className="chat-input-area">
        <div className="input-container">
          <button 
            className="file-upload-button"
            onClick={handleFileUpload}
            title={language === 'ar' ? 'رفع ملف' : 'Upload file'}
          >
            <Upload size={20} />
          </button>
          
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={language === 'ar' ? 'اكتب رسالتك هنا...' : 'Type your message here...'}
            className="message-input"
            rows={1}
            disabled={isLoading}
          />
          
          <button 
            className="send-button"
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
          >
            <Send size={20} />
          </button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
        />
      </div>
    </div>
  );
};

export default ChatInterface;
