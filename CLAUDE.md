# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. It uses a **virtual file system** (no files written to disk) where Claude AI generates React components through tool calls, and they're rendered in real-time in an iframe preview.

**Tech Stack**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Prisma (SQLite), Anthropic Claude AI (Vercel AI SDK)

## Development Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack (http://localhost:3000)

# Building & Production
npm run build            # Production build
npm run start            # Start production server

# Testing
npm run test             # Run Vitest tests
npm run lint             # Run ESLint

# Database
npm run setup            # Install dependencies + Prisma generate + migrations
npm run db:reset         # Reset database (destructive)
```

### Running Tests

Vitest tests use jsdom environment. To run specific tests:

```bash
npx vitest src/lib/__tests__/file-system.test.ts      # Single test file
npx vitest src/components/chat/__tests__               # Test directory
```

## Architecture

### Virtual File System

The core architecture is built around `VirtualFileSystem` ([src/lib/file-system.ts](src/lib/file-system.ts)):

- **In-memory file tree**: Files exist only in memory during editing
- **Serialization**: State serializes to database for authenticated users (messages + files as JSON in `Project.data` and `Project.messages`)
- **Path normalization**: All paths start with `/`, no trailing slashes (except root)
- **Tool integration**: AI manipulates files via `str_replace_editor` and `file_manager` tools

**Key methods**:
- `createFile()`, `updateFile()`, `deleteFile()`, `rename()` - File operations
- `serialize()` / `deserializeFromNodes()` - Persistence
- `getAllFiles()` - Returns Map<path, content> for preview

### AI Tool System

The chat API ([src/app/api/chat/route.ts](src/app/api/chat/route.ts)) uses Vercel AI SDK's `streamText` with two tools:

1. **str_replace_editor** ([src/lib/tools/str-replace.ts](src/lib/tools/str-replace.ts))
   - Commands: `create`, `str_replace`, `insert`, `view`
   - Creates files with parent directories automatically
   - String replacement for edits (similar to Aider's approach)

2. **file_manager** ([src/lib/tools/file-manager.ts](src/lib/tools/file-manager.ts))
   - Commands: `rename`, `delete`
   - Handles file/directory operations

The AI follows instructions in [src/lib/prompts/generation.tsx](src/lib/prompts/generation.tsx):
- Always create `/App.jsx` as entry point (default export of React component)
- Use Tailwind CSS for styling (no inline styles)
- Use `@/` import alias for local files (e.g., `import Foo from '@/components/Foo'`)
- No HTML files needed

### Preview System

Live preview ([src/components/preview/PreviewFrame.tsx](src/components/preview/PreviewFrame.tsx)) works via:

1. **Babel transformation** ([src/lib/transform/jsx-transformer.ts](src/lib/transform/jsx-transformer.ts)): Transpiles JSX/TSX to JS using `@babel/standalone`
2. **Import maps**: Maps React imports to `esm.sh` CDN, local files to blob URLs
3. **Iframe rendering**: Uses `srcdoc` with sandboxing (`allow-scripts`, `allow-same-origin`)
4. **Entry point detection**: Looks for `/App.jsx`, `/App.tsx`, `/index.jsx`, etc.

### State Management

Two React contexts manage state:

- **FileSystemContext** ([src/lib/contexts/file-system-context.tsx](src/lib/contexts/file-system-context.tsx)): Wraps VirtualFileSystem, provides `useFileSystem()` hook
- **ChatContext** ([src/lib/contexts/chat-context.tsx](src/lib/contexts/chat-context.tsx)): Manages chat messages and AI streaming

State updates trigger `refreshTrigger` counter increments to re-render preview.

### Authentication

Optional authentication system ([src/lib/auth.ts](src/lib/auth.ts)):
- JWT tokens via `jose` library (stored in HTTP-only cookies)
- Passwords hashed with `bcrypt`
- Anonymous mode supported (no persistence)
- Prisma schema: `User` 1-to-many `Project`

### Mock Provider

When `ANTHROPIC_API_KEY` is not set, falls back to `MockLanguageModel` ([src/lib/provider.ts](src/lib/provider.ts)):
- Generates static Counter/Form/Card components
- Simulates streaming and tool calls
- Useful for testing without API costs

## Windows Compatibility

This project uses `cross-env` to ensure npm scripts work on Windows. The `NODE_OPTIONS` environment variable loads [node-compat.cjs](node-compat.cjs) which removes problematic `localStorage`/`sessionStorage` globals in Node.js 25+.

## Database

Prisma with SQLite ([prisma/schema.prisma](prisma/schema.prisma)):
- **User**: `id`, `email`, `password`, `createdAt`, `updatedAt`
- **Project**: `id`, `name`, `userId`, `messages` (JSON), `data` (JSON), timestamps

Generated client outputs to [src/generated/prisma/](src/generated/prisma/) (customized via `output` in schema).

After schema changes:
```bash
npx prisma generate          # Regenerate client
npx prisma migrate dev       # Create migration
```

## File Conventions

- **Components**: [src/components/](src/components/) organized by feature (auth, chat, editor, preview, ui)
- **Actions**: [src/actions/](src/actions/) for server actions (create-project, get-projects, etc.)
- **Tests**: Co-located in `__tests__/` directories
- **UI Components**: Radix UI primitives in [src/components/ui/](src/components/ui/)

## Important Notes

- **Entry point requirement**: Preview expects `/App.jsx` (or `.tsx`) as the main React component
- **Import alias**: Use `@/` for all local imports (configured in [tsconfig.json](tsconfig.json))
- **No disk writes**: User-generated files only exist in VirtualFileSystem (database or memory)
- **Serialization caveat**: FileNode `children` Maps are serialized as flat objects, reconstructed on load
- **Turbopack**: Dev server uses Turbopack (Next.js 15's Rust-based bundler)
- **Prompt caching**: System prompt uses Anthropic's cache control (`ephemeral`) for cost savings
