
'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Inbox,
  Mail,
  MailOpen,
  PenSquare,
  RefreshCw,
  Send,
  UserRound,
} from 'lucide-react';

type Person = {
  id: string;
  name: string;
  email: string;
  role: string;
  councilRole: string | null;
};

type Message = {
  id: string;
  subject: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  sender?: Person;
  recipient?: Person;
};

type Folder = 'inbox' | 'sent';

export default function MessagingView() {
  const [folder, setFolder] = useState<Folder>('inbox');
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipients, setRecipients] = useState<Person[]>([]);
  const [selected, setSelected] = useState<Message | null>(null);
  const [composing, setComposing] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/messages?folder=${folder}`,
        { cache: 'no-store' },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to load messages.');
      }

      setMessages(data.messages || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load messages.',
      );
    } finally {
      setLoading(false);
    }
  }, [folder]);

  const loadRecipients = useCallback(async () => {
    try {
      const response = await fetch('/api/messages/recipients', {
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to load recipients.');
      }

      setRecipients(data.recipients || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load recipients.',
      );
    }
  }, []);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    void loadRecipients();
  }, [loadRecipients]);

  async function openMessage(message: Message) {
    setError('');
    setNotice('');

    if (folder === 'sent') {
      setSelected(message);
      return;
    }

    try {
      const response = await fetch(
        `/api/messages/${encodeURIComponent(message.id)}`,
        { cache: 'no-store' },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to open message.');
      }

      setSelected(data.message);

      if (!message.isRead) {
        await loadMessages();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to open message.',
      );
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId,
          subject,
          body,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to send message.');
      }

      setSubject('');
      setBody('');
      setRecipientId('');
      setComposing(false);
      setFolder('sent');
      setNotice('Message sent successfully.');
      setSelected(null);

      await loadMessages();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to send message.',
      );
    } finally {
      setSending(false);
    }
  }

  function changeFolder(next: Folder) {
    setFolder(next);
    setSelected(null);
    setComposing(false);
    setError('');
    setNotice('');
  }

  const unreadCount = messages.filter(
    (message) => !message.isRead,
  ).length;

  return (
    <div className="stack-lg">
      <section className="panel">
        <div className="panel-title-row">
          <div>
            <span className="section-kicker">
              CAMPUS CARE COMMUNICATIONS
            </span>
            <h3>Your messages</h3>
            <p>
              Communicate privately with students and authorised
              Student Council members.
            </p>
          </div>

          <button
            type="button"
            className="button button-dark"
            onClick={() => {
              setSelected(null);
              setComposing(true);
              setError('');
              setNotice('');
            }}
          >
            <PenSquare size={16} />
            Compose
          </button>
        </div>

        <div className="section-tabs">
          <button
            type="button"
            className={folder === 'inbox' ? 'active' : ''}
            onClick={() => changeFolder('inbox')}
          >
            <Inbox size={16} />
            Inbox
          </button>

          <button
            type="button"
            className={folder === 'sent' ? 'active' : ''}
            onClick={() => changeFolder('sent')}
          >
            <Send size={16} />
            Sent
          </button>

          <button
            type="button"
            className="message-refresh"
            onClick={() => {
              void loadMessages();
              void loadRecipients();
            }}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        {notice && (
          <div className="alert alert-success" role="status">
            {notice}
          </div>
        )}

        {composing ? (
          <form
            className="form-grid message-compose"
            onSubmit={sendMessage}
          >
            <div className="wide">
              <button
                type="button"
                className="text-action"
                onClick={() => setComposing(false)}
              >
                <ArrowLeft size={15} />
                Back to messages
              </button>
            </div>

            <label className="form-field wide">
              <span>Recipient</span>
              <select
                value={recipientId}
                onChange={(event) =>
                  setRecipientId(event.target.value)
                }
                required
              >
                <option value="">Choose a recipient</option>

                {recipients.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                    {person.councilRole
                      ? ` — ${person.councilRole.toUpperCase()}`
                      : ''}
                  </option>
                ))}
              </select>

              {!recipients.length && (
                <small>
                  No recipients are available, or the recipient
                  list has not loaded.
                </small>
              )}
            </label>

            <label className="form-field wide">
              <span>Subject</span>
              <input
                value={subject}
                onChange={(event) =>
                  setSubject(event.target.value)
                }
                maxLength={200}
                minLength={2}
                placeholder="What is your message about?"
                required
              />
            </label>

            <label className="form-field wide">
              <span>Message</span>
              <textarea
                value={body}
                onChange={(event) =>
                  setBody(event.target.value)
                }
                rows={7}
                maxLength={10000}
                minLength={2}
                placeholder="Write your message here..."
                required
              />
              <small>{body.length}/10,000 characters</small>
            </label>

            <div className="form-bottom wide">
              <span className="muted">
                Your message will be stored in Campus Care.
              </span>

              <button
                className="button button-dark"
                type="submit"
                disabled={sending || !recipients.length}
              >
                <Send size={16} />
                {sending ? 'Sending...' : 'Send message'}
              </button>
            </div>
          </form>
        ) : selected ? (
          <article className="message-detail">
            <button
              type="button"
              className="text-action"
              onClick={() => setSelected(null)}
            >
              <ArrowLeft size={15} />
              Back to {folder}
            </button>

            <div className="message-detail-heading">
              <span className="message-large-icon">
                <MailOpen size={22} />
              </span>

              <div>
                <span className="section-kicker">
                  MESSAGE DETAILS
                </span>
                <h3>{selected.subject}</h3>
              </div>
            </div>

            <div className="message-meta">
              <div>
                <span>
                  {folder === 'inbox' ? 'From' : 'To'}
                </span>
                <strong>
                  {folder === 'inbox'
                    ? selected.sender?.name || 'Unknown sender'
                    : selected.recipient?.name || 'Unknown recipient'}
                </strong>
              </div>

              <div>
                <span>Date</span>
                <strong>
                  {new Date(selected.createdAt).toLocaleString()}
                </strong>
              </div>
            </div>

            <div className="message-body">
              {selected.body}
            </div>
          </article>
        ) : loading ? (
          <div className="message-empty">
            <span className="spinner" />
            <p>Loading messages...</p>
          </div>
        ) : messages.length ? (
          <div className="message-list">
            {messages.map((message) => {
              const person =
                folder === 'inbox'
                  ? message.sender
                  : message.recipient;

              return (
                <button
                  type="button"
                  className={`message-row ${
                    !message.isRead && folder === 'inbox'
                      ? 'unread'
                      : ''
                  }`}
                  key={message.id}
                  onClick={() => void openMessage(message)}
                >
                  <span className="message-avatar">
                    {person?.name
                      ?.split(' ')
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || <UserRound size={18} />}
                  </span>

                  <span className="message-row-content">
                    <strong>{person?.name || 'Campus Care user'}</strong>
                    <span className="message-subject">
                      {message.subject}
                    </span>
                    <small>
                      {message.body.slice(0, 105)}
                      {message.body.length > 105 ? '…' : ''}
                    </small>
                  </span>

                  <span className="message-row-end">
                    {folder === 'inbox' && !message.isRead ? (
                      <span className="message-unread-dot" />
                    ) : (
                      <Mail size={16} />
                    )}

                    <small>
                      {new Date(message.createdAt).toLocaleDateString()}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="message-empty">
            <span className="message-empty-icon">
              <Mail size={27} />
            </span>
            <h3>
              {folder === 'inbox'
                ? 'Your inbox is empty'
                : 'No sent messages yet'}
            </h3>
            <p>
              {folder === 'inbox'
                ? 'Messages sent to you will appear here.'
                : 'Messages you send will appear here.'}
            </p>
            {folder === 'inbox' && unreadCount > 0 && (
              <small>{unreadCount} unread messages</small>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

