# LLM для фронтенда / LLM for Frontend

<div align="center">

[🇷🇺 Русский](./README.md) | [🇬🇧 English](#english-version)

</div>

---

## 🇷🇺 Русская версия

Полная документация доступна в [README.md](./README.md)

### Основные разделы:
- [Введение](./README.md#-введение)
- [План учебника](./README.md#️-план-учебника)
- [Технологический стек](./README.md#️-технологический-стек)
- [Примеры кода](./README.md#-примеры-кода)

---

## 🇬🇧 English Version

### LLM for Frontend: Complete Guide

A comprehensive tutorial for integrating Large Language Models (LLM) into frontend applications. This guide is specifically designed for frontend developers working with React 19 and TypeScript, covering all aspects of working with LLM—from basic concepts to production-ready solutions.

> 📝 **Note:** Main documentation is in Russian. English translation is in progress.

### 🎯 What is this?

This is the **most comprehensive Russian-language tutorial** on integrating large language models (LLM) into frontend applications. It includes:

- ✅ Complete guide in Russian
- ✅ Latest 2025 technologies
- ✅ Practical code examples
- ✅ From basics to advanced
- ✅ Production-ready solutions
- ✅ Open source

### 👥 Who is this for?

- **Frontend Developers** with React and TypeScript experience
- **Full-stack Developers** wanting to deepen their LLM knowledge
- **Product Managers** wanting to understand LLM capabilities and limitations

### 📖 What you'll learn

- 🧠 **LLM Basics**: tokens, context window, models and their features
- 🔌 **API Integration**: working with OpenAI, Anthropic, Cohere, and local models
- 🌊 **Streaming**: streaming responses and UI implementation
- 📚 **RAG**: Retrieval-Augmented Generation, vector search, and databases
- 🏗️ **Architecture**: design patterns and best practices
- 🎨 **UX Design**: design patterns for AI interfaces
- 🔒 **Security**: data protection, moderation, and GDPR
- 💻 **Practice**: ready-to-use code examples with React 19 + TypeScript

### 🛠️ Tech Stack

- **React 19** — latest version with improved hooks and Suspense
- **TypeScript** — strict typing without `any`
- **Zustand** — lightweight state management
- **SCSS** — powerful CSS preprocessor
- **Feature-Sliced Design** — architectural methodology
- **Vite** — fast build tool

### 🗺️ Tutorial Chapters

1. **[LLM Basics](./docs/chapters/01-basics.md)** (🇷🇺)
   - What is LLM and how it works
   - Tokens and tokenization
   - Context window
   - Model families: GPT, Claude, Llama, Mistral
   - Local and edge models

2. **[API Integration](./docs/chapters/02-integration.md)** (🇷🇺)
   - OpenAI API (GPT-4, GPT-4 Turbo)
   - Anthropic Claude API
   - Cohere API
   - Local instances (Ollama, Replicate)
   - Authentication and security

3. **[Streaming](./docs/chapters/03-streaming.md)** (🇷🇺)
   - Server-Sent Events (SSE)
   - ReadableStream
   - WebSocket
   - Token-by-token rendering in React
   - Error handling

4. **[RAG (Retrieval-Augmented Generation)](./docs/chapters/04-rag.md)** (🇷🇺)
   - Embeddings and vector representations
   - Vector databases (Pinecone, Weaviate, Milvus)
   - Semantic search
   - LangChain.js and LlamaIndex
   - Knowledge base construction

5. **[Architecture](./docs/chapters/05-architecture.md)** (🇷🇺)
   - Backend Proxy vs Direct Client
   - Content moderation
   - Caching strategies
   - Rate limiting
   - Error handling
   - Feature-Sliced Design

6. **[UX Patterns](./docs/chapters/06-ux.md)** (🇷🇺)
   - Streaming UI patterns
   - Conversation history
   - Undo/Edit/Regenerate flows
   - Accessibility
   - Prompt design in UI

7. **[Security](./docs/chapters/07-security.md)** (🇷🇺)
   - PII (Personally Identifiable Information)
   - GDPR compliance
   - Content moderation
   - API key protection
   - Secure history storage

8. **[Practical Examples](./docs/chapters/08-practical-examples.md)** (🇷🇺)
   - Custom hook `useLLMStream`
   - Chat component with React 19
   - Backend proxy with Node.js
   - State management with Zustand

### 📦 Code Examples

All examples are available in the [`examples/`](./examples/) directory:

- **Hooks**: `useLLMStream` — universal hook for streaming
- **Components**: chat interface with incremental rendering
- **Backend**: Express server with LLM API proxy
- **Styles**: SCSS modules and theming

### 🚀 Getting Started

1. Clone the repository:
```bash
git clone https://github.com/PavelMelnik94/llm-for-frontend-study.git
cd llm-for-frontend-study
```

2. Explore the documentation:
   - Start with [Table of Contents](./docs/TOC.md)
   - Or jump to [Chapter 1: LLM Basics](./docs/chapters/01-basics.md)

3. Try the examples:
```bash
cd examples
# Follow instructions in examples/README.md
```

### 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) for details.

### 📝 License

This tutorial is distributed under the MIT License. See [LICENSE](./LICENSE) file.

### ⭐ Support the Project

If you find this tutorial helpful:

- ⭐ Star the repository
- 🔀 Fork it for your experiments
- 📢 Share with colleagues and on social media
- 🐛 Report bugs via [Issues](https://github.com/PavelMelnik94/llm-for-frontend-study/issues)
- 💡 Suggest improvements via [Pull Requests](./CONTRIBUTING.md)

### 🔗 Links

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [LangChain.js](https://js.langchain.com/)
- [React 19 Documentation](https://react.dev/)

### 🏷️ Keywords

`LLM`, `Large Language Models`, `GPT-4`, `Claude`, `OpenAI`, `Anthropic`, `React`, `TypeScript`, `Frontend`, `Tutorial`, `RAG`, `Streaming`, `Chatbot`, `AI`, `Machine Learning`, `JavaScript`, `API Integration`, `Education`, `Russian`, `Учебник`

---

<div align="center">
  <sub>Built with ❤️ for the developer community</sub>
  <br>
  <sub>Author: <a href="https://github.com/PavelMelnik94">Pavel Melnik</a></sub>
</div>
