# Глава 2: Интеграция через API

[⬅️ Предыдущая глава](./01-basics.md) | [🏠 На главную](../../README.md) | [📑 Оглавление](../TOC.md) | [➡️ Следующая глава](./03-streaming.md)

---

## Введение

В этой главе мы рассмотрим практическую интеграцию различных LLM API в фронтенд-приложение. Вы научитесь работать с OpenAI, Anthropic, Cohere и локальными инстансами.

---

## OpenAI API

### Установка SDK

```bash
# npm
npm install openai

# yarn
yarn add openai

# pnpm
pnpm add openai
```

### Аутентификация

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Никогда не храните ключи в коде!
  dangerouslyAllowBrowser: false, // Не используйте напрямую из браузера
});
```

**⚠️ Важно:** Никогда не используйте API ключи напрямую в браузере! Всегда используйте backend proxy.

### Базовый запрос

```typescript
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function generateCompletion(
  messages: ChatMessage[]
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: messages,
      temperature: 0.7, // Креативность (0-2)
      max_tokens: 1000, // Максимум токенов в ответе
      top_p: 1, // Nucleus sampling
      frequency_penalty: 0, // Штраф за повторения
      presence_penalty: 0, // Штраф за упоминание тем
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}

// Использование
const messages: ChatMessage[] = [
  { role: 'system', content: 'Ты helpful assistant для фронтенд-разработчиков' },
  { role: 'user', content: 'Объясни React.memo' },
];

const answer = await generateCompletion(messages);
```

### Параметры запроса

#### Temperature (0-2)
Контролирует случайность ответов:
- **0.0-0.3**: Детерминированные, фактические ответы
- **0.7-0.9**: Креативные, разнообразные ответы
- **1.5-2.0**: Очень креативные, иногда непредсказуемые

```typescript
// Для кода и фактов
const codeResponse = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: [{ role: 'user', content: 'Напиши функцию сортировки' }],
  temperature: 0.2, // Низкая температура для детерминизма
});

// Для креатива
const creativeResponse = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: [{ role: 'user', content: 'Придумай название для стартапа' }],
  temperature: 1.2, // Высокая для креативности
});
```

#### JSON Mode

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: [
    { role: 'system', content: 'Ты возвращаешь данные в JSON формате' },
    { role: 'user', content: 'Информация о React' }
  ],
  response_format: { type: 'json_object' },
});

const data = JSON.parse(response.choices[0].message.content);
```

#### Function Calling

```typescript
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Получить погоду для города',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'Название города' },
          units: { type: 'string', enum: ['celsius', 'fahrenheit'] },
        },
        required: ['city'],
      },
    },
  },
];

const response = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: [{ role: 'user', content: 'Какая погода в Москве?' }],
  tools: tools,
  tool_choice: 'auto',
});

// Если модель вызвала функцию
if (response.choices[0].message.tool_calls) {
  const toolCall = response.choices[0].message.tool_calls[0];
  const args = JSON.parse(toolCall.function.arguments);
  // Вызываем реальную функцию
  const weatherData = await getWeather(args.city);
}
```

---

## Anthropic Claude API

### Установка SDK

```bash
npm install @anthropic-ai/sdk
```

### Базовое использование

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function chatWithClaude(prompt: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 1024,
    messages: [
      { role: 'user', content: prompt }
    ],
  });

  return message.content[0].type === 'text' 
    ? message.content[0].text 
    : '';
}
```

### Особенности Claude

#### System Prompts

```typescript
const message = await anthropic.messages.create({
  model: 'claude-3-sonnet-20240229',
  max_tokens: 1024,
  system: 'Ты эксперт по TypeScript. Отвечай кратко и по делу.',
  messages: [
    { role: 'user', content: 'Что такое generics?' }
  ],
});
```

#### Thinking Tags

Claude может показывать свои рассуждения:

```typescript
const message = await anthropic.messages.create({
  model: 'claude-3-opus-20240229',
  max_tokens: 2048,
  messages: [
    { 
      role: 'user', 
      content: 'Реши задачу: <thinking>покажи рассуждения</thinking> 2x + 5 = 15' 
    }
  ],
});
```

---

## Cohere API

### Установка SDK

```bash
npm install cohere-ai
```

### Использование

```typescript
import { CohereClient } from 'cohere-ai';

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

async function generateWithCohere(prompt: string): Promise<string> {
  const response = await cohere.generate({
    model: 'command',
    prompt: prompt,
    max_tokens: 300,
    temperature: 0.9,
  });

  return response.generations[0].text;
}

// Chat API
async function chatWithCohere(message: string): Promise<string> {
  const response = await cohere.chat({
    message: message,
    model: 'command',
  });

  return response.text;
}
```

---

## Локальные инстансы

### Ollama

[Ollama](https://ollama.ai/) — самый простой способ запустить модели локально.

#### Установка

```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Скачайте с https://ollama.ai/download
```

#### Запуск модели

```bash
# Скачать и запустить Llama 3
ollama run llama3

# Список доступных моделей
ollama list

# Скачать модель без запуска
ollama pull mistral
```

#### API интеграция

```typescript
interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

async function chatWithOllama(
  messages: OllamaMessage[]
): Promise<string> {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3',
      messages: messages,
      stream: false,
    }),
  });

  const data = await response.json();
  return data.message.content;
}

// Использование
const response = await chatWithOllama([
  { role: 'user', content: 'Объясни замыкания в JavaScript' }
]);
```

### Replicate

[Replicate](https://replicate.com/) — платформа для запуска моделей через API.

```bash
npm install replicate
```

```typescript
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function runLlama(prompt: string): Promise<string> {
  const output = await replicate.run(
    'meta/llama-2-70b-chat:latest',
    {
      input: {
        prompt: prompt,
        max_length: 500,
      }
    }
  );

  return Array.isArray(output) ? output.join('') : String(output);
}
```

### Локальный запуск через llama.cpp

```bash
# Установка llama.cpp
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make

# Запуск сервера
./server -m models/llama-2-7b-chat.Q4_K_M.gguf --port 8080
```

```typescript
async function chatWithLocalLlama(prompt: string): Promise<string> {
  const response = await fetch('http://localhost:8080/completion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: prompt,
      n_predict: 400,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  return data.content;
}
```

---

## Аутентификация и безопасность

### Хранение API ключей

#### ❌ Никогда так не делайте

```typescript
// ПЛОХО: ключ в коде
const openai = new OpenAI({
  apiKey: 'sk-proj-abc123...',
});

// ПЛОХО: ключ в браузере
const apiKey = 'sk-proj-abc123...';
fetch(`https://api.openai.com/v1/chat/completions`, {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});
```

#### ✅ Правильный подход

**1. Environment Variables**

```bash
# .env
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
COHERE_API_KEY=...
```

```typescript
// .env.example (коммитим в репозиторий)
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
```

```typescript
// Backend (Node.js)
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

**2. Secret Management (Production)**

```typescript
// Используйте secret manager
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();

async function getSecret(name: string): Promise<string> {
  const [version] = await client.accessSecretVersion({
    name: `projects/my-project/secrets/${name}/versions/latest`,
  });
  return version.payload?.data?.toString() || '';
}

const apiKey = await getSecret('openai-api-key');
```

### Environment Variables

```typescript
// src/config/env.ts
interface Environment {
  openaiApiKey: string;
  anthropicApiKey: string;
  nodeEnv: 'development' | 'production' | 'test';
}

function validateEnv(): Environment {
  const required = ['OPENAI_API_KEY'];
  
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return {
    openaiApiKey: process.env.OPENAI_API_KEY!,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    nodeEnv: (process.env.NODE_ENV as any) || 'development',
  };
}

export const env = validateEnv();
```

### Proxy для скрытия ключей

Всегда используйте backend proxy между фронтендом и LLM API:

```
Frontend → Backend Proxy → LLM API
         (no API keys)    (API keys stored securely)
```

---

## CORS и прокси

### Проблема CORS

Многие LLM API не поддерживают прямые запросы из браузера из-за CORS:

```typescript
// ❌ Не работает из браузера
fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ ... }),
});
// Error: CORS policy blocked
```

### Backend Proxy

**Вариант 1: Express прокси**

```typescript
// backend/server.ts
import express from 'express';
import OpenAI from 'openai';

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: messages,
    });

    res.json({
      message: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3001, () => {
  console.log('Proxy server running on http://localhost:3001');
});
```

**Вариант 2: Next.js API Routes**

```typescript
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  const { messages } = await request.json();

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: messages,
    });

    return NextResponse.json({
      message: completion.choices[0].message.content,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
```

### Serverless Functions

**Vercel Functions**

```typescript
// api/chat.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: messages,
  });

  res.json({
    message: completion.choices[0].message.content,
  });
}
```

---

## Примеры кода

### Универсальный LLM клиент

```typescript
// src/shared/api/llm/llmClient.ts

type LLMProvider = 'openai' | 'anthropic' | 'cohere' | 'ollama';

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class LLMClient {
  constructor(
    private provider: LLMProvider,
    private apiKey?: string
  ) {}

  async chat(
    messages: LLMMessage[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<LLMResponse> {
    switch (this.provider) {
      case 'openai':
        return this.chatOpenAI(messages, options);
      case 'anthropic':
        return this.chatAnthropic(messages, options);
      case 'ollama':
        return this.chatOllama(messages, options);
      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  private async chatOpenAI(
    messages: LLMMessage[],
    options?: any
  ): Promise<LLMResponse> {
    const openai = new OpenAI({ apiKey: this.apiKey });
    
    const response = await openai.chat.completions.create({
      model: options?.model || 'gpt-4-turbo-preview',
      messages: messages,
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 1000,
    });

    return {
      content: response.choices[0].message.content || '',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }

  private async chatAnthropic(
    messages: LLMMessage[],
    options?: any
  ): Promise<LLMResponse> {
    // Реализация для Claude
    throw new Error('Not implemented');
  }

  private async chatOllama(
    messages: LLMMessage[],
    options?: any
  ): Promise<LLMResponse> {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options?.model || 'llama3',
        messages: messages,
        stream: false,
      }),
    });

    const data = await response.json();
    return {
      content: data.message.content,
    };
  }
}

// Использование
const client = new LLMClient('openai', process.env.OPENAI_API_KEY);
const response = await client.chat([
  { role: 'user', content: 'Hello!' }
]);
```

### Frontend запрос через прокси

```typescript
// src/shared/api/llm/chatApi.ts

interface ChatRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model?: string;
  temperature?: number;
}

interface ChatResponse {
  message: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export async function sendChatMessage(
  request: ChatRequest
): Promise<ChatResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send message');
  }

  return response.json();
}

// Использование в компоненте
import { sendChatMessage } from '@/shared/api/llm/chatApi';

async function handleSubmit(message: string) {
  try {
    const response = await sendChatMessage({
      messages: [
        { role: 'user', content: message }
      ],
    });
    
    console.log(response.message);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

---

## Полезные ссылки (2025)

### SDK и документация
- [OpenAI Node.js SDK](https://github.com/openai/openai-node) - официальный SDK
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript)
- [Cohere Node SDK](https://docs.cohere.com/docs/node-sdk)
- [Replicate SDK](https://github.com/replicate/replicate-javascript)

### API документация
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Anthropic API Docs](https://docs.anthropic.com/claude/reference)
- [Cohere API Docs](https://docs.cohere.com/reference/about)

### Локальные решения
- [Ollama](https://ollama.ai/) - запуск моделей локально
- [llama.cpp](https://github.com/ggerganov/llama.cpp) - C++ inference
- [Replicate](https://replicate.com/) - managed hosting

---

## Резюме главы

В этой главе вы узнали:
- ✅ Как интегрировать OpenAI, Anthropic, Cohere API
- ✅ Как работать с локальными моделями (Ollama, Replicate)
- ✅ Как правильно хранить и использовать API ключи
- ✅ Зачем нужен backend proxy и как его реализовать
- ✅ Как создать универсальный LLM клиент

### Что дальше?

В следующей главе мы изучим потоковую отдачу (streaming) — как реализовать отзывчивый UI с отображением ответа токен за токеном.

---

[⬅️ Глава 1: Основы LLM](./01-basics.md) | [🏠 На главную](../../README.md) | [📑 Оглавление](../TOC.md) | [➡️ Глава 3: Streaming](./03-streaming.md)
