#!/usr/bin/env node
/**
 * opencode-shim — exposes an OpenAI-compatible /v1/chat/completions endpoint
 * backed by an `opencode serve` instance.
 *
 * MedCounsel's ai.service.ts already speaks OpenAI-compatible streaming, so
 * pointing AI_API_BASE_URL at this shim needs zero application changes.
 *
 * The translation is not symmetric, and the awkward parts are the interesting ones:
 *
 *   - opencode's POST /prompt only ACKs; the answer arrives asynchronously on the
 *     session event bus. So we must subscribe to the event stream BEFORE prompting,
 *     or we race the response and hang forever.
 *   - opencode emits session.next.text.delta when the provider streams, but some
 *     providers (Ollama via @ai-sdk/openai-compatible, as of 1.17) emit no deltas
 *     at all and deliver the whole answer on session.next.text.ended. We handle
 *     both: stream deltas if they come, otherwise flush the final text once.
 *   - a session is stateful, but MedCounsel resends the full history each call.
 *     We therefore use one throwaway session per request and delete it after,
 *     which keeps this process stateless and avoids unbounded session growth.
 *
 * Env:
 *   PORT              (default 8787)   port this shim listens on
 *   OPENCODE_URL      (default http://127.0.0.1:4096)
 *   OPENCODE_AGENT    (default medcounsel)
 *   OPENCODE_DIR      (default cwd) directory opencode scopes the session to
 *   SHIM_API_KEY      if set, require `Authorization: Bearer <key>`
 */

const http = require('http');

const PORT = parseInt(process.env.PORT || '8787', 10);
const OC = (process.env.OPENCODE_URL || 'http://127.0.0.1:4096').replace(/\/$/, '');
const AGENT = process.env.OPENCODE_AGENT || 'medcounsel';
const DIR = process.env.OPENCODE_DIR || process.cwd();
const API_KEY = process.env.SHIM_API_KEY || '';
const TIMEOUT_MS = parseInt(process.env.SHIM_TIMEOUT_MS || '120000', 10);

const log = (...a) => console.log(new Date().toISOString(), ...a);

/** "ollama/qwen2.5:3b" -> { providerID: "ollama", id: "qwen2.5:3b" }
 *  Split on the FIRST slash only — model ids themselves contain slashes
 *  (e.g. "anthropic/claude-haiku-4.5" under a gateway provider). */
function parseModel(model) {
  const i = (model || '').indexOf('/');
  if (i === -1) return null;
  return { providerID: model.slice(0, i), id: model.slice(i + 1) };
}

/**
 * Flatten OpenAI `messages` into a single prompt.
 *
 * MedCounsel puts its RAG-retrieved context in the system message, so that
 * content has to survive intact — it is the entire value of the request. The
 * opencode agent's own prompt is deliberately minimal and defers to this.
 */
function flatten(messages) {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const turns = messages.filter((m) => m.role !== 'system');
  const latest = turns[turns.length - 1];
  const history = turns.slice(0, -1);

  let out = '';
  if (system) out += `=== INSTRUCTIONS AND CONTEXT ===\n${system}\n\n`;
  if (history.length) {
    out += '=== CONVERSATION SO FAR ===\n';
    for (const m of history) {
      out += `${m.role === 'assistant' ? 'Assistant' : 'Student'}: ${m.content}\n`;
    }
    out += '\n';
  }
  out += `=== STUDENT'S CURRENT QUESTION ===\n${latest ? latest.content : ''}`;
  return out;
}

const ocFetch = (path, init) =>
  fetch(`${OC}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });

/** OpenAI streaming chunk envelope. */
function chunk(id, model, delta, finish = null) {
  return `data: ${JSON.stringify({
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta, finish_reason: finish }],
  })}\n\n`;
}

async function handleChat(req, res, body) {
  const model = body.model || 'ollama/qwen2.5:3b';
  const parsed = parseModel(model);
  if (!parsed) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      error: { message: `model must be "<providerID>/<modelID>", got "${model}"`, type: 'invalid_request_error' },
    }));
  }
  if (!Array.isArray(body.messages) || !body.messages.length) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: { message: 'messages[] required', type: 'invalid_request_error' } }));
  }

  const wantStream = body.stream !== false;
  const id = `chatcmpl-${Math.random().toString(36).slice(2)}`;
  let sessionID = null;

  try {
    // 1. Subscribe to the GLOBAL event bus FIRST, and filter by sessionID below.
    //
    //    Two traps here, both learned the hard way:
    //    a) opencode's POST /prompt only ACKs — the answer arrives over the event
    //       stream — so we must already be listening before we prompt, or we lose it.
    //    b) the per-session stream (/api/session/:id/event) does not flush its
    //       response headers until that session produces an event, so awaiting it
    //       before prompting deadlocks: fetch() never resolves, and the prompt that
    //       would unblock it is never sent. The global bus emits `server.connected`
    //       on connect, so its headers land immediately.
    const ev = await fetch(`${OC}/api/event`, { headers: { Accept: 'text/event-stream' } });
    if (!ev.ok || !ev.body) throw new Error(`event stream failed (${ev.status})`);

    // 2. session
    const sres = await ocFetch('/api/session', {
      method: 'POST',
      body: JSON.stringify({ model: parsed, agent: AGENT, location: { directory: DIR } }),
    });
    if (!sres.ok) throw new Error(`session create failed (${sres.status}): ${await sres.text()}`);
    sessionID = (await sres.json()).data.id;

    // 3. prompt (fire and forget — returns an ack, not the answer)
    const pres = await ocFetch(`/api/session/${sessionID}/prompt`, {
      method: 'POST',
      body: JSON.stringify({ prompt: { text: flatten(body.messages) } }),
    });
    if (!pres.ok) throw new Error(`prompt failed (${pres.status}): ${await pres.text()}`);

    if (wantStream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.write(chunk(id, model, { role: 'assistant', content: '' }));
    }

    let full = '';
    let sawDelta = false;
    let failure = null;

    const reader = ev.body.getReader();
    const dec = new TextDecoder();
    let buf = '';

    // Backstop: never let a wedged upstream hang a user's chat forever.
    const deadline = Date.now() + TIMEOUT_MS;

    outer: while (true) {
      if (Date.now() > deadline) {
        failure = `timed out after ${TIMEOUT_MS}ms waiting for opencode`;
        break;
      }
      const { done, value } = await Promise.race([
        reader.read(),
        new Promise((r) => setTimeout(() => r({ done: true, timedOut: true }), Math.max(0, deadline - Date.now()))),
      ]);
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';

      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith('data: ')) continue;
        let e;
        try { e = JSON.parse(t.slice(6)); } catch { continue; }
        const d = e.data || {};

        if (process.env.SHIM_DEBUG) log(`EV ${e.type} sess=${d.sessionID || '-'} (mine=${sessionID})`);

        // The global bus carries every session's traffic; ignore anyone else's.
        // Without this, two concurrent chats would splice into each other.
        if (d.sessionID && d.sessionID !== sessionID) continue;

        switch (e.type) {
          case 'session.next.text.delta': {
            const piece = d.text || d.delta || '';
            if (piece) {
              sawDelta = true;
              full += piece;
              if (wantStream) res.write(chunk(id, model, { content: piece }));
            }
            break;
          }
          case 'session.next.text.ended': {
            // Providers that don't stream (Ollama today) deliver everything here.
            // Only flush if we never saw a delta, else we'd duplicate the answer.
            if (!sawDelta && d.text) {
              full = d.text;
              if (wantStream) res.write(chunk(id, model, { content: full }));
            }
            break;
          }
          // A chatbot has no business calling tools, but if the model tries anyway,
          // opencode blocks the whole session waiting for a human to approve it.
          // Reject immediately so the turn can finish instead of hanging forever.
          case 'permission.v2.asked': {
            const rid = d.requestID || d.id;
            log(`permission asked (tool=${d.tool || '?'}) — auto-rejecting`);
            if (rid) {
              ocFetch(`/api/session/${sessionID}/permission/${rid}/reply`, {
                method: 'POST',
                body: JSON.stringify({ reply: 'reject', message: 'tools are disabled for this agent' }),
              }).catch(() => {});
            }
            break;
          }

          case 'session.next.step.ended':
            break outer;
          case 'session.next.step.failed':
          case 'session.next.error':
            failure = d.error || d.message || 'opencode step failed';
            break outer;
        }
      }
    }
    reader.cancel().catch(() => {});

    if (failure) throw new Error(String(failure));

    if (wantStream) {
      res.write(chunk(id, model, {}, 'stop'));
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{ index: 0, message: { role: 'assistant', content: full }, finish_reason: 'stop' }],
      }));
    }
    log(`ok  session=${sessionID} chars=${full.length} streamed=${sawDelta}`);
  } catch (err) {
    log(`ERR ${err.message}`);
    if (res.headersSent) {
      // Mid-stream: the client already has a 200. Close cleanly so it doesn't hang.
      if (wantStream) {
        res.write(chunk(id, model, { content: `\n\n_(assistant error: ${err.message})_` }, 'stop'));
        res.write('data: [DONE]\n\n');
      }
      res.end();
    } else {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: err.message, type: 'upstream_error' } }));
    }
  } finally {
    if (sessionID) ocFetch(`/api/session/${sessionID}`, { method: 'DELETE' }).catch(() => {});
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, opencode: OC, agent: AGENT }));
  }

  if (url.pathname === '/v1/chat/completions' && req.method === 'POST') {
    if (API_KEY && req.headers.authorization !== `Bearer ${API_KEY}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: { message: 'unauthorized', type: 'invalid_request_error' } }));
    }
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 2e6) { req.destroy(); }   // don't buffer unbounded bodies
    });
    req.on('end', () => {
      let body;
      try { body = JSON.parse(raw); } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: { message: 'invalid JSON', type: 'invalid_request_error' } }));
      }
      handleChat(req, res, body);
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { message: 'not found', type: 'invalid_request_error' } }));
});

server.listen(PORT, '127.0.0.1', () => {
  log(`opencode-shim listening on http://127.0.0.1:${PORT}  -> opencode ${OC} (agent=${AGENT})`);
});
