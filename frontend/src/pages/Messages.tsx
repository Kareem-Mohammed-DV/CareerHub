import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getConversations, getMessages, sendMessage, type Conversation, type Message } from '../api/messages';
import { usePageTitle } from '../hooks/usePageTitle';

function contactName(item: Conversation, role?: string) {
  if (role !== 'COMPANY' || !item.jobSeeker) return item.company.name;
  const full = `${item.jobSeeker.profile?.firstName ?? ''} ${item.jobSeeker.profile?.lastName ?? ''}`.trim();
  return full || item.jobSeeker.email;
}

export default function Messages() {
    usePageTitle("Messages");
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const refreshConversations = useCallback(async () => {
    const data = await getConversations();
    setConversations(data);
    setActive((current) => current ?? data[0]?.id ?? null);
  }, []);

  useEffect(() => {
    refreshConversations().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not load messages.')).finally(() => setLoading(false));
  }, [refreshConversations]);

  useEffect(() => {
    if (!active) { setMessages([]); return; }
    let cancelled = false;
    const load = () => getMessages(active).then((data) => { if (!cancelled) setMessages(data); }).catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Could not load this conversation.'); });
    void load();
    const timer = window.setInterval(() => { void load(); }, 12000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [active]);

  const visible = useMemo(() => conversations.filter((item) => contactName(item, user?.role).toLowerCase().includes(search.toLowerCase())), [conversations, search, user?.role]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const body = draft.trim();
    if (!active || !body || sending) return;
    setSending(true); setError('');
    try { const message = await sendMessage(active, body); setMessages((current) => [...current, message]); setDraft(''); await refreshConversations(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Message could not be sent.'); }
    finally { setSending(false); }
  }

  const current = conversations.find((item) => item.id === active);
  return <main className="messaging-page"><section className="messaging-shell">
    <aside className={`conversation-panel${active ? ' has-active' : ''}`}>
      <header><p className="eyebrow">CAREERHUB</p><h1>Messages</h1><label className="conversation-search"><span className="sr-only">Search conversations</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" /></label></header>
      {loading ? <div className="messaging-empty"><div className="jobs-loader" /><p>Loading conversations…</p></div> : visible.length ? <div className="conversation-list" role="listbox" aria-label="Conversations">
        {visible.map((item) => <button type="button" role="option" aria-selected={active === item.id} key={item.id} className={`conversation-option${active === item.id ? ' selected' : ''}`} onClick={() => setActive(item.id)}>
          <span className="conversation-avatar">{contactName(item, user?.role).slice(0,1).toUpperCase()}</span><span className="conversation-summary"><strong>{contactName(item, user?.role)}</strong><small>{item.messages[0]?.body ?? 'No messages yet'}</small></span>
        </button>)}
      </div> : <div className="messaging-empty"><h2>{search ? 'No matches' : 'No conversations yet'}</h2><p>{search ? 'Try another name.' : 'Conversations linked to your applications will appear here.'}</p></div>}
    </aside>
    <section className={`chat-panel${active ? ' has-active' : ''}`} aria-label="Conversation">
      {!current ? <div className="chat-empty"><span className="chat-empty-icon">✳</span><h2>Your career conversations</h2><p>Choose a conversation to read and reply.</p></div> : <>
        <header className="chat-header"><button className="chat-back" type="button" onClick={() => setActive(null)}>‹ Conversations</button><div><p className="eyebrow">{current.company.name}</p><h2>{contactName(current, user?.role)}</h2></div></header>
        <div className="chat-messages" aria-live="polite">{messages.map((message) => <article key={message.id} className={`chat-bubble${message.senderId === user?.id ? ' mine' : ''}`}><p>{message.body}</p><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time></article>)}</div>
        <form className="chat-compose" onSubmit={submit}><label className="sr-only" htmlFor="message-body">Write a message</label><textarea id="message-body" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={5000} rows={2} placeholder="Write a message…" /><button type="submit" className="primary-button" disabled={!draft.trim() || sending}>{sending ? 'Sending…' : 'Send'}</button></form>
      </>}
    </section>
    {error && <p className="message error messaging-error" role="alert">{error}</p>}
  </section></main>;
}
