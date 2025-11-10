/**
 * Backend Proxy Server для LLM API
 * 
 * Возможности:
 * - SSE streaming от OpenAI к клиенту
 * - Безопасное хранение API ключей
 * - Rate limiting
 * - Input validation
 * - Error handling
 * - CORS поддержка
 * 
 * Стек:
 * - Node.js + Express
 * - TypeScript
 * - OpenAI SDK
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import OpenAI from 'openai';

// Загружаем переменные окружения
dotenv.config();

/* ============================================================================
 * Configuration
 * ========================================================================= */

const app = express();
const PORT = process.env.PORT || 3001;

// Инициализация OpenAI клиента
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ============================================================================
 * Middleware
 * ========================================================================= */

// CORS - разрешаем запросы с frontend
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// JSON parser
app.use(express.json({ limit: '10mb' }));

// Rate limiting - защита от DDoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // макс 100 запросов с одного IP
  message: {
    error: 'Too many requests from this IP, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/* ============================================================================
 * Types
 * ========================================================================= */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

/* ============================================================================
 * Validation
 * ========================================================================= */

/**
 * Валидация сообщений
 */
function validateMessages(messages: any): messages is ChatMessage[] {
  if (!Array.isArray(messages)) {
    return false;
  }

  if (messages.length === 0 || messages.length > 50) {
    return false;
  }

  return messages.every(
    (msg) =>
      msg &&
      typeof msg === 'object' &&
      ['system', 'user', 'assistant'].includes(msg.role) &&
      typeof msg.content === 'string' &&
      msg.content.length > 0 &&
      msg.content.length <= 10000
  );
}

/**
 * Проверка на prompt injection
 */
function checkPromptInjection(text: string): boolean {
  const dangerousPatterns = [
    /ignore\s+(previous|all|above)\s+(instructions|prompts|rules)/i,
    /disregard\s+all/i,
    /you\s+are\s+now/i,
    /новые\s+инструкции/i,
    /<\|im_start\|>/i,
    /\[SYSTEM\]/i,
  ];

  return dangerousPatterns.some((pattern) => pattern.test(text));
}

/**
 * Валидация запроса
 */
function validateChatRequest(body: any): body is ChatRequest {
  if (!body || typeof body !== 'object') {
    return false;
  }

  if (!validateMessages(body.messages)) {
    return false;
  }

  // Проверка на prompt injection
  for (const msg of body.messages) {
    if (checkPromptInjection(msg.content)) {
      return false;
    }
  }

  return true;
}

/* ============================================================================
 * Routes
 * ========================================================================= */

/**
 * Health Check
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Обычный Chat Completion (без streaming)
 */
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    // Валидация
    if (!validateChatRequest(req.body)) {
      return res.status(400).json({
        error: 'Invalid request format or potentially malicious content',
      });
    }

    const { messages, model = 'gpt-4-turbo-preview', temperature = 0.7 } = req.body;

    // Вызов OpenAI API
    const completion = await openai.chat.completions.create({
      model: model,
      messages: messages,
      temperature: temperature,
      max_tokens: 1000,
    });

    const response = completion.choices[0].message.content || '';

    res.json({
      message: response,
      usage: completion.usage,
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    
    res.status(500).json({
      error: 'Failed to generate response',
      message: error.message || 'Unknown error',
    });
  }
});

/**
 * Streaming Chat Completion
 */
app.post('/api/chat/stream', async (req: Request, res: Response) => {
  try {
    // Валидация
    if (!validateChatRequest(req.body)) {
      return res.status(400).json({
        error: 'Invalid request format or potentially malicious content',
      });
    }

    const {
      messages,
      model = 'gpt-4-turbo-preview',
      temperature = 0.7,
      max_tokens = 2000,
    } = req.body;

    // Устанавливаем заголовки для SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Для CORS
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');

    // Создаем streaming запрос к OpenAI
    const stream = await openai.chat.completions.create({
      model: model,
      messages: messages,
      temperature: temperature,
      max_tokens: max_tokens,
      stream: true,
    });

    // Отправляем токены по мере получения
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;

      if (content) {
        // Формат SSE: "data: {JSON}\n\n"
        const data = JSON.stringify({ content });
        res.write(`data: ${data}\n\n`);
      }

      // Проверяем, не закрыл ли клиент соединение
      if (res.writableEnded) {
        break;
      }
    }

    // Отправляем сигнал завершения
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Streaming error:', error);

    // Отправляем ошибку в формате SSE
    const errorData = JSON.stringify({
      error: 'Stream failed',
      message: error.message || 'Unknown error',
    });
    res.write(`data: ${errorData}\n\n`);
    res.end();
  }
});

/**
 * OpenAI Moderation API
 */
app.post('/api/moderation', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Invalid text' });
    }

    const moderation = await openai.moderations.create({
      input: text,
    });

    const result = moderation.results[0];

    res.json({
      safe: !result.flagged,
      categories: result.categories,
      category_scores: result.category_scores,
    });
  } catch (error: any) {
    console.error('Moderation error:', error);
    res.status(500).json({
      error: 'Moderation failed',
      message: error.message,
    });
  }
});

/* ============================================================================
 * Error Handling
 * ========================================================================= */

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

/* ============================================================================
 * Server Start
 * ========================================================================= */

const server = app.listen(PORT, () => {
  console.log('🚀 Server started');
  console.log(`📡 Listening on http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Missing'}`);
});

/* ============================================================================
 * Graceful Shutdown
 * ========================================================================= */

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully...');
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server gracefully...');
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Обработка необработанных промисов
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;
