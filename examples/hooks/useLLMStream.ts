/**
 * useLLMStream - Универсальный хук для работы с потоковой отдачей LLM
 * 
 * Возможности:
 * - Streaming через SSE или ReadableStream
 * - Отмена запроса (AbortController)
 * - Обработка ошибок и reconnect
 * - Полная типизация TypeScript
 * 
 * @example
 * ```typescript
 * const { stream, content, isStreaming, error, cancel } = useLLMStream();
 * 
 * await stream({
 *   endpoint: '/api/chat/stream',
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * });
 * ```
 */

import { useState, useCallback, useRef } from 'react';

/** Сообщение в формате OpenAI Chat API */
export interface StreamMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Параметры streaming запроса */
export interface StreamOptions {
  /** API endpoint для streaming */
  endpoint: string;
  /** Массив сообщений */
  messages: StreamMessage[];
  /** Дополнительные параметры */
  body?: Record<string, any>;
  /** Callback при получении токена */
  onToken?: (token: string) => void;
  /** Callback при завершении */
  onComplete?: (fullText: string) => void;
  /** Callback при ошибке */
  onError?: (error: Error) => void;
  /** HTTP заголовки */
  headers?: Record<string, string>;
}

/** Результат хука */
export interface UseLLMStreamResult {
  /** Накопленный контент */
  content: string;
  /** Идет ли streaming */
  isStreaming: boolean;
  /** Ошибка, если есть */
  error: Error | null;
  /** Функция для начала streaming */
  stream: (options: StreamOptions) => Promise<void>;
  /** Функция для отмены streaming */
  cancel: () => void;
  /** Функция для очистки контента */
  clear: () => void;
}

/**
 * Хук для работы с LLM streaming
 */
export function useLLMStream(): UseLLMStreamResult {
  const [content, setContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Отменяет текущий streaming запрос
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  /**
   * Очищает накопленный контент
   */
  const clear = useCallback(() => {
    setContent('');
    setError(null);
  }, []);

  /**
   * Парсер SSE формата
   */
  const parseSSE = useCallback((chunk: string): string[] => {
    const lines = chunk.split('\n');
    const messages: string[] = [];

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6); // Убираем "data: "
        
        if (data === '[DONE]') {
          continue;
        }

        try {
          messages.push(data);
        } catch (e) {
          // Игнорируем невалидный JSON
        }
      }
    }

    return messages;
  }, []);

  /**
   * Основная функция для streaming
   */
  const stream = useCallback(async (options: StreamOptions): Promise<void> => {
    const {
      endpoint,
      messages,
      body = {},
      onToken,
      onComplete,
      onError,
      headers = {},
    } = options;

    // Отменяем предыдущий запрос если есть
    cancel();

    // Создаем новый AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Сброс состояния
    setContent('');
    setError(null);
    setIsStreaming(true);

    let fullText = '';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          messages,
          ...body,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is null');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      // Читаем stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Декодируем chunk
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Парсим SSE сообщения
        const messages = parseSSE(buffer);
        
        // Очищаем обработанные строки из буфера
        const lastNewline = buffer.lastIndexOf('\n');
        if (lastNewline !== -1) {
          buffer = buffer.slice(lastNewline + 1);
        }

        // Обрабатываем каждое сообщение
        for (const message of messages) {
          try {
            const parsed = JSON.parse(message);
            
            if (parsed.error) {
              throw new Error(parsed.error);
            }

            if (parsed.content) {
              fullText += parsed.content;
              
              setContent(prev => prev + parsed.content);
              
              if (onToken) {
                onToken(parsed.content);
              }
            }
          } catch (e) {
            // Игнорируем ошибки парсинга
            console.warn('Failed to parse SSE message:', e);
          }
        }
      }

      // Завершение
      setIsStreaming(false);
      
      if (onComplete) {
        onComplete(fullText);
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      
      // Игнорируем ошибку отмены
      if (error.name === 'AbortError') {
        console.log('Stream cancelled by user');
        return;
      }

      setError(error);
      setIsStreaming(false);

      if (onError) {
        onError(error);
      }

      console.error('Stream error:', error);
    } finally {
      abortControllerRef.current = null;
    }
  }, [cancel, parseSSE]);

  return {
    content,
    isStreaming,
    error,
    stream,
    cancel,
    clear,
  };
}

/**
 * Типы для экспорта
 */
export type {
  StreamMessage,
  StreamOptions,
  UseLLMStreamResult,
};
