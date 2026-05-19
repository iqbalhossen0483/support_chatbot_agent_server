# 🚀 Support Chatbot Agent Server

## 📖 Overview

**Support Chatbot Agent Server** is an enterprise-grade backend service designed to power intelligent customer support chatbots with AI-driven responses, Retrieval-Augmented Generation (RAG), real-time communication, and seamless human agent escalation.

Built with **NestJS**, **PostgreSQL**, **Redis**, and **Google Gemini AI**, the system delivers scalable, context-aware customer support experiences with high performance and secure infrastructure.

---

# ✨ Features

## 🤖 AI-Powered Response System

- Retrieval-Augmented Generation (RAG)
- Context-aware AI responses
- Google Gemini 2.0 Flash integration
- Semantic similarity search with vector embeddings
- Confidence scoring for response accuracy
- Token optimization for efficient AI processing

---

## 💬 Real-Time Conversation Management

- WebSocket communication with Socket.io
- Multi-turn conversation support
- Persistent session tracking
- Conversation state management
- Real-time message delivery

---

## 📚 Knowledge Base Management

- Automated website scraping
- Smart content chunking
- Vector embedding generation
- Semantic document search
- Brand-specific response customization

---

## 🚨 Human Escalation Workflow

- Automatic escalation based on confidence thresholds
- Seamless handoff to human agents
- Chatwoot integration
- Escalation tracking and status management
- Agent assignment workflow

---

## 🔐 Security & Authentication

- JWT authentication
- API key authorization
- HMAC webhook verification
- Rate limiting & throttling
- CORS protection
- DTO validation with class-validator

---

## ⚡ Performance & Scalability

- Redis caching
- BullMQ background job processing
- Distributed WebSocket support
- Async processing architecture
- Optimized vector search with pgvector

---

# 🛠️ Technology Stack

| Layer             | Technology      |
| ----------------- | --------------- |
| Backend Framework | NestJS          |
| Language          | TypeScript      |
| Database          | PostgreSQL      |
| Vector Database   | pgvector        |
| Cache & Queue     | Redis + BullMQ  |
| WebSocket         | Socket.io       |
| AI Integration    | Google Gemini   |
| Authentication    | JWT + Passport  |
| Validation        | class-validator |
| Testing           | Jest            |

---

# 📂 Project Structure

```bash
support_chatbot_agent_server/
├── src/
├── test/
├── prisma/
├── dist/
├── package.json
├── tsconfig.json
├── nest-cli.json
└── Dockerfile
```

---

# 🚀 Getting Started

## Prerequisites

Make sure the following services are installed:

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Google Gemini API Key

# 📦 Installation

## Clone Repository

```bash
git clone https://github.com/iqbalhossen0483/support_chatbot_agent_server.git

cd support_chatbot_agent_server
```

## Install Dependencies

```bash
npm install
```

---

## Configure Environment Variables

Copy the environment example file:

```bash
cp .env.example .env
```

Update your `.env` file:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=chatbot_agent
DATABASE_USER=postgres
DATABASE_PASSWORD=

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Gemini AI
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash

# Application
APP_PORT=3000
JWT_SECRET=

# Vector Search
VECTOR_SEARCH_TOP_K=7
VECTOR_SIMILARITY_THRESHOLD=0.3

# Confidence Threshold
CONFIDENCE_THRESHOLD=0.45
```

---

# 🗄️ Database Setup

Enable the `pgvector` extension in PostgreSQL:

```bash
psql -U postgres
```

```sql
CREATE DATABASE chatbot_agent;

\c chatbot_agent

CREATE EXTENSION IF NOT EXISTS vector;
```

---

# ▶️ Run Development Server

```bash
npm run start:dev
```

Server will run on:

```bash
http://localhost:3000
```

---

# 🧪 Development Scripts

```bash
# Development
npm run start:dev
npm run start:debug

# Production
npm run build
npm run start:prod

# Code Quality
npm run lint
npm run format

# Testing
npm run test
npm run test:e2e
npm run test:cov
```

---

# 🔐 Security Best Practices

- Use strong JWT secrets in production
- Enable SSL for PostgreSQL
- Secure Redis with authentication
- Configure specific CORS origins
- Apply proper rate limiting
- Keep dependencies updated

---

# 🐳 Docker

## Build Docker Image

```bash
docker build -t support-chatbot-agent-server .
```

## Run Docker Container

```bash
docker run -p 3000:3000 support-chatbot-agent-server
```
