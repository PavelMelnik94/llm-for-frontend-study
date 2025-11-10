# Глава 3: Streaming и потоковая отдача

[⬅️ Предыдущая глава](./02-integration.md) | [🏠 На главную](../README.md) | [📑 Оглавление](../TOC.md) | [➡️ Следующая глава](./04-rag.md)

---

## Зачем нужен streaming

**Streaming** (потоковая отдача) позволяет отображать ответ LLM постепенно, токен за токеном, вместо ожидания полного ответа.

### Преимущества streaming

- **Лучший UX**: пользователь видит прогресс сразу
- **Снижение воспринимаемой задержки**: кажется быстрее
- **Возможность отмены**: можно остановить до получения полного ответа
- **Интерактивность**: пользователь может начать читать ответ

### Сравнение

**Без streaming:**
```
Пользователь → [Ожидание 10 секунд...] → Полный ответ
```

**Со streaming:**
```
Пользователь → [Здра][вствуй][те!][ Я][ могу][ помочь]...
                ↑ Видно сразу
```

---

## Server-Sent Events (SSE)

**SSE** — это стандарт для однонаправленной потоковой передачи данных от сервера к клиенту через HTTP.

### Как работает SSE

```
Client → HTTP Request → Server
Client ← Event Stream ← Server (keeps connection open)
       ← data: chunk1
       ← data: chunk2
       ← data: chunk3
       ← [connection closed]
```

### Реализация на сервере

```typescript
// backend/server.ts
import express from 'express';
import OpenAI from 'openai';

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/api/chat/stream', async (req, res) => {
  const { messages } = req.body;

  // Устанавливаем заголовки для SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: messages,
      stream: true, // Включаем streaming
    });

    // Отправляем токены по мере получения
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        // Формат SSE: "data: ...\n\n"
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Сигнал окончания
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error) {
    console.error('Streaming error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
    res.end();
  }
});

app.listen(3001);
```

### Реализация на клиенте

```typescript
// src/shared/api/llm/streamingApi.ts

interface StreamMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface StreamOptions {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
  signal?: AbortSignal; // Для отмены
}

export async function streamChat(
  messages: StreamMessage[],
  options: StreamOptions
): Promise<void> {
  const { onToken, onComplete, onError, signal } = options;
  let fullText = '';

  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
      signal, // Передаем для возможности отмены
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is null');
    }

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      // Декодируем chunk
      const chunk = decoder.decode(value, { stream: true });
      
      // Обрабатываем SSE формат
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6); // Убираем "data: "
          
          if (data === '[DONE]') {
            onComplete(fullText);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullText += parsed.content;
              onToken(parsed.content);
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            // Игнорируем невалидный JSON
          }
        }
      }
    }

    onComplete(fullText);
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Unknown error'));
  }
}
```

### Использование в React

```typescript
// src/features/chat/ui/ChatInput.tsx
import { useState } from 'react';
import { streamChat } from '@/shared/api/llm/streamingApi';

export function ChatInput() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const handleSubmit = async () => {
    if (!input.trim()) return;

    setIsStreaming(true);
    setResponse('');

    const controller = new AbortController();
    setAbortController(controller);

    await streamChat(
      [{ role: 'user', content: input }],
      {
        onToken: (token) => {
          setResponse(prev => prev + token);
        },
        onComplete: (fullText) => {
          setIsStreaming(false);
          console.log('Stream complete:', fullText);
        },
        onError: (error) => {
          setIsStreaming(false);
          console.error('Stream error:', error);
        },
        signal: controller.signal,
      }
    );
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
      setIsStreaming(false);
    }
  };

  return (
    <div>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={isStreaming}
      />
      
      {isStreaming ? (
        <button onClick={handleCancel}>Отменить</button>
      ) : (
        <button onClick={handleSubmit}>Отправить</button>
      )}

      {response && (
        <div className="response">
          {response}
          {isStreaming && <span className="cursor">▋</span>}
        </div>
      )}
    </div>
  );
}
```

---

## ReadableStream API

Современный способ работы с потоками через Fetch API.

### Fetch с streaming

```typescript
async function streamWithReadableStream(
  messages: StreamMessage[],
  onChunk: (text: string) => void
): Promise<string> {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
    onChunk(chunk);
  }

  return fullText;
}
```

### Chunked Transfer Encoding

```typescript
// Backend с ReadableStream
app.post('/api/chat/stream', async (req, res) => {
  const { messages } = req.body;

  const stream = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: messages,
    stream: true,
  });

  // Создаем ReadableStream
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            controller.enqueue(content);
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  // Отправляем stream
  const nodeStream = Readable.from(readableStream);
  nodeStream.pipe(res);
});
```

### Парсинг потока

```typescript
interface StreamParser {
  parse(chunk: string): string[];
}

class SSEParser implements StreamParser {
  private buffer = '';

  parse(chunk: string): string[] {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    
    // Последняя строка может быть неполной
    this.buffer = lines.pop() || '';
    
    const messages: string[] = [];
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data !== '[DONE]') {
          messages.push(data);
        }
      }
    }
    
    return messages;
  }

  flush(): string[] {
    if (this.buffer) {
      const result = this.parse('\n');
      this.buffer = '';
      return result;
    }
    return [];
  }
}

// Использование
const parser = new SSEParser();

reader.read().then(function process({ done, value }) {
  if (done) {
    const remaining = parser.flush();
    // Обработать оставшиеся сообщения
    return;
  }

  const chunk = decoder.decode(value);
  const messages = parser.parse(chunk);
  
  messages.forEach(msg => {
    const data = JSON.parse(msg);
    onToken(data.content);
  });

  return reader.read().then(process);
});
```

---

## WebSocket

WebSocket полезен для двусторонней коммуникации в реальном времени.

### Когда использовать WebSocket

✅ **Используйте WebSocket когда:**
- Нужна двусторонняя коммуникация
- Сервер должен инициировать отправку данных
- Множество мелких сообщений
- Постоянное соединение необходимо

❌ **Не используйте WebSocket когда:**
- Достаточно однонаправленного потока (используйте SSE)
- Простые запрос-ответ паттерны

### Реализация WebSocket сервера

```typescript
// backend/websocket-server.ts
import { WebSocketServer } from 'ws';
import OpenAI from 'openai';

const wss = new WebSocketServer({ port: 8080 });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (data) => {
    try {
      const { messages } = JSON.parse(data.toString());

      const stream = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: messages,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          ws.send(JSON.stringify({ type: 'token', content }));
        }
      }

      ws.send(JSON.stringify({ type: 'done' }));
    } catch (error) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: error.message 
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});
```

### WebSocket клиент

```typescript
// src/shared/api/llm/websocketClient.ts

export class LLMWebSocketClient {
  private ws: WebSocket | null = null;
  private messageQueue: any[] = [];

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        // Отправляем очередь сообщений
        this.messageQueue.forEach(msg => this.ws?.send(msg));
        this.messageQueue = [];
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
    });
  }

  async streamChat(
    messages: StreamMessage[],
    onToken: (token: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      this.ws!.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'token':
              onToken(data.content);
              break;
            case 'done':
              onComplete();
              resolve();
              break;
            case 'error':
              const error = new Error(data.message);
              onError(error);
              reject(error);
              break;
          }
        } catch (error) {
          reject(error);
        }
      };

      // Отправляем запрос
      this.ws!.send(JSON.stringify({ messages }));
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Использование
const client = new LLMWebSocketClient();
await client.connect('ws://localhost:8080');

await client.streamChat(
  [{ role: 'user', content: 'Hello!' }],
  (token) => console.log('Token:', token),
  () => console.log('Complete'),
  (error) => console.error('Error:', error)
);
```

---

## Token-by-token rendering

### Управление состоянием

```typescript
// src/features/chat/model/chatStore.ts
import { create } from 'zustand';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface ChatStore {
  messages: Message[];
  currentStreamingId: string | null;
  
  addMessage: (message: Omit<Message, 'id'>) => string;
  updateMessage: (id: string, content: string) => void;
  setStreaming: (id: string, isStreaming: boolean) => void;
  appendToMessage: (id: string, token: string) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  currentStreamingId: null,

  addMessage: (message) => {
    const id = `msg-${Date.now()}-${Math.random()}`;
    set((state) => ({
      messages: [...state.messages, { ...message, id }],
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

  setStreaming: (id, isStreaming) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, isStreaming } : msg
      ),
      currentStreamingId: isStreaming ? id : null,
    }));
  },

  appendToMessage: (id, token) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, content: msg.content + token } : msg
      ),
    }));
  },
}));
```

### Оптимизация рендеринга

```typescript
// src/features/chat/ui/Message.tsx
import { memo } from 'react';

interface MessageProps {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

// Используем React.memo для предотвращения лишних рендеров
export const Message = memo<MessageProps>(({ role, content, isStreaming }) => {
  return (
    <div className={`message message--${role}`}>
      <div className="message__content">
        {content}
        {isStreaming && <span className="message__cursor">▋</span>}
      </div>
    </div>
  );
});

Message.displayName = 'Message';
```

### React 19 и Suspense

React 19 улучшает работу с асинхронными операциями:

```typescript
// src/features/chat/ui/ChatContainer.tsx
import { Suspense, use } from 'react';

interface ChatProps {
  messagePromise: Promise<Message[]>;
}

function ChatMessages({ messagePromise }: ChatProps) {
  // use() - новый хук React 19 для работы с промисами
  const messages = use(messagePromise);

  return (
    <div className="chat-messages">
      {messages.map((msg) => (
        <Message key={msg.id} {...msg} />
      ))}
    </div>
  );
}

export function ChatContainer() {
  const [messagePromise] = useState(() => loadMessages());

  return (
    <Suspense fallback={<ChatSkeleton />}>
      <ChatMessages messagePromise={messagePromise} />
    </Suspense>
  );
}
```

---

## Обработка ошибок

### Reconnection strategies

```typescript
interface ReconnectOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

class StreamingClient {
  private retryCount = 0;
  private retryDelay = 1000;

  constructor(private options: ReconnectOptions) {}

  async streamWithRetry(
    messages: StreamMessage[],
    callbacks: StreamOptions
  ): Promise<void> {
    try {
      await streamChat(messages, callbacks);
      this.retryCount = 0; // Сброс при успехе
    } catch (error) {
      if (this.retryCount < this.options.maxRetries) {
        this.retryCount++;
        
        // Exponential backoff
        const delay = Math.min(
          this.retryDelay * Math.pow(this.options.backoffMultiplier, this.retryCount),
          this.options.maxDelay
        );

        console.log(`Retry ${this.retryCount}/${this.options.maxRetries} after ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.streamWithRetry(messages, callbacks);
      }
      
      // Исчерпаны попытки
      callbacks.onError(new Error('Max retries exceeded'));
    }
  }
}

// Использование
const client = new StreamingClient({
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
});
```

### Timeout handling

```typescript
async function streamWithTimeout(
  messages: StreamMessage[],
  options: StreamOptions,
  timeoutMs: number
): Promise<void> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Stream timeout')), timeoutMs);
  });

  const streamPromise = streamChat(messages, options);

  try {
    await Promise.race([streamPromise, timeoutPromise]);
  } catch (error) {
    options.onError(error instanceof Error ? error : new Error('Unknown error'));
  }
}

// Использование с таймаутом 30 секунд
await streamWithTimeout(
  messages,
  {
    onToken: (token) => console.log(token),
    onComplete: (text) => console.log('Done:', text),
    onError: (error) => console.error(error),
  },
  30000
);
```

### Cancellation

```typescript
function useStreamingChat() {
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const startStream = async (messages: StreamMessage[]) => {
    // Отменяем предыдущий stream если есть
    if (abortController) {
      abortController.abort();
    }

    const controller = new AbortController();
    setAbortController(controller);

    try {
      await streamChat(messages, {
        onToken: (token) => {
          // Обработка токенов
        },
        onComplete: (text) => {
          setAbortController(null);
        },
        onError: (error) => {
          if (error.name === 'AbortError') {
            console.log('Stream cancelled');
          } else {
            console.error('Stream error:', error);
          }
          setAbortController(null);
        },
        signal: controller.signal,
      });
    } catch (error) {
      // Обработка ошибок
    }
  };

  const cancelStream = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
  };

  return { startStream, cancelStream, isStreaming: abortController !== null };
}
```

---

## Best practices

### 1. Используйте debouncing для частых обновлений

```typescript
import { useMemo, useCallback } from 'react';

function useDebounce(callback: (value: string) => void, delay: number) {
  const debouncedFn = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (value: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => callback(value), delay);
    };
  }, [callback, delay]);

  return debouncedFn;
}

// Использование
function StreamingMessage() {
  const [displayText, setDisplayText] = useState('');
  
  const updateDisplay = useDebounce((text: string) => {
    // Тяжелая операция (например, синтаксическая подсветка)
    const highlighted = highlightCode(text);
    setDisplayText(highlighted);
  }, 100);

  return <div dangerouslySetInnerHTML={{ __html: displayText }} />;
}
```

### 2. Buffering для плавности

```typescript
class TokenBuffer {
  private buffer: string[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(
    private onFlush: (tokens: string) => void,
    private flushIntervalMs: number = 50
  ) {}

  add(token: string): void {
    this.buffer.push(token);
    
    if (!this.flushInterval) {
      this.flushInterval = setInterval(() => {
        this.flush();
      }, this.flushIntervalMs);
    }
  }

  flush(): void {
    if (this.buffer.length > 0) {
      const tokens = this.buffer.join('');
      this.buffer = [];
      this.onFlush(tokens);
    }
  }

  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush(); // Последний flush
  }
}

// Использование
const buffer = new TokenBuffer(
  (tokens) => setResponse(prev => prev + tokens),
  50 // Flush каждые 50ms
);

streamChat(messages, {
  onToken: (token) => buffer.add(token),
  onComplete: () => buffer.stop(),
  onError: () => buffer.stop(),
});
```

### 3. Индикаторы прогресса

```typescript
interface StreamingIndicatorProps {
  isStreaming: boolean;
  estimatedTokens?: number;
  currentTokens?: number;
}

export function StreamingIndicator({
  isStreaming,
  estimatedTokens,
  currentTokens,
}: StreamingIndicatorProps) {
  const progress = estimatedTokens && currentTokens
    ? (currentTokens / estimatedTokens) * 100
    : undefined;

  if (!isStreaming) return null;

  return (
    <div className="streaming-indicator">
      <div className="streaming-indicator__pulse" />
      <span>Генерация ответа...</span>
      {progress !== undefined && (
        <div className="streaming-indicator__progress">
          <div 
            className="streaming-indicator__progress-bar"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
```

### 4. Graceful degradation

```typescript
async function adaptiveStreaming(
  messages: StreamMessage[],
  onUpdate: (text: string) => void
): Promise<string> {
  // Проверяем поддержку streaming
  const supportsStreaming = 'ReadableStream' in window;

  if (supportsStreaming) {
    // Используем streaming
    let fullText = '';
    await streamChat(messages, {
      onToken: (token) => {
        fullText += token;
        onUpdate(fullText);
      },
      onComplete: () => {},
      onError: (error) => {
        console.error('Streaming failed, falling back to non-streaming', error);
        // Fallback к обычному запросу
      },
    });
    return fullText;
  } else {
    // Fallback для старых браузеров
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    const data = await response.json();
    onUpdate(data.message);
    return data.message;
  }
}
```

---

## Полезные ссылки

### Спецификации и стандарты
- [Server-Sent Events (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [ReadableStream API](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

### Библиотеки
- [Vercel AI SDK](https://sdk.vercel.ai/) - удобные утилиты для streaming
- [OpenAI Streaming](https://platform.openai.com/docs/api-reference/streaming)
- [eventsource-parser](https://www.npmjs.com/package/eventsource-parser)

---

## Резюме главы

В этой главе вы узнали:
- ✅ Почему streaming улучшает UX
- ✅ Как реализовать SSE на сервере и клиенте
- ✅ Как работать с ReadableStream API
- ✅ Когда использовать WebSocket
- ✅ Как оптимизировать token-by-token rendering
- ✅ Best practices для обработки ошибок и отмены

### Что дальше?

В следующей главе мы изучим RAG (Retrieval-Augmented Generation) — как обогатить ответы LLM знаниями из внешних источников.

---

[⬅️ Глава 2: Интеграция](./02-integration.md) | [🏠 На главную](../README.md) | [📑 Оглавление](../TOC.md) | [➡️ Глава 4: RAG](./04-rag.md)
