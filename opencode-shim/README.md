# opencode-shim

Makes [opencode](https://opencode.ai) usable as the MedCounsel chatbot backend.

MedCounsel's `ai.service.ts` speaks OpenAI-compatible `/chat/completions` with SSE.
opencode speaks a stateful session + event-bus protocol. This shim translates
between them, so **MedCounsel needs no code changes** — just point it at the shim:

```
AI_API_BASE_URL=http://127.0.0.1:8787/v1
AI_API_KEY=<anything non-empty; the shim ignores it unless SHIM_API_KEY is set>
AI_MODEL=<providerID>/<modelID>        # e.g. ollama/qwen2.5:3b
```

## Run

```bash
opencode serve --port 4096 --hostname 127.0.0.1   # from THIS directory (reads ./opencode.json)
node server.js                                    # shim on :8787
```

`opencode serve` must run with this directory as cwd, or it won't pick up
`opencode.json` and the `medcounsel` agent won't exist.

## Env

| var | default | meaning |
|---|---|---|
| `PORT` | `8787` | shim listen port |
| `OPENCODE_URL` | `http://127.0.0.1:4096` | opencode server |
| `OPENCODE_AGENT` | `medcounsel` | agent defined in `opencode.json` |
| `OPENCODE_DIR` | cwd | directory opencode scopes sessions to |
| `SHIM_API_KEY` | – | if set, require `Authorization: Bearer <key>` |
| `SHIM_TIMEOUT_MS` | `120000` | give up on a wedged turn |

## Four things that will bite you

These are all load-bearing; they were each found the hard way.

1. **The per-session event stream deadlocks.** `GET /api/session/:id/event` does not
   flush response headers until that session emits an event — but the session only
   emits once you prompt it, and you cannot prompt before `fetch()` resolves. The
   shim subscribes to the **global** `/api/event` bus (which emits `server.connected`
   immediately) and filters by `sessionID`.

2. **`POST /prompt` only ACKs.** The answer arrives asynchronously on the event bus,
   so you must be subscribed *before* prompting or you lose the response.

3. **A chatbot must have zero tools.** Left enabled, the model tries to call one,
   opencode raises `permission.v2.asked`, and the session blocks forever waiting for
   a human to approve. `opencode.json` sets `"tools": {"*": false}`; the shim also
   auto-rejects any permission request as a backstop.

4. **Deltas are provider-dependent.** opencode emits `session.next.text.delta` when
   the provider streams, but some adapters deliver the whole answer only on
   `session.next.text.ended`. The shim handles both without duplicating text.

## Provider

`opencode.json` currently configures **Ollama** (`http://localhost:11434/v1`), which
needs no API key — good for local dev.

**opencode has no free hosted models.** To run this anywhere without a local Ollama
(e.g. the EC2 box, which has ~426MB free and cannot host a useful model), you must add
a real provider with an API key to `opencode.json`, e.g.:

```json
"provider": {
  "gateway": {
    "npm": "@ai-sdk/openai-compatible",
    "name": "Vercel AI Gateway",
    "options": {
      "baseURL": "https://ai-gateway.vercel.sh/v1",
      "apiKey": "{env:AI_GATEWAY_API_KEY}"
    },
    "models": { "anthropic/claude-haiku-4.5": { "name": "Claude Haiku 4.5" } }
  }
}
```
then set `AI_MODEL=gateway/anthropic/claude-haiku-4.5`.

## Degradation

If the shim or opencode is down, MedCounsel logs `AI provider unreachable` and falls
back to its built-in RAG answers. Chat degrades in quality; it does not break.
