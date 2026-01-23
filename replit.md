# VoiceUp - German Civic Engagement Platform

## Overview

VoiceUp is a German political education and civic engagement platform built with React, Express, and PostgreSQL. The application provides interactive tools for political participation including Wahl-O-Mat style quizzes to match users with political parties, opinion polls, news articles, and an AI-powered chat assistant (CivicChat AI) for discussing political topics. The platform uses German language throughout and incorporates German flag colors (Black, Red, Gold) as design accents.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled with Vite
- **Routing**: Wouter for client-side routing (lightweight React router)
- **State Management**: TanStack React Query for server state caching and synchronization
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom German political theme (dark mode support)
- **Animations**: Framer Motion for page transitions and UI animations
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **API Design**: RESTful endpoints defined in `shared/routes.ts` with Zod validation schemas
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains all database table definitions with relations
- **Build System**: esbuild for server bundling, Vite for client

### Authentication
- **Provider**: Replit Auth using OpenID Connect (OIDC)
- **Session Storage**: PostgreSQL-backed sessions via `connect-pg-simple`
- **User Model**: Stored in `users` table with Replit profile data
- **Middleware**: `isAuthenticated` middleware protects authenticated routes

### AI Chat Integration
- **Provider**: OpenAI-compatible API via Replit AI Integrations
- **Streaming**: Server-Sent Events (SSE) for real-time chat responses
- **Storage**: Conversations and messages stored in PostgreSQL
- **Client Hook**: `useChatStream` handles SSE stream reading on frontend

### Key Data Models
- **Quizzes**: Multi-question quizzes with party-affiliated answer options for Wahl-O-Mat functionality
- **Polls**: User voting on political questions with result aggregation
- **Articles**: News and project content with categories
- **Conversations/Messages**: Chat history storage for AI interactions

### Development vs Production
- Development: Vite dev server with HMR, tsx for TypeScript execution
- Production: Client built to `dist/public`, server bundled to `dist/index.cjs`

## External Dependencies

### Database
- **PostgreSQL**: Primary data store accessed via `DATABASE_URL` environment variable
- **Drizzle Kit**: Schema push via `npm run db:push`

### AI Services
- **OpenAI API**: Chat completions via `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL`
- **Image Generation**: `gpt-image-1` model for image generation (available but not prominently used)
- **Audio/Voice**: Voice chat utilities available in `replit_integrations/audio/`

### Authentication
- **Replit OIDC**: Configured via `ISSUER_URL` (defaults to `https://replit.com/oidc`)
- **Session Secret**: `SESSION_SECRET` environment variable required

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Express session secret
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key for chat
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI API base URL
- `REPL_ID` - Replit environment identifier (set automatically)