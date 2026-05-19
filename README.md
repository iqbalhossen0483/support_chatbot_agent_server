# Support Chatbot Agent Server

> **AI-Powered Support Chatbot Platform with RAG, Real-Time Chat, and Intelligent Escalation**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0-red)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-DC382D)](https://redis.io/)
[![License](https://img.shields.io/badge/License-UNLICENSED-inactive)](#license)

## Overview

**Support Chatbot Agent Server** is an enterprise-grade backend service that powers intelligent customer support chatbots with Retrieval-Augmented Generation (RAG), real-time messaging, and seamless human handoff capabilities. Built with NestJS, it leverages Google Gemini AI for semantic understanding and PostgreSQL with pgvector for vector search.

### Core Capabilities

- 🤖 **AI-Powered Responses** - Google Gemini 2.0 Flash with confidence scoring
- 📚 **Knowledge Base Management** - Automatic web scraping, chunking, and vector embeddings
- 💬 **Real-Time Chat** - WebSocket support for instant conversations
- 🔄 **Intelligent Escalation** - Context-aware escalation to human agents
- 🔐 **Enterprise Security** - JWT authentication, API keys, HMAC verification
- 🚀 **High Performance** - Async job processing, Redis caching, rate limiting

---

## Key Features

### 🤖 AI Intelligence Layer
- **RAG (Retrieval-Augmented Generation)** - Combines vector search with Gemini AI for accurate, context-aware responses
- **Semantic Understanding** - Google Gemini embeddings for intelligent similarity matching
- **Confidence Scoring** - Built-in confidence metrics to identify when human intervention is needed
- **Token Optimization** - GPT tokenizer integration for efficient prompt engineering

### 💬 Conversation Management
- **WebSocket Support** - Real-time bidirectional communication with Socket.io
- **Session Tracking** - Persistent conversation history with visitor metadata
- **Multi-Turn Conversations** - Context preservation across chat exchanges
- **Conversation States** - ACTIVE, RESOLVED, ESCALATED status management

### 📚 Knowledge Base Management
- **Web Scraping** - Automatic crawling with configurable depth and rate limiting
- **Smart Chunking** - Dynamic content chunking with overlap for semantic integrity
- **Vector Embeddings** - pgvector integration for semantic search
- **Brand Context** - Customizable brand guidelines for consistent responses

### 🚨 Escalation Workflow
- **Smart Routing** - Automatic escalation when confidence thresholds aren't met
- **Human Handoff** - Seamless transition to support agents via Chatwoot integration
- **Escalation Tracking** - Full status management and resolution notes
- **Agent Assignment** - Claim-based escalation workflow

### 🔐 Security & Authentication
- **JWT Tokens** - Stateless authentication with configurable expiry
- **API Key Auth** - Server-to-server communication authentication
- **HMAC Verification** - Webhook signature validation (Chatwoot)
- **Rate Limiting** - Throttling to prevent abuse (30 req/min short, 100 req/min medium)
- **CORS Protection** - Configurable allowed origins
- **Input Validation** - DTOs with class-validator for request validation

### 🔗 Third-Party Integrations
- **Chatwoot API** - Full integration for escalation and agent assignment
- **Redis** - Session management and async job queue
- **PostgreSQL** - Relational data with vector search capabilities
- **Socket.io Redis Adapter** - Distributed socket connection management

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|----------|
| **Language** | TypeScript | 5.7+ |
| **Framework** | NestJS | 11.0+ |
| **Web Server** | Express | 5.0+ |
| **WebSocket** | Socket.io | 4.8+ |
| **Database** | PostgreSQL | 15+ |
| **Vector DB** | pgvector | 0.2+ |
| **Cache/Queue** | Redis | 7.0+ |
| **Job Queue** | BullMQ | 5.71+ |
| **Auth** | JWT + Passport | 11.0+ / 0.7+ |
| **AI/ML** | Google Gemini | 2.0 Flash |
| **HTTP Client** | Axios | 1.13+ |
| **Validation** | class-validator | 0.15+ |
| **Testing** | Jest | 30.0+ |
| **Linting** | ESLint | 9.18+ |
| **Formatting** | Prettier | 3.4+ |
| **Build** | ts-loader | 9.5+ |

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn** package manager
- **PostgreSQL** 15+ with pgvector extension
- **Redis** 7+
- **Google Cloud API Key** (Gemini AI)
- **Chatwoot** instance (optional, for escalation)

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/iqbalhossen0483/support_chatbot_agent_server.git
cd support_chatbot_agent_server
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=chatbot_agent
DATABASE_USER=postgres
DATABASE_PASSWORD=your-secure-password
DATABASE_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Gemini AI
GEMINI_API_KEY=your-google-ai-api-key
GEMINI_MODEL=gemini-2.0-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004

# Application
APP_PORT=3000
APP_ENV=development
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRY=24h

# Web Scraper
SCRAPER_MAX_DEPTH=10
SCRAPER_MAX_PAGES=5000
SCRAPER_RATE_LIMIT=2
SCRAPER_USER_AGENT=SupportAgentBot/1.0

# Content Chunking
CHUNK_SIZE_MIN=500
CHUNK_SIZE_MAX=600
CHUNK_OVERLAP=50

# Vector Search
VECTOR_SEARCH_TOP_K=7
VECTOR_SIMILARITY_THRESHOLD=0.3

# Confidence
CONFIDENCE_THRESHOLD=0.45

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3001
```

#### 4. Database Setup

Create PostgreSQL database and enable pgvector:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE chatbot_agent;

# Connect to database
\c chatbot_agent

# Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;
```

#### 5. Run Application

```bash
npm run start:dev
```

The server will start on `http://localhost:3000` with hot-reload enabled.

---

## API Documentation

### Base URL
```
http://localhost:3000/v1
```

### Authentication Endpoints

#### Register User

```bash
curl -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!",
    "name": "Admin User",
    "role": "admin"
  }'
```

#### Login

```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!"
  }'
```

### Chat Endpoints

#### Create Conversation

```bash
curl -X POST http://localhost:3000/v1/chat/conversations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "websiteId": 1,
    "sessionId": "visitor-session-123",
    "visitorMetadata": {
      "email": "customer@example.com",
      "name": "John Doe"
    }
  }'
```

#### Get Conversation

```bash
curl -X GET http://localhost:3000/v1/chat/conversations/101 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Knowledge Base Endpoints

#### Register Website

```bash
curl -X POST http://localhost:3000/v1/knowledge/websites \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Help Center",
    "baseUrl": "https://help.example.com",
    "scrapeConfig": {
      "maxDepth": 5,
      "maxPages": 1000
    },
    "brandContext": "We are a SaaS platform providing..."
  }'
```

### Escalation Endpoints

#### List Escalations

```bash
curl -X GET "http://localhost:3000/v1/escalations?status=PENDING" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Resolve Escalation

```bash
curl -X POST http://localhost:3000/v1/escalations/5/resolve \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resolutionNotes": "Issue resolved by providing migration guide"
  }'
```

---

## Development

### Available Scripts

```bash
# Development
npm run start:dev        # Start with watch mode
npm run start:debug      # Start with debugger

# Production
npm run build           # Compile TypeScript
npm run start:prod      # Run compiled code

# Code Quality
npm run lint            # Run ESLint and fix issues
npm run format          # Format code with Prettier

# Testing
npm run test            # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run test:cov        # Run tests with coverage
npm run test:e2e        # Run end-to-end tests
```

### Code Style

```bash
# Format code
npm run format

# Fix linting
npm run lint
```

---

## Deployment

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Docker Compose

```yaml
version: '3.9'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis

  postgres:
    image: pgvector/pgvector:pg15-latest
    environment:
      POSTGRES_PASSWORD: postgres123
      POSTGRES_DB: chatbot_agent
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

volumes:
  postgres-data:
  redis-data:
```

```bash
# Start services
docker-compose up -d
docker-compose logs -f app
```

---

## Security Best Practices

- Change `JWT_SECRET` in production
- Enable `DATABASE_SSL=true` with proper certificates
- Configure secure Redis password
- Use specific CORS allowed origins (not `*`)
- Enable rate limiting appropriately
- Keep dependencies updated
- Use HTTPS/TLS on all connections
- Implement comprehensive monitoring

---

## Troubleshooting

### pgvector not found

```bash
psql -U postgres -d chatbot_agent
CREATE EXTENSION IF NOT EXISTS vector;
```

### Redis connection refused

```bash
# Check Redis is running
redis-cli ping

# Start Redis
redis-server
```

### JWT token expired

- Log in again to get a new token
- Check `JWT_EXPIRY` in `.env`

---

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m "feat: add new feature"`
4. Push: `git push origin feature/my-feature`
5. Create Pull Request

### Code Style Guidelines

- Use TypeScript strict mode
- Follow ESLint rules
- Format with Prettier
- Add JSDoc comments for public methods
- Write tests for new features

---

## Support

- 📧 Email: support@example.com
- 📖 Docs: [Full Documentation](https://docs.example.com)
- 🐛 Issues: [GitHub Issues](https://github.com/iqbalhossen0483/support_chatbot_agent_server/issues)

---

## License

This project is licensed under the **UNLICENSED** license. All rights reserved.

---

**Built with ❤️ for exceptional customer support experiences.**
