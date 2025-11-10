/**
 * ChatApp - Главный компонент чата с LLM
 * 
 * Возможности:
 * - Streaming ответов токен-за-токеном
 * - История сообщений
 * - Отмена запроса
 * - Автоматическая прокрутка
 * - Сохранение в localStorage через Zustand
 * 
 * Стек:
 * - React 19
 * - TypeScript
 * - Zustand (state management)
 * - SCSS (стили)
 */

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useLLMStream } from '../hooks/useLLMStream';
import './Chat.scss';

/* ============================================================================
 * Types
 * ========================================================================= */

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

/* ============================================================================
 * Store (Zustand)
 * ========================================================================= */

interface ChatStore {
  messages: Message[];
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, content: string) => void;
  setStreamingStatus: (id: string, isStreaming: boolean) => void;
  clearMessages: () => void;
}

const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      messages: [],

      addMessage: (message) => {
        const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newMessage: Message = {
          ...message,
          id,
          timestamp: Date.now(),
        };

        set((state) => ({
          messages: [...state.messages, newMessage],
        }));

        return id;
      },

      updateMessage: (id, content) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, content } : msg
          ),
        }));
      },

      setStreamingStatus: (id, isStreaming) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, isStreaming } : msg
          ),
        }));
      },

      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({ messages: state.messages }),
    }
  )
);

/* ============================================================================
 * Message Component
 * ========================================================================= */

interface MessageProps {
  message: Message;
}

const Message = memo<MessageProps>(({ message }) => {
  const { role, content, isStreaming, timestamp } = message;

  return (
    <div className={`message message--${role}`}>
      <div className="message__avatar">
        {role === 'user' ? '👤' : '🤖'}
      </div>
      <div className="message__content">
        <div className="message__text">
          {content}
          {isStreaming && <span className="message__cursor">▋</span>}
        </div>
        <time className="message__time">
          {new Date(timestamp).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </time>
      </div>
    </div>
  );
});

Message.displayName = 'Message';

/* ============================================================================
 * MessageList Component
 * ========================================================================= */

interface MessageListProps {
  messages: Message[];
}

function MessageList({ messages }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Автоматическая прокрутка при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="message-list message-list--empty">
        <div className="empty-state">
          <span className="empty-state__icon">💬</span>
          <h2 className="empty-state__title">Начните диалог</h2>
          <p className="empty-state__text">
            Задайте вопрос или опишите задачу
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

/* ============================================================================
 * ChatInput Component
 * ========================================================================= */

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    if (!input.trim() || disabled) return;

    onSend(input.trim());
    setInput('');

    // Сброс высоты textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter для отправки (без Shift)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // Автоматическое изменение высоты textarea
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  return (
    <div className="chat-input">
      <textarea
        ref={textareaRef}
        className="chat-input__textarea"
        placeholder="Введите сообщение... (Enter для отправки)"
        value={input}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
      />
      <button
        className="chat-input__button"
        onClick={handleSubmit}
        disabled={disabled || !input.trim()}
        type="button"
      >
        <span className="chat-input__icon">📤</span>
      </button>
    </div>
  );
}

/* ============================================================================
 * ChatApp Component (Main)
 * ========================================================================= */

export function ChatApp() {
  const {
    messages,
    addMessage,
    updateMessage,
    setStreamingStatus,
    clearMessages,
  } = useChatStore();

  const { stream, isStreaming, error, cancel } = useLLMStream();
  const [currentAssistantId, setCurrentAssistantId] = useState<string | null>(null);

  /**
   * Отправка сообщения и получение streaming ответа
   */
  const handleSendMessage = useCallback(
    async (content: string) => {
      // Добавляем сообщение пользователя
      addMessage({
        role: 'user',
        content,
      });

      // Создаем пустое сообщение ассистента для streaming
      const assistantId = addMessage({
        role: 'assistant',
        content: '',
        isStreaming: true,
      });

      setCurrentAssistantId(assistantId);

      try {
        // Запускаем streaming
        await stream({
          endpoint: 'http://localhost:3001/api/chat/stream',
          messages: [
            ...messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            { role: 'user', content },
          ],
          onToken: (token) => {
            // Обновляем сообщение при получении каждого токена
            updateMessage(assistantId, (prev: string) => prev + token);
          },
          onComplete: () => {
            // Снимаем статус streaming
            setStreamingStatus(assistantId, false);
            setCurrentAssistantId(null);
          },
          onError: (error) => {
            // Обработка ошибки
            updateMessage(
              assistantId,
              `❌ Ошибка: ${error.message}`
            );
            setStreamingStatus(assistantId, false);
            setCurrentAssistantId(null);
          },
        });
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    },
    [messages, addMessage, updateMessage, setStreamingStatus, stream]
  );

  /**
   * Отмена текущего запроса
   */
  const handleCancel = useCallback(() => {
    cancel();
    
    if (currentAssistantId) {
      setStreamingStatus(currentAssistantId, false);
      setCurrentAssistantId(null);
    }
  }, [cancel, currentAssistantId, setStreamingStatus]);

  return (
    <div className="chat-app">
      {/* Header */}
      <header className="chat-app__header">
        <div className="chat-app__title">
          <h1>LLM Chat</h1>
          <span className="chat-app__subtitle">
            React 19 + TypeScript + Zustand
          </span>
        </div>
        <div className="chat-app__actions">
          <button
            className="chat-app__action-btn"
            onClick={clearMessages}
            disabled={messages.length === 0}
            title="Очистить историю"
          >
            🗑️
          </button>
        </div>
      </header>

      {/* Messages */}
      <main className="chat-app__main">
        <MessageList messages={messages} />
        
        {/* Error message */}
        {error && (
          <div className="chat-app__error">
            <span className="chat-app__error-icon">⚠️</span>
            <span className="chat-app__error-text">{error.message}</span>
          </div>
        )}
      </main>

      {/* Input */}
      <footer className="chat-app__footer">
        {isStreaming && (
          <div className="chat-app__streaming-indicator">
            <div className="typing-indicator">
              <div className="typing-indicator__dot" />
              <div className="typing-indicator__dot" />
              <div className="typing-indicator__dot" />
            </div>
            <span>Генерация ответа...</span>
            <button
              className="chat-app__cancel-btn"
              onClick={handleCancel}
            >
              Отменить
            </button>
          </div>
        )}
        
        <ChatInput
          onSend={handleSendMessage}
          disabled={isStreaming}
        />
      </footer>
    </div>
  );
}

export default ChatApp;
