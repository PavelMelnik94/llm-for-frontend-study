# 📑 Оглавление

## Навигация по учебнику

[🏠 На главную](./README.md)

---

## Глава 1: Основы LLM

**[📖 Перейти к главе](./chapters/01-basics.md)**

- [1.1 Что такое LLM](./chapters/01-basics.md#что-такое-llm)
- [1.2 Токены и токенизация](./chapters/01-basics.md#токены-и-токенизация)
  - 1.2.1 Как работает токенизация
  - 1.2.2 Подсчет токенов
  - 1.2.3 Влияние на стоимость
- [1.3 Контекстное окно](./chapters/01-basics.md#контекстное-окно)
  - 1.3.1 Размеры контекстного окна
  - 1.3.2 Управление контекстом
  - 1.3.3 Стратегии оптимизации
- [1.4 Семейства моделей](./chapters/01-basics.md#семейства-моделей)
  - 1.4.1 OpenAI GPT (GPT-4, GPT-4 Turbo, GPT-3.5)
  - 1.4.2 Anthropic Claude (Claude 3 Opus, Sonnet, Haiku)
  - 1.4.3 Meta Llama (Llama 2, Llama 3)
  - 1.4.4 Mistral AI
  - 1.4.5 Google Gemini
- [1.5 Локальные и Edge модели](./chapters/01-basics.md#локальные-и-edge-модели)
  - 1.5.1 Когда использовать локальные модели
  - 1.5.2 Ollama
  - 1.5.3 WebLLM
  - 1.5.4 Transformers.js

---

## Глава 2: Интеграция через API

**[📖 Перейти к главе](./chapters/02-integration.md)**

- [2.1 OpenAI API](./chapters/02-integration.md#openai-api)
  - 2.1.1 Установка SDK
  - 2.1.2 Аутентификация
  - 2.1.3 Базовый запрос
  - 2.1.4 Параметры запроса
- [2.2 Anthropic Claude API](./chapters/02-integration.md#anthropic-claude-api)
  - 2.2.1 Установка SDK
  - 2.2.2 Работа с API
  - 2.2.3 Особенности Claude
- [2.3 Cohere API](./chapters/02-integration.md#cohere-api)
  - 2.3.1 Установка и настройка
  - 2.3.2 Generate и Chat endpoints
- [2.4 Локальные инстансы](./chapters/02-integration.md#локальные-инстансы)
  - 2.4.1 Ollama
  - 2.4.2 Replicate
  - 2.4.3 Локальный запуск моделей
- [2.5 Аутентификация и безопасность](./chapters/02-integration.md#аутентификация-и-безопасность)
  - 2.5.1 Хранение API ключей
  - 2.5.2 Environment variables
  - 2.5.3 Proxy для скрытия ключей
- [2.6 CORS и прокси](./chapters/02-integration.md#cors-и-прокси)
  - 2.6.1 Проблема CORS
  - 2.6.2 Backend proxy
  - 2.6.3 Serverless functions
- [2.7 Примеры кода](./chapters/02-integration.md#примеры-кода)

---

## Глава 3: Streaming и потоковая отдача

**[📖 Перейти к главе](./chapters/03-streaming.md)**

- [3.1 Зачем нужен streaming](./chapters/03-streaming.md#зачем-нужен-streaming)
- [3.2 Server-Sent Events (SSE)](./chapters/03-streaming.md#server-sent-events-sse)
  - 3.2.1 Как работает SSE
  - 3.2.2 Реализация на сервере
  - 3.2.3 Реализация на клиенте
- [3.3 ReadableStream API](./chapters/03-streaming.md#readablestream-api)
  - 3.3.1 Fetch API с streaming
  - 3.3.2 Chunked transfer encoding
  - 3.3.3 Парсинг потока
- [3.4 WebSocket](./chapters/03-streaming.md#websocket)
  - 3.4.1 Когда использовать WebSocket
  - 3.4.2 Двусторонняя коммуникация
- [3.5 Token-by-token rendering](./chapters/03-streaming.md#token-by-token-rendering)
  - 3.5.1 Управление состоянием
  - 3.5.2 Оптимизация рендеринга
  - 3.5.3 React 19 и Suspense
- [3.6 Обработка ошибок](./chapters/03-streaming.md#обработка-ошибок)
  - 3.6.1 Reconnection strategies
  - 3.6.2 Timeout handling
  - 3.6.3 Cancellation
- [3.7 Best practices](./chapters/03-streaming.md#best-practices)

---

## Глава 4: RAG (Retrieval-Augmented Generation)

**[📖 Перейти к главе](./chapters/04-rag.md)**

- [4.1 Что такое RAG](./chapters/04-rag.md#что-такое-rag)
  - 4.1.1 Проблема hallucinations
  - 4.1.2 Как RAG решает проблему
- [4.2 Эмбеддинги](./chapters/04-rag.md#эмбеддинги)
  - 4.2.1 Что такое embeddings
  - 4.2.2 OpenAI Embeddings API
  - 4.2.3 Альтернативные модели
- [4.3 Векторные базы данных](./chapters/04-rag.md#векторные-базы-данных)
  - 4.3.1 Pinecone
  - 4.3.2 Weaviate
  - 4.3.3 Milvus
  - 4.3.4 Сравнение решений
- [4.4 Семантический поиск](./chapters/04-rag.md#семантический-поиск)
  - 4.4.1 Cosine similarity
  - 4.4.2 Гибридный поиск
  - 4.4.3 Фильтрация и метаданные
- [4.5 LangChain.js](./chapters/04-rag.md#langchainjs)
  - 4.5.1 Установка и настройка
  - 4.5.2 Document loaders
  - 4.5.3 Text splitters
  - 4.5.4 Chains и agents
- [4.6 LlamaIndex.TS](./chapters/04-rag.md#llamaindexts)
  - 4.6.1 Когда использовать LlamaIndex
  - 4.6.2 Индексирование документов
- [4.7 Provenance и источники](./chapters/04-rag.md#provenance-и-источники)
  - 4.7.1 Хранение метаданных
  - 4.7.2 Отображение источников в UI
  - 4.7.3 Citation patterns
- [4.8 Примеры интеграции](./chapters/04-rag.md#примеры-интеграции)

---

## Глава 5: Архитектурные решения

**[📖 Перейти к главе](./chapters/05-architecture.md)**

- [5.1 Backend Proxy vs Direct Client](./chapters/05-architecture.md#backend-proxy-vs-direct-client)
  - 5.1.1 Backend Proxy (рекомендуется)
  - 5.1.2 Direct Client
  - 5.1.3 Сравнение подходов
- [5.2 Разделение ответственности](./chapters/05-architecture.md#разделение-ответственности)
  - 5.2.1 Что хранить на сервере
  - 5.2.2 Что хранить на клиенте
  - 5.2.3 Feature-Sliced Design
- [5.3 Модерация контента](./chapters/05-architecture.md#модерация-контента)
  - 5.3.1 Input moderation
  - 5.3.2 Output filtering
  - 5.3.3 OpenAI Moderation API
- [5.4 Кэширование](./chapters/05-architecture.md#кэширование)
  - 5.4.1 Кэширование запросов
  - 5.4.2 Кэширование эмбеддингов
  - 5.4.3 CDN и edge caching
- [5.5 Rate Limiting и Billing](./chapters/05-architecture.md#rate-limiting-и-billing)
  - 5.5.1 User rate limits
  - 5.5.2 Cost tracking
  - 5.5.3 Budget alerts
- [5.6 Error Handling](./chapters/05-architecture.md#error-handling)
  - 5.6.1 Retry strategies
  - 5.6.2 Exponential backoff
  - 5.6.3 Circuit breaker pattern
- [5.7 Batching](./chapters/05-architecture.md#batching)
  - 5.7.1 Когда использовать batching
  - 5.7.2 Реализация
- [5.8 Масштабирование](./chapters/05-architecture.md#масштабирование)

---

## Глава 6: UX-паттерны для AI

**[📖 Перейти к главе](./chapters/06-ux.md)**

- [6.1 Streaming UI](./chapters/06-ux.md#streaming-ui)
  - 6.1.1 Incremental rendering
  - 6.1.2 Typing indicators
  - 6.1.3 Progressive enhancement
- [6.2 История и навигация](./chapters/06-ux.md#история-и-навигация)
  - 6.2.1 Сохранение истории
  - 6.2.2 Навигация по чату
  - 6.2.3 Поиск в истории
- [6.3 Undo/Edit/Regenerate](./chapters/06-ux.md#undoeditregenerate)
  - 6.3.1 Редактирование промптов
  - 6.3.2 Регенерация ответов
  - 6.3.3 Branching conversations
- [6.4 Rate Limit Indicators](./chapters/06-ux.md#rate-limit-indicators)
  - 6.4.1 Отображение лимитов
  - 6.4.2 Прогресс-бары
  - 6.4.3 Уведомления
- [6.5 Preview и Confirmation](./chapters/06-ux.md#preview-и-confirmation)
  - 6.5.1 Preview перед отправкой
  - 6.5.2 Подтверждение действий
  - 6.5.3 Cost estimates
- [6.6 Attribution](./chapters/06-ux.md#attribution)
  - 6.6.1 Отображение источников
  - 6.6.2 Ссылки на документы
  - 6.6.3 Confidence scores
- [6.7 Accessibility](./chapters/06-ux.md#accessibility)
  - 6.7.1 Клавиатурная навигация
  - 6.7.2 Screen readers
  - 6.7.3 Голосовой ввод
- [6.8 Prompt Design в UI](./chapters/06-ux.md#prompt-design-в-ui)
  - 6.8.1 Placeholder текст
  - 6.8.2 Примеры промптов
  - 6.8.3 Templates
- [6.9 Loading States](./chapters/06-ux.md#loading-states)
  - 6.9.1 Skeleton screens
  - 6.9.2 Progress indicators
  - 6.9.3 Estimated time

---

## Глава 7: Безопасность и конфиденциальность

**[📖 Перейти к главе](./chapters/07-security.md)**

- [7.1 PII и персональные данные](./chapters/07-security.md#pii-и-персональные-данные)
  - 7.1.1 Что такое PII
  - 7.1.2 Обнаружение PII
  - 7.1.3 Анонимизация
- [7.2 GDPR и законодательство](./chapters/07-security.md#gdpr-и-законодательство)
  - 7.2.1 Требования GDPR
  - 7.2.2 Right to be forgotten
  - 7.2.3 Data residency
- [7.3 Модерация контента](./chapters/07-security.md#модерация-контента)
  - 7.3.1 Input validation
  - 7.3.2 Output filtering
  - 7.3.3 Prompt injection защита
- [7.4 Защита API ключей](./chapters/07-security.md#защита-api-ключей)
  - 7.4.1 Environment variables
  - 7.4.2 Secret management
  - 7.4.3 Key rotation
- [7.5 Throttling и DDoS](./chapters/07-security.md#throttling-и-ddos)
  - 7.5.1 Rate limiting
  - 7.5.2 CAPTCHA
  - 7.5.3 IP whitelisting
- [7.6 Billing и Cost Control](./chapters/07-security.md#billing-и-cost-control)
  - 7.6.1 Budget limits
  - 7.6.2 Usage monitoring
  - 7.6.3 Alerts
- [7.7 Логирование и аудит](./chapters/07-security.md#логирование-и-аудит)
  - 7.7.1 Что логировать
  - 7.7.2 Retention policies
  - 7.7.3 Audit trails
- [7.8 Аутентификация](./chapters/07-security.md#аутентификация)
  - 7.8.1 SSO интеграция
  - 7.8.2 2FA
  - 7.8.3 Session management
- [7.9 Безопасное хранение](./chapters/07-security.md#безопасное-хранение)
  - 7.9.1 Шифрование в покое
  - 7.9.2 Шифрование в транзите
  - 7.9.3 Backup strategies

---

## Глава 8: Практические примеры

**[📖 Перейти к главе](./chapters/08-practical-examples.md)**

- [8.1 Обзор примеров](./chapters/08-practical-examples.md#обзор-примеров)
- [8.2 useLLMStream Hook](./chapters/08-practical-examples.md#usellmstream-hook)
  - 8.2.1 Архитектура хука
  - 8.2.2 TypeScript типы
  - 8.2.3 Управление streaming
  - 8.2.4 Обработка ошибок
  - [📄 Исходный код](../examples/hooks/useLLMStream.ts)
- [8.3 Чат-компонент](./chapters/08-practical-examples.md#чат-компонент)
  - 8.3.1 Структура компонента
  - 8.3.2 State management с Zustand
  - 8.3.3 Incremental rendering
  - 8.3.4 История сообщений
  - [📄 ChatApp.tsx](../examples/Chat/ChatApp.tsx)
  - [📄 Chat.scss](../examples/Chat/Chat.scss)
- [8.4 Backend Proxy](./chapters/08-practical-examples.md#backend-proxy)
  - 8.4.1 Express сервер
  - 8.4.2 SSE streaming
  - 8.4.3 Безопасность
  - 8.4.4 Error handling
  - [📄 server.ts](../examples/backend/server.ts)
- [8.5 Feature-Sliced Design](./chapters/08-practical-examples.md#feature-sliced-design)
  - 8.5.1 Структура проекта
  - 8.5.2 Разделение слоев
  - 8.5.3 Shared vs Business
- [8.6 Запуск примеров](./chapters/08-practical-examples.md#запуск-примеров)
  - [📖 Полная инструкция](../examples/README.md)

---

## Приложения

### [📦 Примеры кода](../examples/)
- [useLLMStream Hook](../examples/hooks/useLLMStream.ts)
- [Chat Component](../examples/Chat/)
- [Backend Server](../examples/backend/)
- [Инструкции по запуску](../examples/README.md)

### [📊 Диаграммы](../assets/diagrams/)
- [Архитектура системы](../assets/diagrams/architecture.svg)
- [Контекстное окно](../assets/diagrams/context-window.svg)

### [🤝 Участие](../CONTRIBUTING.md)
- Как внести вклад
- Стиль кода
- Процесс PR

---

## Быстрая навигация

| Раздел | Описание |
|--------|----------|
| [Глава 1](./chapters/01-basics.md) | Основы LLM: токены, модели, контекст |
| [Глава 2](./chapters/02-integration.md) | Интеграция API: OpenAI, Claude, Cohere |
| [Глава 3](./chapters/03-streaming.md) | Streaming: SSE, WebSocket, token rendering |
| [Глава 4](./chapters/04-rag.md) | RAG: эмбеддинги, векторный поиск |
| [Глава 5](./chapters/05-architecture.md) | Архитектура: proxy, кэширование, scaling |
| [Глава 6](./chapters/06-ux.md) | UX: паттерны, accessibility, промпты |
| [Глава 7](./chapters/07-security.md) | Безопасность: PII, GDPR, модерация |
| [Глава 8](./chapters/08-practical-examples.md) | Практика: React 19, TypeScript, примеры |

---

[🏠 Вернуться на главную](./README.md) | [▶️ Начать с Главы 1](./chapters/01-basics.md)
