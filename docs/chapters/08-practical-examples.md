# Глава 8: Практические примеры

[⬅️ Предыдущая глава](./07-security.md) | [🏠 На главную](../../README.md) | [📑 Оглавление](../TOC.md)

---

## Обзор примеров

В этой главе мы рассмотрим полные, готовые к использованию примеры кода, которые демонстрируют все изученные концепции на практике. Все примеры используют:

- **React 19** с современными hooks и Suspense
- **TypeScript** без `any`
- **Zustand** для state management
- **SCSS** для стилизации
- **Feature-Sliced Design** для архитектуры

### Что включено

1. **useLLMStream Hook** — универсальный хук для streaming
2. **Chat Component** — полнофункциональный чат-интерфейс
3. **Backend Proxy** — Express сервер с SSE streaming
4. **Инструкции** — как запустить и протестировать

---

## useLLMStream Hook

Универсальный хук для работы с потоковой отдачей от LLM API.

### Архитектура хука

```
useLLMStream
    ├── State Management (Zustand)
    ├── Fetch с AbortController
    ├── SSE Parser
    ├── Error Handling
    └── TypeScript Types
```

### Исходный код

См. полный код: [examples/hooks/useLLMStream.ts](../../examples/hooks/useLLMStream.ts)

**Ключевые возможности:**
- Потоковое получение токенов
- Отмена запроса (AbortController)
- Обработка ошибок и reconnect
- Полная типизация TypeScript
- Optimistic updates

**Пример использования:**

```typescript
import { useLLMStream } from '@/shared/lib/hooks/useLLMStream';

function ChatComponent() {
  const { 
    stream,
    content,
    isStreaming,
    error,
    cancel,
  } = useLLMStream();

  const handleSend = async (message: string) => {
    await stream({
      endpoint: '/api/chat/stream',
      messages: [{ role: 'user', content: message }],
    });
  };

  return (
    <div>
      <div>{content}</div>
      {isStreaming && <button onClick={cancel}>Отменить</button>}
      {error && <div>Ошибка: {error.message}</div>}
    </div>
  );
}
```

---

## Чат-компонент

Полнофункциональный компонент чата с историей, streaming и SCSS стилями.

### Структура компонента

```
Chat/
├── ChatApp.tsx          # Главный компонент
├── components/
│   ├── MessageList.tsx  # Список сообщений
│   ├── Message.tsx      # Отдельное сообщение
│   ├── ChatInput.tsx    # Поле ввода
│   └── TypingIndicator.tsx
├── model/
│   └── chatStore.ts     # Zustand store
└── Chat.scss            # Стили
```

### Исходные файлы

- [examples/Chat/ChatApp.tsx](../../examples/Chat/ChatApp.tsx) — главный компонент
- [examples/Chat/Chat.scss](../../examples/Chat/Chat.scss) — стили

### State Management с Zustand

```typescript
// model/chatStore.ts
import { create } from 'zustand';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

interface ChatStore {
  messages: Message[];
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, content: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  
  addMessage: (message) => {
    const newMessage: Message = {
      ...message,
      id: `msg-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };
    
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
  },
  
  updateMessage: (id, content) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, content } : msg
      ),
    }));
  },
  
  clearMessages: () => set({ messages: [] }),
}));
```

### Incremental Rendering

Компонент `Message` оптимизирован для отображения streaming контента:

```typescript
// components/Message.tsx
import { memo } from 'react';

interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export const Message = memo<MessageProps>(({ role, content, isStreaming }) => {
  return (
    <div className={`message message--${role}`}>
      <div className="message__avatar">
        {role === 'user' ? '👤' : '🤖'}
      </div>
      <div className="message__content">
        {content}
        {isStreaming && <span className="message__cursor">▋</span>}
      </div>
    </div>
  );
});

Message.displayName = 'Message';
```

### История сообщений

Интеграция с `localStorage` для сохранения истории:

```typescript
import { persist } from 'zustand/middleware';

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      // ... store implementation
    }),
    {
      name: 'chat-history',
      partialize: (state) => ({ messages: state.messages }),
    }
  )
);
```

---

## Backend Proxy

Express сервер с SSE streaming и интеграцией с OpenAI API.

### Исходный код

См. полный код: [examples/backend/server.ts](../../examples/backend/server.ts)

### Express сервер

```typescript
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
```

### SSE Streaming

```typescript
app.post('/api/chat/stream', async (req, res) => {
  const { messages } = req.body;

  // Валидация
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages format' });
  }

  // Устанавливаем SSE заголовки
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: messages,
      stream: true,
      temperature: 0.7,
    });

    // Отправляем токены по мере получения
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      
      if (content) {
        const data = JSON.stringify({ content });
        res.write(`data: ${data}\n\n`);
      }
    }

    // Сигнал завершения
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error) {
    console.error('Streaming error:', error);
    const errorData = JSON.stringify({ 
      error: 'Stream failed',
      message: error.message,
    });
    res.write(`data: ${errorData}\n\n`);
    res.end();
  }
});
```

### Безопасность

```typescript
// Rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // макс 100 запросов
  message: 'Too many requests from this IP',
});

app.use('/api/', limiter);

// Input validation
function validateMessage(message: string): boolean {
  if (!message || message.length === 0) return false;
  if (message.length > 10000) return false;
  
  // Проверка на prompt injection
  const dangerousPatterns = [
    /ignore previous instructions/i,
    /disregard all/i,
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(message));
}

app.post('/api/chat/stream', async (req, res) => {
  const { messages } = req.body;
  
  // Валидация каждого сообщения
  const isValid = messages.every((msg: any) => 
    validateMessage(msg.content)
  );
  
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid message content' });
  }
  
  // ... обработка
});
```

### Error Handling

```typescript
// Глобальный error handler
app.use((error: Error, req: any, res: any, next: any) => {
  console.error('Error:', error);
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Something went wrong',
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

---

## Feature-Sliced Design

### Структура проекта

```
src/
├── app/                          # Инициализация приложения
│   ├── providers/
│   │   ├── RouterProvider.tsx
│   │   └── ThemeProvider.tsx
│   ├── App.tsx
│   ├── App.scss
│   └── main.tsx
│
├── pages/                        # Страницы
│   └── chat/
│       ├── ui/
│       │   └── ChatPage.tsx
│       └── index.ts
│
├── widgets/                      # Виджеты (композиции фич)
│   └── chat-container/
│       ├── ui/
│       │   └── ChatContainer.tsx
│       ├── model/
│       │   └── useChatContainer.ts
│       └── index.ts
│
├── features/                     # Фичи (бизнес-логика)
│   ├── send-message/
│   │   ├── ui/
│   │   │   └── SendMessageButton.tsx
│   │   ├── model/
│   │   │   └── useSendMessage.ts
│   │   ├── api/
│   │   │   └── sendMessageApi.ts
│   │   └── index.ts
│   │
│   └── streaming-response/
│       ├── ui/
│       │   └── StreamingMessage.tsx
│       ├── model/
│       │   └── useStreamingResponse.ts
│       └── index.ts
│
├── entities/                     # Бизнес-сущности
│   ├── message/
│   │   ├── ui/
│   │   │   └── Message.tsx
│   │   ├── model/
│   │   │   ├── types.ts
│   │   │   └── messageStore.ts
│   │   └── index.ts
│   │
│   └── user/
│       ├── ui/
│       │   └── UserAvatar.tsx
│       ├── model/
│       │   └── userStore.ts
│       └── index.ts
│
└── shared/                       # Переиспользуемый код
    ├── api/
    │   ├── llm/
    │   │   ├── streamingApi.ts
    │   │   └── types.ts
    │   └── base.ts
    │
    ├── ui/                       # UI-kit
    │   ├── Button/
    │   │   ├── Button.tsx
    │   │   └── Button.scss
    │   ├── Input/
    │   │   ├── Input.tsx
    │   │   └── Input.scss
    │   └── Spinner/
    │       ├── Spinner.tsx
    │       └── Spinner.scss
    │
    ├── lib/                      # Утилиты и хуки
    │   ├── hooks/
    │   │   ├── useLLMStream.ts
    │   │   ├── useDebounce.ts
    │   │   └── useLocalStorage.ts
    │   └── utils/
    │       ├── formatDate.ts
    │       └── truncate.ts
    │
    └── config/
        ├── env.ts
        └── constants.ts
```

### Разделение слоев

#### App Layer
Инициализация и глобальные провайдеры:

```typescript
// app/App.tsx
import { RouterProvider } from './providers/RouterProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import './App.scss';

export function App() {
  return (
    <ThemeProvider>
      <RouterProvider />
    </ThemeProvider>
  );
}
```

#### Pages Layer
Композиция виджетов:

```typescript
// pages/chat/ui/ChatPage.tsx
import { ChatContainer } from '@/widgets/chat-container';
import './ChatPage.scss';

export function ChatPage() {
  return (
    <div className="chat-page">
      <header className="chat-page__header">
        <h1>LLM Chat</h1>
      </header>
      <main className="chat-page__content">
        <ChatContainer />
      </main>
    </div>
  );
}
```

#### Widgets Layer
Композиция фич:

```typescript
// widgets/chat-container/ui/ChatContainer.tsx
import { MessageList } from '@/entities/message';
import { SendMessageButton } from '@/features/send-message';
import { ChatInput } from '@/features/send-message';

export function ChatContainer() {
  return (
    <div className="chat-container">
      <MessageList />
      <div className="chat-container__input">
        <ChatInput />
        <SendMessageButton />
      </div>
    </div>
  );
}
```

#### Features Layer
Бизнес-логика:

```typescript
// features/send-message/model/useSendMessage.ts
import { useLLMStream } from '@/shared/lib/hooks/useLLMStream';
import { useChatStore } from '@/entities/message';

export function useSendMessage() {
  const { addMessage, updateMessage } = useChatStore();
  const { stream, isStreaming, error } = useLLMStream();

  const sendMessage = async (content: string) => {
    // Добавляем сообщение пользователя
    addMessage({ role: 'user', content });

    // Создаем пустое сообщение ассистента
    const assistantId = addMessage({ 
      role: 'assistant', 
      content: '',
      isStreaming: true,
    });

    // Стримим ответ
    await stream({
      endpoint: '/api/chat/stream',
      messages: [{ role: 'user', content }],
      onToken: (token) => {
        updateMessage(assistantId, (prev) => prev + token);
      },
    });
  };

  return { sendMessage, isStreaming, error };
}
```

### Shared vs Business

**Shared** — переиспользуемый код без бизнес-логики:
- UI-компоненты (Button, Input)
- Утилиты (formatDate, truncate)
- Хуки (useDebounce, useLocalStorage)
- API клиенты

**Business (Features/Entities)** — специфичная логика:
- Сущности домена (Message, User)
- Бизнес-процессы (SendMessage, StreamingResponse)
- State management для конкретных фич

---

## Запуск примеров

Полная инструкция: [examples/README.md](../../examples/README.md)

### Быстрый старт

```bash
# 1. Установка зависимостей
cd examples
npm install

# 2. Настройка переменных окружения
cp .env.example .env
# Отредактируйте .env и добавьте свой OPENAI_API_KEY

# 3. Запуск backend
cd backend
npm run dev

# 4. В новом терминале — запуск frontend
cd frontend
npm run dev

# 5. Откройте http://localhost:5173
```

### Переменные окружения

```bash
# .env
OPENAI_API_KEY=sk-...
PORT=3001
NODE_ENV=development

# Frontend (.env)
VITE_API_URL=http://localhost:3001
```

### Тестирование

```bash
# Проверка backend
curl http://localhost:3001/health

# Тест streaming endpoint
curl -X POST http://localhost:3001/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello!"}]}'
```

---

## Дополнительные примеры

### Интеграция с RAG

```typescript
// features/rag-search/model/useRAGSearch.ts
import { useLLMStream } from '@/shared/lib/hooks/useLLMStream';

export function useRAGSearch() {
  const { stream, content, sources } = useLLMStream();

  const search = async (query: string) => {
    await stream({
      endpoint: '/api/rag/search',
      body: { query },
      onComplete: (data) => {
        // data включает sources
        console.log('Sources:', data.sources);
      },
    });
  };

  return { search, content, sources };
}
```

### Moderation Hook

```typescript
// shared/lib/hooks/useModeration.ts
import { useState } from 'react';

interface ModerationResult {
  safe: boolean;
  categories: string[];
}

export function useModeration() {
  const [isChecking, setIsChecking] = useState(false);

  const checkContent = async (text: string): Promise<ModerationResult> => {
    setIsChecking(true);
    
    try {
      const response = await fetch('/api/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      return await response.json();
    } finally {
      setIsChecking(false);
    }
  };

  return { checkContent, isChecking };
}
```

### Rate Limit Display

```typescript
// widgets/rate-limit-indicator/ui/RateLimitIndicator.tsx
import { useEffect, useState } from 'react';

export function RateLimitIndicator() {
  const [limits, setLimits] = useState({ used: 0, limit: 100 });

  useEffect(() => {
    const fetchLimits = async () => {
      const response = await fetch('/api/user/limits');
      const data = await response.json();
      setLimits(data);
    };

    fetchLimits();
    const interval = setInterval(fetchLimits, 60000); // Каждую минуту

    return () => clearInterval(interval);
  }, []);

  const percentage = (limits.used / limits.limit) * 100;

  return (
    <div className="rate-limit">
      <span>{limits.used} / {limits.limit} запросов</span>
      <div className="rate-limit__bar">
        <div 
          className="rate-limit__fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

---

## Best Practices

### 1. Типизация

Всегда используйте строгие типы:

```typescript
// ❌ Плохо
const sendMessage = async (message: any) => { ... };

// ✅ Хорошо
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

const sendMessage = async (message: Message): Promise<void> => { ... };
```

### 2. Разделение ответственности

```typescript
// ❌ Плохо: все в одном компоненте
function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  
  const handleSend = async () => {
    const response = await fetch('/api/chat', { ... });
    // ... много логики
  };

  return ( /* UI */ );
}

// ✅ Хорошо: разделение на слои
function ChatApp() {
  const { messages } = useChatStore();
  const { sendMessage } = useSendMessage();

  return <ChatContainer messages={messages} onSend={sendMessage} />;
}
```

### 3. Оптимизация рендеринга

```typescript
// Используйте React.memo для избежания лишних рендеров
export const Message = memo<MessageProps>(({ content }) => {
  return <div>{content}</div>;
});

// useCallback для стабильных ссылок
const handleSend = useCallback((message: string) => {
  sendMessage(message);
}, [sendMessage]);

// useMemo для тяжелых вычислений
const formattedMessages = useMemo(() => {
  return messages.map(formatMessage);
}, [messages]);
```

### 4. Error Boundaries

```typescript
// shared/ui/ErrorBoundary/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Что-то пошло не так</div>;
    }

    return this.props.children;
  }
}

// Использование
<ErrorBoundary fallback={<ErrorMessage />}>
  <ChatApp />
</ErrorBoundary>
```

---

## Полезные ссылки

### Документация
- [React 19 Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- [Feature-Sliced Design](https://feature-sliced.design/)

### Инструменты
- [Vite](https://vitejs.dev/) — build tool
- [ESLint](https://eslint.org/) — linting
- [Prettier](https://prettier.io/) — форматирование

### Примеры и шаблоны
- [Vercel AI SDK](https://sdk.vercel.ai/) — готовые компоненты для AI
- [ChatGPT Clone](https://github.com/topics/chatgpt-clone) — open source примеры

---

## Резюме главы

В этой главе вы получили:
- ✅ Готовые к использованию примеры кода
- ✅ Полнофункциональный чат с streaming
- ✅ Backend proxy с безопасностью
- ✅ Feature-Sliced Design структуру
- ✅ Best practices и рекомендации
- ✅ Инструкции по запуску

### Следующие шаги

1. **Запустите примеры** локально
2. **Экспериментируйте** с параметрами
3. **Добавьте функции**: RAG, moderation, history
4. **Оптимизируйте**: caching, batching, error handling
5. **Деплойте**: Vercel, Railway, Fly.io

---

## Заключение

Поздравляем! Вы завершили изучение учебника "LLM для фронтенда". Теперь у вас есть все знания и инструменты для создания production-ready приложений с интеграцией LLM.

### Что вы изучили

1. **Основы LLM** — токены, модели, контекстное окно
2. **Интеграция** — OpenAI, Anthropic, Cohere, локальные модели
3. **Streaming** — потоковая отдача и отзывчивый UI
4. **RAG** — расширение возможностей LLM с помощью знаний
5. **Архитектура** — надежные и масштабируемые решения
6. **UX** — паттерны для AI-интерфейсов
7. **Безопасность** — защита данных и соблюдение требований
8. **Практика** — готовые примеры на React 19 + TypeScript

### Куда двигаться дальше

- 🚀 **Создайте свой проект** используя полученные знания
- 📚 **Углубите знания** в конкретных областях (RAG, fine-tuning)
- 🤝 **Участвуйте** в open source LLM проектах
- 💬 **Делитесь опытом** с сообществом

**Удачи в создании AI-приложений!** 🎉

---

[⬅️ Глава 7: Безопасность](./07-security.md) | [🏠 На главную](../../README.md) | [📑 Оглавление](../TOC.md)
