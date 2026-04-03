# CLAUDE.md Builder

**Generate a perfect `CLAUDE.md` for any GitHub repository in seconds.**

CLAUDE.md Builder analyzes your repository's structure and key files, then uses an LLM to generate a project-specific `CLAUDE.md` — the instruction file that tells AI coding assistants (like Claude Code) how to work with your codebase.

## How It Works

1. Paste a GitHub repository URL
2. The app fetches key files (package.json, README, config files, etc.) via the GitHub API
3. An LLM generates an initial `CLAUDE.md` draft structured into sections
4. Refine it interactively through a chat interface (5-phase guided conversation)
5. Copy or download the final result

## Features

- **Instant analysis** — Automatically identifies the tech stack, build commands, code style conventions, and architecture patterns from your repo
- **Chat-driven refinement** — A guided 5-phase conversation fills in what the static analysis can't infer (dev workflow, naming conventions, guardrails)
- **Live preview** — Edit and preview the generated `CLAUDE.md` in real time
- **Zero configuration** — Works with any public GitHub repository, no auth required

## Tech Stack

- [Next.js](https://nextjs.org/) (App Router)
- [Vercel AI SDK](https://sdk.vercel.ai/) + [Groq](https://groq.com/) (LLM inference)
- [shadcn/ui](https://ui.shadcn.com/) + Tailwind CSS
- GitHub REST API (unauthenticated, public repos only)

## Getting Started

### Prerequisites

- Node.js 18+
- A [Groq API key](https://console.groq.com/)

### Setup

\`\`\`bash
git clone https://github.com/A-1ro/claude-md-builder
cd claude-md-builder
pnpm install
\`\`\`

Create a \`.env.local\` file:

\`\`\`env
GROQ_API_KEY=your_groq_api_key_here
\`\`\`

\`\`\`bash
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000).

## What is CLAUDE.md?

\`CLAUDE.md\` is a special file recognized by [Claude Code](https://claude.ai/code) (Anthropic's CLI). When placed at the root of a repository, it gives Claude persistent context about the project — coding conventions, build commands, architecture decisions, and what to avoid. A well-written \`CLAUDE.md\` significantly improves the quality of AI-generated code for your specific codebase.

## License

MIT
