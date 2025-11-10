# Практические примеры: LLM Chat Application

Готовые к использованию примеры кода для интеграции LLM в React приложение.

## 📦 Содержимое

- **hooks/** — переиспользуемые хуки
  - `useLLMStream.ts` — универсальный хук для streaming
- **Chat/** — компоненты чата
  - `ChatApp.tsx` — главный компонент
  - `Chat.scss` — стили
- **backend/** — Express сервер
  - `server.ts` — backend proxy с SSE streaming

## 🚀 Быстрый старт

### Требования

- Node.js 18+ 
- npm или yarn
- OpenAI API key

### 1. Установка Backend

```bash
cd examples/backend

# Установка зависимостей
npm install

# Или используйте yarn
yarn install
```

Создайте файл `.env`:

```bash
cp .env.example .env
```

Отредактируйте `.env` и добавьте свой API ключ:

```env
# .env
OPENAI_API_KEY=sk-proj-...
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

Запуск сервера:

```bash
# Development режим с hot reload
npm run dev

# Production режим
npm run build
npm start
```

Backend будет доступен на `http://localhost:3001`

### 2. Установка Frontend

```bash
cd examples/frontend

# Установка зависимостей
npm install
```

Создайте файл `.env`:

```bash
# .env
VITE_API_URL=http://localhost:3001
```

Запуск:

```bash
npm run dev
```

Frontend будет доступен на `http://localhost:5173`

## 📁 Структура проекта

```
examples/
├── hooks/
│   └── useLLMStream.ts          # Хук для streaming
├── Chat/
│   ├── ChatApp.tsx              # React компонент чата
│   └── Chat.scss                # Стили
├── backend/
│   ├── server.ts                # Express сервер
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
└── README.md                     # Эта инструкция
```

## 🔧 API Endpoints

### Health Check

```bash
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-10T12:00:00.000Z",
  "uptime": 3600
}
```

### Chat Completion (без streaming)

```bash
POST /api/chat
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "model": "gpt-4-turbo-preview",
  "temperature": 0.7
}
```

**Response:**
```json
{
  "message": "Hello! How can I help you today?",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

### Chat Completion (streaming)

```bash
POST /api/chat/stream
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "Write a poem" }
  ]
}
```

**Response (SSE):**
```
data: {"content":"Roses"}

data: {"content":" are"}

data: {"content":" red"}

data: [DONE]
```

### Moderation

```bash
POST /api/moderation
Content-Type: application/json

{
  "text": "Check this text for violations"
}
```

## 🧪 Тестирование

### Тест Health Check

```bash
curl http://localhost:3001/health
```

### Тест Chat API

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Say hello"}
    ]
  }'
```

### Тест Streaming

```bash
curl -X POST http://localhost:3001/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Count to 5"}
    ]
  }'
```

## 🔐 Безопасность

### API Keys

**⚠️ ВАЖНО:** Никогда не коммитьте `.env` файлы с реальными API ключами!

```bash
# Добавьте в .gitignore
.env
.env.local
.env.*.local
```

### Переменные окружения

Backend поддерживает следующие переменные:

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `OPENAI_API_KEY` | OpenAI API ключ | *обязательно* |
| `PORT` | Порт сервера | `3001` |
| `NODE_ENV` | Окружение | `development` |
| `FRONTEND_URL` | URL фронтенда для CORS | `http://localhost:5173` |

### Rate Limiting

Backend имеет встроенный rate limiting:
- **100 запросов** в 15 минут с одного IP
- Автоматическая защита от DDoS

### Input Validation

Все входящие данные валидируются:
- Проверка формата сообщений
- Ограничение длины (макс 10,000 символов)
- Обнаружение prompt injection

## 📊 Мониторинг

### Логи

Backend логирует:
- Все HTTP запросы
- Ошибки с stack trace
- API вызовы к OpenAI

```bash
# Просмотр логов
npm run dev

# Вывод:
# [2025-11-10T12:00:00.000Z] POST /api/chat/stream
# [2025-11-10T12:00:05.000Z] Stream completed successfully
```

### Метрики

Вы можете добавить интеграцию с:
- **Prometheus** — метрики
- **Grafana** — визуализация
- **Sentry** — мониторинг ошибок

## 🎨 Кастомизация

### Изменение модели

В `server.ts`:

```typescript
const model = 'gpt-4-turbo-preview'; // или gpt-3.5-turbo
```

### Настройка стилей

Все стили в `Chat.scss`. Переменные в начале файла:

```scss
$color-primary: #6366f1;
$color-secondary: #10b981;
$border-radius: 0.5rem;
```

### Добавление функций

1. **RAG Integration** — добавьте векторный поиск
2. **Auth** — добавьте аутентификацию
3. **History** — расширенная история диалогов
4. **Moderation** — автоматическая модерация

## 🐛 Отладка

### Проблемы с CORS

Если возникают ошибки CORS:

1. Проверьте `FRONTEND_URL` в `.env`
2. Убедитесь, что frontend запущен на правильном порту
3. Перезапустите backend

### Проблемы с API ключом

```bash
# Проверьте, установлен ли ключ
echo $OPENAI_API_KEY

# Проверьте в браузере console
# Должна быть ошибка 500, а не 401
```

### Streaming не работает

1. Проверьте browser console на ошибки
2. Проверьте network tab в DevTools
3. Убедитесь, что используется `text/event-stream`

## 📚 Дополнительные ресурсы

### Документация

- [OpenAI API Docs](https://platform.openai.com/docs)
- [React 19 Docs](https://react.dev/)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- [Express Docs](https://expressjs.com/)

### Примеры использования

**1. Чат с историей:**

```typescript
const { messages, addMessage } = useChatStore();

// Добавить сообщение
addMessage({ role: 'user', content: 'Hello!' });
```

**2. Streaming с callbacks:**

```typescript
const { stream } = useLLMStream();

await stream({
  endpoint: '/api/chat/stream',
  messages: [...],
  onToken: (token) => console.log('Token:', token),
  onComplete: (text) => console.log('Complete:', text),
  onError: (error) => console.error('Error:', error),
});
```

**3. Отмена запроса:**

```typescript
const { cancel, isStreaming } = useLLMStream();

if (isStreaming) {
  cancel();
}
```

## 🚀 Деплой

### Vercel (Frontend)

```bash
# Установите Vercel CLI
npm i -g vercel

# Деплой
cd examples/frontend
vercel
```

### Railway (Backend)

1. Создайте аккаунт на [Railway](https://railway.app/)
2. Подключите GitHub репозиторий
3. Добавьте переменные окружения
4. Railway автоматически задеплоит

### Fly.io (Backend)

```bash
# Установите Fly CLI
curl -L https://fly.io/install.sh | sh

# Деплой
cd examples/backend
fly launch
fly secrets set OPENAI_API_KEY=sk-...
fly deploy
```

## 🤝 Участие

Нашли баг или хотите улучшить примеры?

1. Fork репозитория
2. Создайте feature branch
3. Внесите изменения
4. Создайте Pull Request

См. [CONTRIBUTING.md](../../CONTRIBUTING.md) для деталей.

## 📝 Лицензия

MIT License. См. [LICENSE](../../LICENSE)

## ❓ FAQ

**Q: Можно ли использовать другую модель?**  
A: Да, измените `model` параметр в запросах. Поддерживаются все модели OpenAI Chat API.

**Q: Как добавить поддержку Claude или Cohere?**  
A: Добавьте соответствующие SDK и создайте новые endpoints в `server.ts`.

**Q: Сколько это стоит?**  
A: Зависит от использования. GPT-4 Turbo: $0.01/1K input tokens, $0.03/1K output tokens.

**Q: Как добавить аутентификацию?**  
A: Используйте JWT tokens или session middleware (express-session).

**Q: Можно ли запустить локально без OpenAI API?**  
A: Да, используйте Ollama или другие локальные модели. Измените `server.ts` для подключения к локальному API.

## 💬 Поддержка

Вопросы? Создайте [Issue](https://github.com/PavelMelnik94/llm-for-frontend-study/issues) в репозитории.

---

**Happy coding! 🎉**
