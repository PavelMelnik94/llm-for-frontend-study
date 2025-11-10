# Глава 4: RAG (Retrieval-Augmented Generation)

[⬅️ Предыдущая глава](./03-streaming.md) | [🏠 На главную](../README.md) | [📑 Оглавление](../TOC.md) | [➡️ Следующая глава](./05-architecture.md)

---

## Что такое RAG

**RAG (Retrieval-Augmented Generation)** — это техника, которая комбинирует поиск релевантной информации из базы знаний с генерацией ответов LLM.

### Проблема hallucinations

LLM иногда "галлюцинируют" — генерируют правдоподобно звучащую, но фактически неверную информацию:

```
Пользователь: Когда была основана компания Acme Corp?
LLM: Acme Corp была основана в 1985 году Джоном Смитом...
     ↑ Придумано, если нет данных в обучении
```

### Как RAG решает проблему

```
1. Запрос пользователя
   ↓
2. Векторный поиск релевантных документов
   ↓
3. Формирование промпта: Контекст + Вопрос
   ↓
4. LLM генерирует ответ на основе предоставленного контекста
   ↓
5. Ответ с ссылками на источники
```

**Преимущества:**
- ✅ Актуальная информация (не зависит от даты обучения модели)
- ✅ Контроль над источниками знаний
- ✅ Меньше галлюцинаций
- ✅ Возможность цитирования источников

---

## Эмбеддинги

### Что такое embeddings

**Эмбеддинги** — это векторное представление текста в многомерном пространстве. Семантически похожие тексты имеют близкие векторы.

```typescript
"кот сидит на дереве" → [0.2, 0.8, 0.3, ..., 0.6] // 1536 чисел
"собака лежит в траве" → [0.3, 0.7, 0.4, ..., 0.5] // похожий вектор
"JavaScript функция" → [0.9, 0.1, 0.2, ..., 0.8]   // далекий вектор
```

### OpenAI Embeddings API

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small', // или text-embedding-3-large
    input: text,
  });

  return response.data[0].embedding;
}

// Использование
const embedding = await getEmbedding('React hooks позволяют использовать state');
console.log(embedding.length); // 1536 для small, 3072 для large
```

#### Модели эмбеддингов (2025)

| Модель | Размерность | Цена (за 1M токенов) | Качество |
|--------|-------------|----------------------|----------|
| text-embedding-3-small | 1536 | $0.02 | Хорошее |
| text-embedding-3-large | 3072 | $0.13 | Отличное |
| text-embedding-ada-002 | 1536 | $0.10 | Устаревшая |

### Альтернативные модели

```bash
# Cohere
npm install cohere-ai
```

```typescript
import { CohereClient } from 'cohere-ai';

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

async function getCohereEmbedding(texts: string[]): Promise<number[][]> {
  const response = await cohere.embed({
    texts: texts,
    model: 'embed-english-v3.0', // или embed-multilingual-v3.0
    inputType: 'search_document',
  });

  return response.embeddings;
}
```

**Локальные эмбеддинги:**

```bash
npm install @xenova/transformers
```

```typescript
import { pipeline } from '@xenova/transformers';

// Загрузка модели (происходит один раз)
const embedder = await pipeline(
  'feature-extraction',
  'Xenova/all-MiniLM-L6-v2'
);

async function getLocalEmbedding(text: string): Promise<number[]> {
  const output = await embedder(text, {
    pooling: 'mean',
    normalize: true,
  });

  return Array.from(output.data);
}
```

---

## Векторные базы данных

### Pinecone

[Pinecone](https://www.pinecone.io/) — управляемая векторная БД.

```bash
npm install @pinecone-database/pinecone
```

```typescript
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

// Создание индекса
const index = pinecone.index('my-knowledge-base');

// Добавление векторов
async function addDocuments(documents: Array<{
  id: string;
  text: string;
  metadata: Record<string, any>;
}>) {
  const vectors = await Promise.all(
    documents.map(async (doc) => ({
      id: doc.id,
      values: await getEmbedding(doc.text),
      metadata: {
        text: doc.text,
        ...doc.metadata,
      },
    }))
  );

  await index.upsert(vectors);
}

// Поиск похожих
async function searchSimilar(query: string, topK: number = 5) {
  const queryEmbedding = await getEmbedding(query);

  const results = await index.query({
    vector: queryEmbedding,
    topK: topK,
    includeMetadata: true,
  });

  return results.matches.map(match => ({
    id: match.id,
    score: match.score,
    text: match.metadata?.text,
    metadata: match.metadata,
  }));
}
```

### Weaviate

[Weaviate](https://weaviate.io/) — open-source векторная БД с GraphQL API.

```bash
npm install weaviate-ts-client
```

```typescript
import weaviate, { WeaviateClient } from 'weaviate-ts-client';

const client: WeaviateClient = weaviate.client({
  scheme: 'http',
  host: 'localhost:8080',
});

// Создание схемы
await client.schema
  .classCreator()
  .withClass({
    class: 'Document',
    vectorizer: 'text2vec-openai',
    moduleConfig: {
      'text2vec-openai': {
        model: 'text-embedding-3-small',
      },
    },
    properties: [
      {
        name: 'content',
        dataType: ['text'],
      },
      {
        name: 'title',
        dataType: ['string'],
      },
    ],
  })
  .do();

// Добавление документов
async function addDocument(title: string, content: string) {
  await client.data
    .creator()
    .withClassName('Document')
    .withProperties({
      title: title,
      content: content,
    })
    .do();
}

// Семантический поиск
async function searchDocuments(query: string, limit: number = 5) {
  const result = await client.graphql
    .get()
    .withClassName('Document')
    .withFields('title content _additional { distance }')
    .withNearText({ concepts: [query] })
    .withLimit(limit)
    .do();

  return result.data.Get.Document;
}
```

### Milvus

[Milvus](https://milvus.io/) — high-performance векторная БД.

```bash
npm install @zilliz/milvus2-sdk-node
```

```typescript
import { MilvusClient } from '@zilliz/milvus2-sdk-node';

const client = new MilvusClient({
  address: 'localhost:19530',
});

// Создание коллекции
await client.createCollection({
  collection_name: 'documents',
  fields: [
    {
      name: 'id',
      data_type: 'Int64',
      is_primary_key: true,
      autoID: true,
    },
    {
      name: 'vector',
      data_type: 'FloatVector',
      dim: 1536,
    },
    {
      name: 'text',
      data_type: 'VarChar',
      max_length: 65535,
    },
  ],
});

// Вставка данных
await client.insert({
  collection_name: 'documents',
  data: [
    {
      vector: await getEmbedding('Document text'),
      text: 'Document text',
    },
  ],
});

// Поиск
const results = await client.search({
  collection_name: 'documents',
  vector: await getEmbedding('search query'),
  limit: 5,
  output_fields: ['text'],
});
```

### Сравнение решений

| БД | Тип | Особенности | Когда использовать |
|----|-----|-------------|-------------------|
| **Pinecone** | Cloud | Managed, простой, дорогой | MVP, быстрый старт |
| **Weaviate** | Self-hosted/Cloud | Open-source, GraphQL | Контроль, гибкость |
| **Milvus** | Self-hosted/Cloud | High-performance | Большие объемы |
| **Chroma** | Embedded/Server | Легковесный, Python/JS | Development, тесты |
| **Qdrant** | Self-hosted/Cloud | Rust, быстрый | Production |

---

## Семантический поиск

### Cosine Similarity

Мера близости между векторами:

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Использование
const similarity = cosineSimilarity(embedding1, embedding2);
// 0.0 = совершенно разные
// 1.0 = идентичные
// обычно > 0.7 = похожие
```

### Гибридный поиск

Комбинация векторного и keyword поиска:

```typescript
interface SearchResult {
  id: string;
  text: string;
  vectorScore: number;
  keywordScore: number;
  combinedScore: number;
}

async function hybridSearch(
  query: string,
  alpha: number = 0.7 // вес векторного поиска
): Promise<SearchResult[]> {
  // Векторный поиск
  const vectorResults = await vectorSearch(query);
  
  // Keyword поиск (BM25 или полнотекстовый)
  const keywordResults = await keywordSearch(query);

  // Комбинируем результаты
  const combined = mergeResults(
    vectorResults,
    keywordResults,
    alpha
  );

  return combined;
}

function mergeResults(
  vectorResults: any[],
  keywordResults: any[],
  alpha: number
): SearchResult[] {
  const resultsMap = new Map<string, SearchResult>();

  // Normalize и комбинируем scores
  vectorResults.forEach(r => {
    resultsMap.set(r.id, {
      id: r.id,
      text: r.text,
      vectorScore: r.score,
      keywordScore: 0,
      combinedScore: alpha * r.score,
    });
  });

  keywordResults.forEach(r => {
    const existing = resultsMap.get(r.id);
    if (existing) {
      existing.keywordScore = r.score;
      existing.combinedScore += (1 - alpha) * r.score;
    } else {
      resultsMap.set(r.id, {
        id: r.id,
        text: r.text,
        vectorScore: 0,
        keywordScore: r.score,
        combinedScore: (1 - alpha) * r.score,
      });
    }
  });

  return Array.from(resultsMap.values())
    .sort((a, b) => b.combinedScore - a.combinedScore);
}
```

### Фильтрация и метаданные

```typescript
interface DocumentMetadata {
  source: string;
  date: string;
  author: string;
  category: string;
  tags: string[];
}

async function searchWithFilters(
  query: string,
  filters: Partial<DocumentMetadata>
): Promise<any[]> {
  const queryEmbedding = await getEmbedding(query);

  // Pinecone с фильтрами
  const results = await index.query({
    vector: queryEmbedding,
    topK: 10,
    includeMetadata: true,
    filter: {
      category: { $eq: filters.category },
      date: { $gte: filters.date },
      tags: { $in: filters.tags },
    },
  });

  return results.matches;
}
```

---

## LangChain.js

[LangChain.js](https://js.langchain.com/) — фреймворк для построения LLM приложений.

### Установка и настройка

```bash
npm install langchain @langchain/openai
```

### Document Loaders

```typescript
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';

// Загрузка PDF
const pdfLoader = new PDFLoader('document.pdf');
const pdfDocs = await pdfLoader.load();

// Загрузка текстовых файлов
const textLoader = new TextLoader('document.txt');
const textDocs = await textLoader.load();

// Загрузка всей директории
const dirLoader = new DirectoryLoader(
  'docs/',
  {
    '.pdf': (path) => new PDFLoader(path),
    '.txt': (path) => new TextLoader(path),
  }
);
const allDocs = await dirLoader.load();
```

### Text Splitters

```typescript
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000, // Размер чанка в символах
  chunkOverlap: 200, // Перекрытие между чанками
});

const chunks = await splitter.splitDocuments(docs);

// Разделитель для кода
import { CodeTextSplitter } from 'langchain/text_splitter';

const codeSplitter = CodeTextSplitter.fromLanguage('typescript', {
  chunkSize: 500,
  chunkOverlap: 50,
});

const codeChunks = await codeSplitter.splitText(codeString);
```

### Chains и Agents

```typescript
import { RetrievalQAChain } from 'langchain/chains';
import { OpenAI } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';

// Создание векторного хранилища
const embeddings = new OpenAIEmbeddings();
const vectorStore = await PineconeStore.fromExistingIndex(
  embeddings,
  { pineconeIndex: index }
);

// Создание QA chain
const model = new OpenAI({ 
  temperature: 0,
  modelName: 'gpt-4-turbo-preview',
});

const chain = RetrievalQAChain.fromLLM(
  model,
  vectorStore.asRetriever(5), // top 5 результатов
);

// Задаем вопрос
const result = await chain.call({
  query: 'Что такое React hooks?',
});

console.log(result.text);
console.log(result.sourceDocuments); // Источники
```

### Продвинутые цепочки

```typescript
import { loadQAStuffDocumentsChain } from 'langchain/chains';
import { PromptTemplate } from '@langchain/core/prompts';

// Кастомный промпт
const prompt = PromptTemplate.fromTemplate(`
Используй следующий контекст для ответа на вопрос.
Если не знаешь ответа, скажи что не знаешь, не придумывай.

Контекст: {context}

Вопрос: {question}

Ответ:`);

const chain = loadQAStuffDocumentsChain(model, { prompt });

const docs = await vectorStore.similaritySearch(question, 5);
const result = await chain.call({
  input_documents: docs,
  question: question,
});
```

---

## LlamaIndex.TS

[LlamaIndex](https://ts.llamaindex.ai/) — data framework для LLM приложений.

### Когда использовать LlamaIndex

- Сложные RAG пайплайны
- Множество источников данных
- Продвинутая индексация
- Агенты с инструментами

```bash
npm install llamaindex
```

### Индексирование документов

```typescript
import {
  Document,
  VectorStoreIndex,
  SimpleDirectoryReader,
  storageContextFromDefaults,
  OpenAI,
} from 'llamaindex';

// Загрузка документов
const reader = new SimpleDirectoryReader();
const documents = await reader.loadData('./docs');

// Создание индекса
const index = await VectorStoreIndex.fromDocuments(documents);

// Создание query engine
const queryEngine = index.asQueryEngine();

// Запрос
const response = await queryEngine.query({
  query: 'Объясни концепцию виртуального DOM',
});

console.log(response.toString());
```

### Работа с разными источниками

```typescript
import { NotionReader, GithubRepoReader } from 'llamaindex/readers';

// Notion
const notionReader = new NotionReader({
  auth: process.env.NOTION_TOKEN,
});
const notionDocs = await notionReader.loadData();

// GitHub
const githubReader = new GithubRepoReader({
  owner: 'facebook',
  repo: 'react',
  branch: 'main',
});
const githubDocs = await githubReader.loadData();

// Объединение и индексация
const allDocs = [...notionDocs, ...githubDocs];
const index = await VectorStoreIndex.fromDocuments(allDocs);
```

---

## Provenance и источники

### Хранение метаданных

```typescript
interface SourceDocument {
  id: string;
  content: string;
  metadata: {
    title: string;
    url?: string;
    author?: string;
    date?: string;
    source: 'docs' | 'blog' | 'github' | 'notion';
    section?: string;
  };
  embedding: number[];
}

async function indexWithMetadata(docs: SourceDocument[]) {
  const vectors = docs.map(doc => ({
    id: doc.id,
    values: doc.embedding,
    metadata: {
      content: doc.content,
      ...doc.metadata,
    },
  }));

  await index.upsert(vectors);
}
```

### Отображение источников в UI

```typescript
// src/features/chat/ui/SourceCitation.tsx
import { memo } from 'react';
import './SourceCitation.scss';

interface Source {
  title: string;
  url?: string;
  snippet: string;
  relevanceScore: number;
}

interface SourceCitationProps {
  sources: Source[];
}

export const SourceCitation = memo<SourceCitationProps>(({ sources }) => {
  return (
    <div className="source-citation">
      <h4 className="source-citation__title">Источники:</h4>
      <ul className="source-citation__list">
        {sources.map((source, index) => (
          <li key={index} className="source-citation__item">
            <div className="source-citation__header">
              <span className="source-citation__index">[{index + 1}]</span>
              {source.url ? (
                <a 
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="source-citation__link"
                >
                  {source.title}
                </a>
              ) : (
                <span className="source-citation__name">{source.title}</span>
              )}
              <span className="source-citation__score">
                {(source.relevanceScore * 100).toFixed(0)}% релевантность
              </span>
            </div>
            <p className="source-citation__snippet">{source.snippet}</p>
          </li>
        ))}
      </ul>
    </div>
  );
});

SourceCitation.displayName = 'SourceCitation';
```

### Citation Patterns

```typescript
// Встраивание ссылок в текст
function formatAnswerWithCitations(
  answer: string,
  sources: Source[]
): string {
  let formattedAnswer = answer;
  
  sources.forEach((source, index) => {
    const citation = `[${index + 1}]`;
    // Добавляем citation после релевантных предложений
    // (в реальности — более сложная логика)
    formattedAnswer += ` ${citation}`;
  });

  return formattedAnswer;
}

// Markdown рендеринг
import ReactMarkdown from 'react-markdown';

export function MessageWithSources({ content, sources }: any) {
  return (
    <div>
      <ReactMarkdown>{content}</ReactMarkdown>
      <SourceCitation sources={sources} />
    </div>
  );
}
```

---

## Примеры интеграции

### Полный RAG пайплайн

```typescript
// src/features/rag/model/ragService.ts

export class RAGService {
  private index: any;
  private openai: OpenAI;

  constructor(indexName: string) {
    this.index = pinecone.index(indexName);
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async query(question: string): Promise<{
    answer: string;
    sources: Source[];
  }> {
    // 1. Получаем embedding вопроса
    const questionEmbedding = await this.getEmbedding(question);

    // 2. Ищем релевантные документы
    const searchResults = await this.index.query({
      vector: questionEmbedding,
      topK: 5,
      includeMetadata: true,
    });

    // 3. Формируем контекст
    const context = searchResults.matches
      .map(match => match.metadata.text)
      .join('\n\n');

    // 4. Генерируем ответ
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Ты helpful assistant. Отвечай на основе предоставленного контекста. Если информации нет в контексте, скажи об этом.'
        },
        {
          role: 'user',
          content: `Контекст:\n${context}\n\nВопрос: ${question}`
        }
      ],
      temperature: 0.3,
    });

    const answer = completion.choices[0].message.content || '';

    // 5. Возвращаем ответ и источники
    return {
      answer,
      sources: searchResults.matches.map(match => ({
        title: match.metadata.title,
        url: match.metadata.url,
        snippet: match.metadata.text.substring(0, 200) + '...',
        relevanceScore: match.score,
      })),
    };
  }

  private async getEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }
}

// Использование
const rag = new RAGService('knowledge-base');
const result = await rag.query('Как работают React hooks?');
console.log(result.answer);
console.log(result.sources);
```

---

## Полезные ссылки

### Документация
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [LangChain.js Docs](https://js.langchain.com/docs/)
- [LlamaIndex.TS](https://ts.llamaindex.ai/)

### Векторные БД
- [Pinecone Docs](https://docs.pinecone.io/)
- [Weaviate Docs](https://weaviate.io/developers/weaviate)
- [Milvus Docs](https://milvus.io/docs)
- [Qdrant](https://qdrant.tech/documentation/)
- [Chroma](https://docs.trychroma.com/)

---

## Резюме главы

В этой главе вы узнали:
- ✅ Что такое RAG и как он решает проблему галлюцинаций
- ✅ Как работать с эмбеддингами
- ✅ Как использовать векторные базы данных
- ✅ Семантический и гибридный поиск
- ✅ LangChain.js и LlamaIndex для RAG пайплайнов
- ✅ Как отображать источники в UI

### Что дальше?

В следующей главе мы обсудим архитектурные решения для production-ready LLM приложений.

---

[⬅️ Глава 3: Streaming](./03-streaming.md) | [🏠 На главную](../README.md) | [📑 Оглавление](../TOC.md) | [➡️ Глава 5: Архитектура](./05-architecture.md)
