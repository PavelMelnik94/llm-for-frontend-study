# Глава 5: Архитектурные решения

[⬅️ Предыдущая глава](./04-rag.md) | [🏠 На главную](../../README.md) | [📑 Оглавление](../TOC.md) | [➡️ Следующая глава](./06-ux.md)

---

## Backend Proxy vs Direct Client

### Backend Proxy (рекомендуется)

```
Frontend → Backend Proxy → LLM API
         (публичный)    (приватный)
```

**Преимущества:**
- ✅ API ключи защищены
- ✅ Контроль доступа и rate limiting
- ✅ Логирование и мониторинг
- ✅ Модерация контента
- ✅ Cost control

**Недостатки:**
- ❌ Дополнительная инфраструктура
- ❌ Возможная latency
- ❌ Сложность deployment

```typescript
// Backend (Express)
app.post('/api/chat', authenticateUser, async (req, res) => {
  const { messages } = req.body;
  const userId = req.user.id;

  // Проверяем лимиты пользователя
  if (await isRateLimited(userId)) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  // Модерация входящего контента
  const isClean = await moderateContent(messages);
  if (!isClean) {
    return res.status(400).json({ error: 'Content moderation failed' });
  }

  // Вызываем LLM API
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: messages,
  });

  // Логирование и billing
  await logUsage(userId, response.usage);

  res.json({ message: response.choices[0].message.content });
});
```

### Direct Client

```
Frontend → LLM API
         (с API ключом)
```

**⚠️ Не рекомендуется для production!**

**Возможно только для:**
- Прототипы и MVP
- Локальные модели (Ollama)
- Serverless functions с edge runtime

---

## Разделение ответственности

### Что хранить на сервере

**Backend (Node.js/Express):**
- API ключи и секреты
- Аутентификация и авторизация
- Rate limiting logic
- Модерация контента
- Billing и usage tracking
- Персистентные данные (история, user preferences)
- Векторные БД (embeddings)

### Что хранить на клиенте

**Frontend (React):**
- UI состояние
- Текущая сессия чата
- Локальные настройки (theme, layout)
- Временный cache

### Feature-Sliced Design

```
src/
├── app/                    # Инициализация приложения
│   ├── providers/
│   └── App.tsx
├── pages/                  # Страницы
│   └── chat/
│       └── ChatPage.tsx
├── widgets/                # Крупные UI блоки
│   └── chat-container/
│       ├── ui/
│       └── model/
├── features/               # Фичи (business logic)
│   ├── send-message/
│   │   ├── ui/
│   │   ├── model/
│   │   └── api/
│   └── rag-search/
│       ├── ui/
│       ├── model/
│       └── api/
├── entities/               # Бизнес-сущности
│   ├── message/
│   │   ├── ui/
│   │   └── model/
│   └── user/
│       ├── ui/
│       └── model/
└── shared/                 # Переиспользуемый код
    ├── api/
    │   ├── llm/
    │   └── base.ts
    ├── ui/
    │   ├── Button/
    │   └── Input/
    ├── lib/
    │   └── hooks/
    └── config/
```

**Пример структуры фичи:**

```typescript
// src/features/send-message/api/sendMessageApi.ts
export async function sendMessage(content: string) {
  return fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: content }),
  }).then(res => res.json());
}

// src/features/send-message/model/useSendMessage.ts
import { useMutation } from '@tanstack/react-query';
import { sendMessage } from '../api/sendMessageApi';

export function useSendMessage() {
  return useMutation({
    mutationFn: sendMessage,
    onSuccess: (data) => {
      // Обновление состояния
    },
  });
}

// src/features/send-message/ui/SendMessageButton.tsx
import { useSendMessage } from '../model/useSendMessage';

export function SendMessageButton({ message }: { message: string }) {
  const { mutate, isPending } = useSendMessage();
  
  return (
    <button onClick={() => mutate(message)} disabled={isPending}>
      Отправить
    </button>
  );
}
```

---

## Модерация контента

### Input Moderation

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function moderateInput(text: string): Promise<{
  safe: boolean;
  categories: string[];
}> {
  const moderation = await openai.moderations.create({
    input: text,
  });

  const result = moderation.results[0];
  
  const flaggedCategories = Object.entries(result.categories)
    .filter(([_, flagged]) => flagged)
    .map(([category]) => category);

  return {
    safe: !result.flagged,
    categories: flaggedCategories,
  };
}

// Использование в endpoint
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  const moderation = await moderateInput(message);
  
  if (!moderation.safe) {
    return res.status(400).json({
      error: 'Content policy violation',
      categories: moderation.categories,
    });
  }

  // Продолжаем обработку...
});
```

### Output Filtering

```typescript
// Фильтрация нежелательного контента в ответах
const BLOCKED_PATTERNS = [
  /api[_-]?key/i,
  /password/i,
  /secret/i,
  // Добавьте свои паттерны
];

function filterOutput(text: string): string {
  let filtered = text;
  
  for (const pattern of BLOCKED_PATTERNS) {
    filtered = filtered.replace(pattern, '[REDACTED]');
  }
  
  return filtered;
}
```

### OpenAI Moderation API

```typescript
interface ModerationResult {
  flagged: boolean;
  categories: {
    hate: boolean;
    'hate/threatening': boolean;
    'self-harm': boolean;
    sexual: boolean;
    'sexual/minors': boolean;
    violence: boolean;
    'violence/graphic': boolean;
  };
  category_scores: {
    [key: string]: number;
  };
}

async function checkContent(text: string): Promise<ModerationResult> {
  const response = await openai.moderations.create({ input: text });
  return response.results[0];
}
```

---

## Кэширование

### Кэширование запросов

```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ 
  stdTTL: 3600, // 1 час
  checkperiod: 120,
});

async function cachedCompletion(
  messages: ChatMessage[],
  options: any
): Promise<string> {
  // Создаем ключ на основе входных данных
  const cacheKey = createCacheKey(messages, options);
  
  // Проверяем cache
  const cached = cache.get<string>(cacheKey);
  if (cached) {
    return cached;
  }

  // Выполняем запрос
  const response = await openai.chat.completions.create({
    model: options.model || 'gpt-4-turbo-preview',
    messages: messages,
  });

  const result = response.choices[0].message.content || '';
  
  // Сохраняем в cache
  cache.set(cacheKey, result);
  
  return result;
}

function createCacheKey(messages: ChatMessage[], options: any): string {
  const data = { messages, options };
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
}
```

### Кэширование эмбеддингов

```typescript
// Эмбеддинги дорогие и редко меняются - кэшируем агрессивно
const embeddingCache = new NodeCache({ stdTTL: 86400 * 7 }); // 7 дней

async function getCachedEmbedding(text: string): Promise<number[]> {
  const cacheKey = `emb:${crypto
    .createHash('md5')
    .update(text)
    .digest('hex')}`;
  
  const cached = embeddingCache.get<number[]>(cacheKey);
  if (cached) return cached;

  const embedding = await getEmbedding(text);
  embeddingCache.set(cacheKey, embedding);
  
  return embedding;
}
```

### CDN и Edge Caching

```typescript
// Vercel Edge Functions
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  // Edge cache
  const cacheKey = `llm:${query}`;
  const cached = await caches.default.match(cacheKey);
  
  if (cached) {
    return cached;
  }

  const response = await generateResponse(query);
  
  // Кэшируем на 1 час
  const newResponse = new Response(response, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
  
  await caches.default.put(cacheKey, newResponse.clone());
  
  return newResponse;
}
```

---

## Rate Limiting и Billing

### User Rate Limits

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Базовый rate limiter
const limiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:',
  }),
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // макс 100 запросов
  message: 'Too many requests, please try again later',
});

app.use('/api/', limiter);

// Продвинутый rate limiting с тарифами
interface UserTier {
  name: string;
  requestsPerHour: number;
  tokensPerDay: number;
}

const TIERS: Record<string, UserTier> = {
  free: { name: 'Free', requestsPerHour: 10, tokensPerDay: 10000 },
  pro: { name: 'Pro', requestsPerHour: 100, tokensPerDay: 100000 },
  enterprise: { name: 'Enterprise', requestsPerHour: 1000, tokensPerDay: 1000000 },
};

async function checkUserLimits(
  userId: string,
  tier: string
): Promise<{ allowed: boolean; remaining: number }> {
  const userTier = TIERS[tier];
  
  // Проверяем запросы в час
  const requestKey = `rl:requests:${userId}:${getCurrentHour()}`;
  const requests = await redis.incr(requestKey);
  await redis.expire(requestKey, 3600);

  if (requests > userTier.requestsPerHour) {
    return { allowed: false, remaining: 0 };
  }

  // Проверяем токены в день
  const tokenKey = `rl:tokens:${userId}:${getCurrentDay()}`;
  const tokens = parseInt(await redis.get(tokenKey) || '0');

  if (tokens > userTier.tokensPerDay) {
    return { allowed: false, remaining: 0 };
  }

  return {
    allowed: true,
    remaining: userTier.requestsPerHour - requests,
  };
}
```

### Cost Tracking

```typescript
interface UsageLog {
  userId: string;
  timestamp: Date;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
}

const TOKEN_COSTS = {
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
};

function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const costs = TOKEN_COSTS[model];
  if (!costs) return 0;

  return (
    (promptTokens / 1000) * costs.input +
    (completionTokens / 1000) * costs.output
  );
}

async function logUsage(
  userId: string,
  model: string,
  usage: { prompt_tokens: number; completion_tokens: number }
): Promise<void> {
  const cost = calculateCost(
    model,
    usage.prompt_tokens,
    usage.completion_tokens
  );

  const log: UsageLog = {
    userId,
    timestamp: new Date(),
    model,
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.prompt_tokens + usage.completion_tokens,
    cost,
  };

  // Сохраняем в БД
  await db.usageLogs.create(log);

  // Обновляем счетчик токенов пользователя
  const tokenKey = `rl:tokens:${userId}:${getCurrentDay()}`;
  await redis.incrby(tokenKey, log.totalTokens);
  await redis.expire(tokenKey, 86400);
}
```

### Budget Alerts

```typescript
async function checkBudgetAlert(userId: string): Promise<void> {
  const today = getCurrentDay();
  const usage = await db.usageLogs.aggregate([
    {
      $match: {
        userId,
        timestamp: { $gte: new Date(today) },
      },
    },
    {
      $group: {
        _id: null,
        totalCost: { $sum: '$cost' },
        totalTokens: { $sum: '$totalTokens' },
      },
    },
  ]);

  const totalCost = usage[0]?.totalCost || 0;
  const user = await db.users.findOne({ _id: userId });
  const budget = user.dailyBudget || 10; // $10 по умолчанию

  if (totalCost >= budget * 0.8) {
    // 80% от бюджета
    await sendAlert(userId, {
      type: 'budget_warning',
      message: `You've used 80% of your daily budget ($${totalCost.toFixed(2)} / $${budget})`,
    });
  }

  if (totalCost >= budget) {
    // Превышен бюджет
    await disableUserAccess(userId);
    await sendAlert(userId, {
      type: 'budget_exceeded',
      message: `Daily budget exceeded. Access temporarily disabled.`,
    });
  }
}
```

---

## Error Handling

### Retry Strategies

```typescript
interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'rate_limit_exceeded',
    'server_error',
  ],
};

async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error;
  let delay = config.initialDelay;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      const isRetryable = config.retryableErrors.some(
        err => lastError.message.includes(err)
      );

      if (!isRetryable || attempt === config.maxRetries) {
        throw lastError;
      }

      console.log(`Retry attempt ${attempt + 1}/${config.maxRetries} after ${delay}ms`);
      
      await sleep(delay);
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
    }
  }

  throw lastError!;
}

// Использование
const response = await withRetry(() =>
  openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: messages,
  })
);
```

### Exponential Backoff

```typescript
class ExponentialBackoff {
  private attempt = 0;

  constructor(
    private config = {
      initialDelay: 1000,
      maxDelay: 32000,
      factor: 2,
      jitter: true,
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    try {
      const result = await fn();
      this.attempt = 0; // Reset on success
      return result;
    } catch (error) {
      this.attempt++;
      const delay = this.calculateDelay();
      
      console.log(`Backing off for ${delay}ms (attempt ${this.attempt})`);
      await sleep(delay);
      
      return this.execute(fn);
    }
  }

  private calculateDelay(): number {
    const delay = Math.min(
      this.config.initialDelay * Math.pow(this.config.factor, this.attempt - 1),
      this.config.maxDelay
    );

    // Добавляем jitter для избежания thundering herd
    if (this.config.jitter) {
      return delay * (0.5 + Math.random() * 0.5);
    }

    return delay;
  }
}
```

### Circuit Breaker Pattern

```typescript
enum CircuitState {
  CLOSED = 'CLOSED',   // Нормальная работа
  OPEN = 'OPEN',       // Сломано, не пропускаем запросы
  HALF_OPEN = 'HALF_OPEN', // Проверяем, починилось ли
}

class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = Date.now();

  constructor(
    private config = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 1 минута
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.timeout;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Использование
const breaker = new CircuitBreaker();

try {
  const response = await breaker.execute(() =>
    openai.chat.completions.create({ ... })
  );
} catch (error) {
  if (error.message === 'Circuit breaker is OPEN') {
    // Используем fallback или кэш
  }
}
```

---

## Batching

### Когда использовать batching

✅ **Используйте batching для:**
- Генерация эмбеддингов для множества текстов
- Модерация большого количества сообщений
- Batch inference для аналитики

```typescript
async function batchEmbeddings(texts: string[]): Promise<number[][]> {
  const BATCH_SIZE = 2048; // OpenAI лимит
  const batches: string[][] = [];
  
  // Разбиваем на батчи
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    batches.push(texts.slice(i, i + BATCH_SIZE));
  }

  // Обрабатываем параллельно
  const results = await Promise.all(
    batches.map(async (batch) => {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
      });
      return response.data.map(d => d.embedding);
    })
  );

  // Объединяем результаты
  return results.flat();
}

// Использование
const documents = ['text1', 'text2', ..., 'text1000'];
const embeddings = await batchEmbeddings(documents);
```

### Rate-limited batching

```typescript
class RateLimitedBatcher<T, R> {
  private queue: Array<{
    item: T;
    resolve: (value: R) => void;
    reject: (error: Error) => void;
  }> = [];
  private processing = false;

  constructor(
    private batchFn: (items: T[]) => Promise<R[]>,
    private config = {
      batchSize: 50,
      batchDelay: 100,
      maxConcurrent: 5,
    }
  ) {}

  async add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject });
      
      if (!this.processing) {
        this.process();
      }
    });
  }

  private async process(): Promise<void> {
    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.config.batchSize);
      
      try {
        const results = await this.batchFn(
          batch.map(b => b.item)
        );
        
        batch.forEach((b, i) => b.resolve(results[i]));
      } catch (error) {
        batch.forEach(b => b.reject(error as Error));
      }

      // Пауза между батчами
      if (this.queue.length > 0) {
        await sleep(this.config.batchDelay);
      }
    }

    this.processing = false;
  }
}

// Использование
const batcher = new RateLimitedBatcher(
  async (texts: string[]) => {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });
    return response.data.map(d => d.embedding);
  }
);

// Добавляем в очередь (автоматически батчится)
const embedding1 = await batcher.add('text 1');
const embedding2 = await batcher.add('text 2');
```

---

## Масштабирование

### Горизонтальное масштабирование

```typescript
// Используйте Redis для shared state между инстансами
import Redis from 'ioredis';
import { Queue } from 'bullmq';

const redis = new Redis(process.env.REDIS_URL);

// Очередь для асинхронной обработки
const llmQueue = new Queue('llm-jobs', {
  connection: redis,
});

// Worker (может быть на отдельном сервере)
const worker = new Worker('llm-jobs', async (job) => {
  const { messages, userId } = job.data;
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: messages,
  });

  // Сохраняем результат
  await saveResponse(userId, response);
  
  return response;
}, {
  connection: redis,
  concurrency: 10, // Параллельная обработка
});

// API endpoint добавляет в очередь
app.post('/api/chat', async (req, res) => {
  const job = await llmQueue.add('chat', {
    messages: req.body.messages,
    userId: req.user.id,
  });

  res.json({ jobId: job.id });
});

// Endpoint для проверки статуса
app.get('/api/jobs/:id', async (req, res) => {
  const job = await llmQueue.getJob(req.params.id);
  res.json({
    status: await job.getState(),
    result: await job.returnvalue,
  });
});
```

### Load Balancing

```typescript
// Распределение нагрузки между провайдерами
class LoadBalancer {
  private providers = [
    { name: 'openai', weight: 70, available: true },
    { name: 'anthropic', weight: 30, available: true },
  ];

  selectProvider(): string {
    const available = this.providers.filter(p => p.available);
    const totalWeight = available.reduce((sum, p) => sum + p.weight, 0);
    
    let random = Math.random() * totalWeight;
    
    for (const provider of available) {
      random -= provider.weight;
      if (random <= 0) {
        return provider.name;
      }
    }

    return available[0].name;
  }

  markUnavailable(name: string): void {
    const provider = this.providers.find(p => p.name === name);
    if (provider) {
      provider.available = false;
      
      // Восстанавливаем через минуту
      setTimeout(() => {
        provider.available = true;
      }, 60000);
    }
  }
}
```

---

## Резюме главы

В этой главе вы узнали:
- ✅ Почему нужен backend proxy (безопасность, контроль)
- ✅ Как организовать архитектуру по Feature-Sliced Design
- ✅ Модерация контента и защита от abuse
- ✅ Кэширование для оптимизации и снижения затрат
- ✅ Rate limiting и cost tracking
- ✅ Retry strategies и Circuit Breaker
- ✅ Batching и масштабирование

### Что дальше?

В следующей главе мы рассмотрим UX-паттерны для создания удобных AI-интерфейсов.

---

[⬅️ Глава 4: RAG](./04-rag.md) | [🏠 На главную](../../README.md) | [📑 Оглавление](../TOC.md) | [➡️ Глава 6: UX](./06-ux.md)
