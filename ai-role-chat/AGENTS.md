# AGENTS.md

## Project Rules

- This is a local-first AI role chat PWA for iPhone Safari.
- Use TypeScript strict mode.
- Keep domain logic, database logic, LLM provider logic, and UI logic separated.
- Never hardcode API keys.
- Never log secrets.
- Prompt assembly must live in `src/lib/prompt-engine`.
- LLM provider code must live in `src/lib/llm`.
- IndexedDB schema and migrations must be versioned with Dexie.
- Add tests for Prompt Engine, World Book triggering, DeepSeek Provider, and import/export.
- Before finishing a task, run typecheck, lint, and tests when available.

## Commands

- Install dependencies: `pnpm install`
- Start dev server: `pnpm dev`
- Run tests: `pnpm test`
- Run typecheck: `pnpm typecheck`
- Build PWA: `pnpm build`
