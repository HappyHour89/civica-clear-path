# Civica

**Understand politics. Think for yourself.**

Civica explains political and legal questions in plain language. For each question (or uploaded document) it shows:

- a short summary, what the policy or law actually does, and why it matters
- key facts, each linked to a source that was actually retrieved during research
- competing perspectives side by side, plus where the sides agree and questions to think about
- definitions of difficult terms
- your U.S. senators and House representative (if you give your state, and optionally your address)
- key leaders on the issue, helpful websites, and phone numbers
- what is uncertain or disputed
- a follow-up chat

The interface is available in English and Korean. Answers are written in the language you pick.

## Running it on your computer

1. Install [Node.js](https://nodejs.org) version 22 or newer.
2. Get an Anthropic API key at [console.anthropic.com](https://console.anthropic.com) (Settings → API Keys). **Set a monthly spend limit** there too.
3. In this folder, copy `.env.example` to a new file named `.env.local` and paste your key after `ANTHROPIC_API_KEY=`.
4. Run:

   ```bash
   npm install
   npm run dev
   ```

5. Open http://localhost:3000.

## Putting it online (Vercel)

1. Sign in at [vercel.com](https://vercel.com) with your GitHub account and choose **Add New → Project**, then pick this repository.
2. Under **Environment Variables**, add `ANTHROPIC_API_KEY` with your key. It stays on Vercel's servers and is never sent to visitors' browsers.
3. Click **Deploy**. Every push to the main branch redeploys automatically.

## How it works

```
Browser (src/components)          Server (src/app/api)                 Outside services
───────────────────────           ────────────────────                 ────────────────
Question / file / state  ──────►  /api/ask        ───────────────────► Claude (with web search)
                                  /api/officials  ───────────────────► congress-legislators data,
                                                                       U.S. Census address lookup
Follow-up chat           ──────►  /api/followup   ───────────────────► Claude (with web search)
```

- **Claude** researches the question with web search, then returns its answer in a fixed structure (`src/lib/schemas.ts`), which the server checks before using.
- **Neutrality rules** live in the system prompt in `src/lib/prompts.ts`. This is the most important file to review and refine.
- **Source checking:** the server drops any cited source whose link didn't come back from Claude's own web searches (`src/lib/sources.ts`), and facts left without a source are labeled.
- **Officials** come from the public [congress-legislators](https://github.com/unitedstates/congress-legislators) dataset rather than from the AI, so names and office phone numbers are reliable. A street address is only used to look up the House district with the Census Bureau.
- **No database.** Nothing the user types or uploads is saved. Follow-up chats work because the browser sends the conversation back with each question.

### Project map

| Path | What it is |
|---|---|
| `src/app/page.tsx`, `src/components/` | The pages and UI pieces |
| `src/app/api/*/route.ts` | The three server endpoints |
| `src/lib/claude.ts` | Talks to Claude; handles retries and errors |
| `src/lib/prompts.ts` | Civica's instructions to Claude (neutrality, accuracy, safety) |
| `src/lib/schemas.ts` | The exact shape of an answer |
| `src/lib/i18n.ts` | All interface text, in English and Korean |
| `src/lib/officials.ts` | Members of Congress and district lookup |
| `src/lib/upload.ts` | File checks (type, size) |
| `src/lib/rateLimit.ts` | Limits how often one visitor can ask |

### Adding a language (e.g. Mandarin)

Add an entry to `LANGUAGES` and a full dictionary to `DICTIONARIES` in `src/lib/i18n.ts`. The TypeScript checker will point out any missing text.

## Checks

```bash
npm test           # automated tests
npm run typecheck  # TypeScript errors
npm run lint       # code-style problems
npm run build      # full production build
```

## Costs

Each question makes one or more Claude requests with up to six web searches. Expect very roughly $0.20–$0.50 per question and less per follow-up; check real numbers in the Anthropic Console after a few questions. The model is set in `src/lib/claude.ts`. A smaller model would cost less, at some cost to quality.

## Privacy and safety

- The API key only exists on the server.
- Questions, files, and addresses are never stored. Files are capped at 4 MB and checked by their actual contents, not their name.
- Instructions hidden in uploaded documents are treated as content to explain, not commands.
- Links shown to users must be `http`/`https`, and the AI's text is never inserted as raw HTML.
- Each visitor is limited to 8 new questions and 30 follow-ups per 10 minutes. This limit lives in server memory, so on Vercel it is per server instance and is not a hard guarantee. Your Anthropic spend limit is the real safety net.

## Known limitations

- Officials lookup covers U.S. Congress only. State and local leaders, websites, and phone numbers come from Claude's web search, so double-check phone numbers before calling.
- Server error messages beyond the common ones are only in English.
- Follow-up questions see the briefing but not the original uploaded file.
- Answers usually take 30–90 seconds because Claude searches the web first.
