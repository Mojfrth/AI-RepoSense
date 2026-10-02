<img width="1467" height="798" alt="Screenshot 2026-10-02 at 3 17 21 PM" src="https://github.com/user-attachments/assets/15c37f4b-0ed5-4d50-a782-29ebadd63861" />

# AI RepoSense 🚀

AI RepoSense is a full-stack application for understanding JavaScript and TypeScript repositories through AI-powered analysis. It accepts a GitHub repository or ZIP upload, extracts the codebase, parses it with Tree-sitter, stores code chunks in a pgvector database, and then answers questions, highlights issues, and generates a health report based on the actual source.

## What It Does ✨

- Analyzes JS/TS repositories for architecture, quality, security, performance, and testing signals.
- Produces a prioritized issue list with severity-based recommendations.
- Enables grounded code chat using Retrieval-Augmented Generation (RAG).
- Lets users inspect files in a code explorer and ask AI questions about the selected file.
- Supports GitHub sign-in, ZIP uploads, local project analysis, and Stripe-powered premium billing.

## Core Features 🔍

### Repository Ingestion
- GitHub OAuth connection for repo access.
- ZIP upload flow for local or private codebases.
- File filtering to skip noise such as lockfiles, build output, binaries, and oversized files.
- Framework detection and project setup for analysis.
- Production repository files use private Vercel Blob storage; local development uses `.data/projects` on disk. 

### Code Understanding and Retrieval
- Tree-sitter parsing for JavaScript and TypeScript.
- AST-based chunking for declarations, classes, functions, and exports.
- Local embeddings with `@xenova/transformers`.
- pgvector similarity search for retrieval-augmented code Q&A.
- Grounded answers with file and line references.

### Analysis and Reporting
- Category-based health scoring for architecture, security, performance, quality, and testing.
- Prioritized findings and roadmap-style recommendations.
- AI-generated repo summaries grounded in stored project files.

### Product Workflow
- Next.js app with auth, billing, and project management.
- Prisma + PostgreSQL persistence for users, projects, and analysis records.
- Stripe integration for free and premium plan handling.
- Testing setup with Vitest and Playwright.

## Tech Stack 🧩

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- Auth.js / NextAuth
- Prisma ORM
- PostgreSQL + pgvector
- Stripe
- Groq via Vercel AI SDK
- Tree-sitter
- Local embeddings with `@xenova/transformers`
- Vitest + Playwright

## Why This Project Stands Out 🧠

This app is built around a practical repo-review workflow:

1. Ingest a project.
2. Filter and parse real source files.
3. Split code into meaningful chunks.
4. Embed those chunks for semantic retrieval.
5. Ask targeted questions and generate a structured health review.

This makes it useful for onboarding, debugging, architecture review, and quick codebase assessment without losing context in generic summaries.

## Testing ✅

The repo includes automated validation for both logic and user workflows:

- Vitest for code-level checks around scoring, filters, billing logic, and analysis utilities.
- Playwright for end-to-end browser testing.
