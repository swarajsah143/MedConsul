import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import {
  SendHorizonal,
  Bot,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Stethoscope,
  Sparkles,
  GraduationCap,
  BarChart3,
  ClipboardCheck,
  IndianRupee,
  ArrowDown,
  AlertCircle,
  History,
  Plus,
  X,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  error?: boolean;
}

interface SessionSummary {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
}

// ── API helpers ────────────────────────────────────────────

const API = '/api/chat';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiJson<T = any>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { ...opts, headers: { ...authHeaders(), ...opts.headers as any }, credentials: 'include' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: 'Request failed' }));
    throw { status: res.status, message: data.message || `Error ${res.status}`, retryAfter: data.retryAfter };
  }
  return res.json();
}

// ── Suggested Prompts ──────────────────────────────────────

const SUGGESTIONS = [
  { text: 'Which colleges can I get with AIR 45,000?', icon: GraduationCap },
  { text: 'Show MBBS colleges in Uttar Pradesh.', icon: GraduationCap },
  { text: 'Explain Round 2 counselling.', icon: BarChart3 },
  { text: 'Compare fees of private colleges.', icon: IndianRupee },
  { text: 'What documents are required for admission?', icon: ClipboardCheck },
];

// ── Markdown renderer (unchanged from original) ───────────

function renderContent(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  function flushTable() {
    if (tableRows.length < 2) return;
    const headers = tableRows[0];
    const body = tableRows.slice(2);
    elements.push(
      <div key={`table-${elements.length}`} className="overflow-x-auto my-3">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              {headers.map((h, i) => (
                <th key={i} className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-400">{h.trim()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} className="border-b border-slate-100 dark:border-slate-800">
                {row.map((cell, ci) => (
                  <td key={ci} className="py-2 px-3 text-slate-700 dark:text-slate-300">{cell.trim()}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${elements.length}`} className="bg-slate-900 text-slate-100 rounded-lg p-3 my-2 text-xs overflow-x-auto font-mono">{codeLines.join('\n')}</pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else { inCodeBlock = true; }
      continue;
    }
    if (inCodeBlock) { codeLines.push(line); continue; }
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (!inTable) inTable = true;
      tableRows.push(line.split('|').slice(1, -1));
      continue;
    } else if (inTable) { flushTable(); }
    if (line.startsWith('## ')) { elements.push(<h3 key={i} className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-3 mb-1">{line.slice(3)}</h3>); continue; }
    if (line.startsWith('### ')) { elements.push(<h4 key={i} className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2.5 mb-1">{line.slice(4)}</h4>); continue; }
    if (line.startsWith('> ')) { elements.push(<div key={i} className="border-l-2 border-red-300 dark:border-red-800 pl-3 my-2 text-xs text-slate-600 dark:text-slate-400 italic">{renderInline(line.slice(2))}</div>); continue; }
    if (line.startsWith('- ')) { elements.push(<div key={i} className="flex gap-2 text-xs text-slate-700 dark:text-slate-300 ml-1 my-0.5"><span className="text-red-500 mt-0.5 shrink-0">&#8226;</span><span>{renderInline(line.slice(2))}</span></div>); continue; }
    if (/^\d+\.\s/.test(line)) { const m = line.match(/^(\d+)\.\s(.*)$/); if (m) { elements.push(<div key={i} className="flex gap-2 text-xs text-slate-700 dark:text-slate-300 ml-1 my-0.5"><span className="text-red-500 font-semibold shrink-0">{m[1]}.</span><span>{renderInline(m[2])}</span></div>); continue; } }
    if (line.trim() === '') { elements.push(<div key={i} className="h-2" />); continue; }
    elements.push(<p key={i} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{renderInline(line)}</p>);
  }
  if (inTable) flushTable();
  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) parts.push(remaining.slice(0, boldMatch.index));
      parts.push(<strong key={key++} className="font-semibold text-slate-800 dark:text-slate-200">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      continue;
    }
    const codeMatch = remaining.match(/`(.+?)`/);
    if (codeMatch && codeMatch.index !== undefined) {
      if (codeMatch.index > 0) parts.push(remaining.slice(0, codeMatch.index));
      parts.push(<code key={key++} className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono text-red-600 dark:text-red-400">{codeMatch[1]}</code>);
      remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
      continue;
    }
    parts.push(remaining);
    break;
  }
  return <>{parts}</>;
}

// ── Main Component ─────────────────────────────────────────

export default function AiAssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    function onScroll() {
      if (!container) return;
      setShowScrollDown(container.scrollHeight - container.scrollTop - container.clientHeight > 150);
    }
    container.addEventListener('scroll', onScroll);
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`; }
  }, [input]);

  // Load session list on mount
  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      const res = await apiJson(`${API}/sessions`);
      if (res.success) setSessions(res.data.sessions);
    } catch { /* ignore */ }
  }

  async function createNewSession(): Promise<string> {
    const res = await apiJson(`${API}/sessions`, { method: 'POST' });
    const id = res.data.session.id;
    setSessionId(id);
    setMessages([]);
    setError(null);
    loadSessions();
    return id;
  }

  async function loadSession(id: string) {
    try {
      const res = await apiJson(`${API}/sessions/${id}`);
      if (res.success && res.data.session) {
        setSessionId(id);
        setMessages(
          res.data.session.messages
            .filter((m: any) => m.role !== 'system')
            .map((m: any, i: number) => ({
              id: `${m.role}-${i}-${Date.now()}`,
              role: m.role,
              content: m.content,
              timestamp: new Date(res.data.session.updatedAt),
            }))
        );
        setError(null);
        setShowHistory(false);
      }
    } catch { setError('Failed to load conversation'); }
  }

  async function deleteSession(id: string) {
    try {
      await apiJson(`${API}/sessions/${id}`, { method: 'DELETE' });
      if (sessionId === id) { setSessionId(null); setMessages([]); }
      loadSessions();
    } catch { /* ignore */ }
  }

  // ── Stream a message via SSE ─────────────────────────────

  const sendMessage = useCallback(async (text: string, sid?: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    setError(null);

    // Ensure we have a session
    let activeSession = sid || sessionId;
    if (!activeSession) {
      try {
        activeSession = await createNewSession();
      } catch {
        setError('Failed to create conversation. Please try again.');
        return;
      }
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Prepare streaming AI message
    const aiId = `ai-${Date.now()}`;
    setMessages((prev) => [...prev, { id: aiId, role: 'assistant', content: '', timestamp: new Date() }]);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API}/sessions/${activeSession}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: trimmed }),
        credentials: 'include',
        signal: abort.signal,
      });

      if (res.status === 429) {
        const data = await res.json();
        throw { message: data.message || 'Rate limit exceeded', retryAfter: data.retryAfter };
      }

      // 402 = free daily AI limit reached (upgrade to Premium for unlimited).
      if (res.status === 402) {
        const data = await res.json().catch(() => ({}));
        throw { message: data.message || 'Upgrade to Premium for unlimited answers.' };
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw { message: data.message || `Error ${res.status}` };
      }

      // Read SSE stream
      const reader = res.body?.getReader();
      if (!reader) throw { message: 'No response stream' };

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith('data: ')) continue;

          try {
            const event = JSON.parse(trimmedLine.slice(6));

            if (event.type === 'chunk') {
              setMessages((prev) =>
                prev.map((m) => m.id === aiId ? { ...m, content: m.content + event.content } : m)
              );
            } else if (event.type === 'done') {
              // Streaming complete
            } else if (event.type === 'error') {
              throw { message: event.message };
            }
          } catch (parseErr: any) {
            if (parseErr.message && parseErr.message !== 'Unexpected end of JSON input') throw parseErr;
          }
        }
      }

      loadSessions();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled — keep partial content
      } else {
        const errorMsg = err.retryAfter
          ? `Rate limited. Try again in ${err.retryAfter}s.`
          : err.message || 'Failed to get response. Please try again.';
        setError(errorMsg);
        // Mark the AI message as error
        setMessages((prev) =>
          prev.map((m) => m.id === aiId ? { ...m, content: m.content || 'Failed to generate response.', error: true } : m)
        );
      }
    } finally {
      setIsTyping(false);
      abortRef.current = null;
    }
  }, [isTyping, sessionId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleCopy = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegenerate = async () => {
    if (!sessionId || messages.length < 2 || isTyping) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    setError(null);

    // Remove last assistant message from UI
    setMessages((prev) => {
      const idx = prev.findLastIndex((m) => m.role === 'assistant');
      return idx === -1 ? prev : prev.slice(0, idx);
    });

    setIsTyping(true);

    const aiId = `ai-regen-${Date.now()}`;
    setMessages((prev) => [...prev, { id: aiId, role: 'assistant', content: '', timestamp: new Date() }]);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API}/sessions/${sessionId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
        signal: abort.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw { message: data.message || `Error ${res.status}` };
      }

      const reader = res.body?.getReader();
      if (!reader) throw { message: 'No response stream' };
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data: ')) continue;
          try {
            const ev = JSON.parse(t.slice(6));
            if (ev.type === 'chunk') {
              setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, content: m.content + ev.content } : m));
            } else if (ev.type === 'error') { throw { message: ev.message }; }
          } catch (pe: any) { if (pe.message && !pe.message.includes('JSON')) throw pe; }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Regeneration failed');
        setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, error: true, content: m.content || 'Failed.' } : m));
      }
    } finally {
      setIsTyping(false);
      abortRef.current = null;
    }
  };

  const handleClear = () => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setSessionId(null);
    setIsTyping(false);
    setError(null);
  };

  const handleNewChat = () => {
    handleClear();
    setShowHistory(false);
  };

  const handleRetry = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    // Remove the error message
    setMessages((prev) => {
      const idx = prev.findLastIndex((m) => m.role === 'assistant' && m.error);
      return idx === -1 ? prev : prev.slice(0, idx);
    });
    sendMessage(lastUser.content, sessionId || undefined);
  };

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U';
  const hasMessages = messages.length > 0;
  const lastMsgIsError = messages.length > 0 && messages[messages.length - 1].error;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] -m-4 sm:-m-6 relative z-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white shadow-sm">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 dark:text-slate-200">MedAssist</h1>
            <p className="text-[10px] text-slate-400">AI Counselling Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="text-xs gap-1.5 h-8">
            <History className="w-3.5 h-3.5" /> <span className="hidden sm:inline">History</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleNewChat} className="text-xs gap-1.5 h-8">
            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">New</span>
          </Button>
          {hasMessages && (
            <>
              <Button variant="ghost" size="sm" onClick={handleRegenerate} disabled={isTyping || messages.length < 2} className="text-xs gap-1.5 h-8">
                <RefreshCw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Regenerate</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClear} className="text-xs gap-1.5 h-8 text-slate-500 hover:text-red-600">
                <Trash2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Clear</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Session History Panel */}
      {showHistory && (
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 sm:px-6 py-3 animate-fade-in max-h-52 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conversations</p>
            <button onClick={() => setShowHistory(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
          </div>
          {sessions.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">No previous conversations.</p>
          ) : (
            <div className="space-y-1">
              {sessions.map((s) => (
                <div key={s.id} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${sessionId === s.id ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                  <button onClick={() => loadSession(s.id)} className="flex-1 text-left truncate font-medium">{s.title}</button>
                  <button onClick={() => deleteSession(s.id)} className="p-1 text-slate-400 hover:text-red-500 shrink-0"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="px-4 sm:px-6 py-2 bg-red-50 dark:bg-red-950/20 border-b border-red-200 dark:border-red-900 animate-fade-in">
          <div className="flex items-center gap-2 max-w-3xl mx-auto">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-400 flex-1">{error}</p>
            {lastMsgIsError && (
              <Button variant="ghost" size="sm" onClick={handleRetry} className="text-xs h-7 text-red-600 hover:bg-red-100">
                Retry
              </Button>
            )}
            <button onClick={() => setError(null)} className="p-1 text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative">
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center min-h-full px-4 py-10 page-enter">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-white shadow-lg mb-6">
              <Stethoscope className="w-8 h-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 text-center tracking-tight">
              Hi, I'm MedAssist
            </h2>
            <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
              Ask me anything about NEET counselling, colleges, fees, cutoffs, documents, and admissions.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-8 w-full max-w-xl">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => { setInput(s.text); textareaRef.current?.focus(); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-red-300 dark:hover:border-red-800 hover:shadow-md text-left transition-all duration-200 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/20 flex items-center justify-center shrink-0 group-hover:bg-red-100 dark:group-hover:bg-red-950/40 transition-colors">
                    <s.icon className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-400 leading-snug">{s.text}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 mt-8 text-[10px] text-slate-400">
              <Sparkles className="w-3 h-3" />
              <span>Answers are drawn from MedCounsel's verified counselling data</span>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className={`min-w-0 max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'gradient-primary text-white rounded-br-md'
                        : msg.error
                        ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-bl-md'
                        : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-bl-md'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      renderContent(msg.content)
                    )}
                  </div>
                  {msg.role === 'assistant' && msg.content && (
                    <div className="flex items-center gap-1 mt-1.5 ml-1">
                      <button onClick={() => handleCopy(msg.id, msg.content)} className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" aria-label="Copy response">
                        {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      {msg.error && (
                        <button onClick={handleRetry} className="p-1 rounded text-red-400 hover:text-red-600 transition-colors" aria-label="Retry">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span className="text-[10px] text-slate-300 dark:text-slate-600">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 mt-0.5 text-[10px] font-bold">
                    {userInitial}
                  </div>
                )}
              </div>
            ))}

            {isTyping && messages[messages.length - 1]?.content === '' && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[10px] text-slate-400 ml-1">MedAssist is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {showScrollDown && (
          <button onClick={() => scrollToBottom()} className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all animate-fade-in" aria-label="Scroll to bottom">
            <ArrowDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 py-3 shrink-0">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 focus-within:border-red-300 dark:focus-within:border-red-800 focus-within:ring-2 focus-within:ring-red-100 dark:focus-within:ring-red-950/30 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask MedAssist anything..."
              rows={1}
              className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 min-h-[24px] max-h-[160px] py-1 leading-relaxed"
              disabled={isTyping}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isTyping} className="w-8 h-8 rounded-lg shrink-0">
              <SendHorizonal className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-2">
            MedAssist may produce inaccurate information. Verify with official counselling portals.
          </p>
        </form>
      </div>
    </div>
  );
}
