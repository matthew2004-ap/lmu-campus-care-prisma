
'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCheck,
  Inbox,
  Mail,
  MailOpen,
  MessageSquare,
  PenSquare,
  RefreshCw,
  Search,
  Send,
  UserRound,
  Users,
  X,
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

const dateTime = (value: string) =>
  new Date(value).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const shortDate = (value: string) =>
  new Date(value).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

function initials(name?: string) {
  if (!name) return 'CC';

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function MessagingView() {
  const [folder, setFolder] = useState<Folder>('inbox');
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipients, setRecipients] = useState<Person[]>([]);
  const [selected, setSelected] = useState<Message | null>(null);

  const [composing, setComposing] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [searchText, setSearchText] = useState('');

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

    try {
      const response = await fetch(
        `/api/messages/${encodeURIComponent(message.id)}`,
        { cache: 'no-store' },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to open message.');
      }

      // Supports the API response containing { message: ... }.
      // Also tolerates an older response returning the message directly.
      const fullMessage: Message = data.message || data;

      setSelected(fullMessage);

      if (folder === 'inbox' && !message.isRead) {
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
          subject: subject.trim(),
          body: body.trim(),
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
      setSelected(null);
      setFolder('sent');
      setNotice('Your message has been sent successfully.');

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
    setSearchText('');
    setError('');
    setNotice('');
  }

  function startCompose() {
    setSelected(null);
    setComposing(true);
    setError('');
    setNotice('');
  }

  const unreadCount = messages.filter(
    (message) => !message.isRead,
  ).length;

  const filteredMessages = messages.filter((message) => {
    const person =
      folder === 'inbox' ? message.sender : message.recipient;

    const searchValue = [
      person?.name,
      person?.email,
      message.subject,
      message.body,
    ]
      .join(' ')
      .toLowerCase();

    return searchValue.includes(searchText.toLowerCase().trim());
  });

  const selectedPerson =
    folder === 'inbox' ? selected?.sender : selected?.recipient;

  return (
    <div className="cc-messaging">
      <section className="cc-message-header">
        <div className="cc-message-heading">
          <div className="cc-heading-icon">
            <MessageSquare size={23} />
          </div>

          <div>
            <span className="cc-eyebrow">
              CAMPUS CARE · COMMUNICATIONS
            </span>
            <h2>Messages</h2>
            <p>
              Your private communication space for the Landmark
              University community.
            </p>
          </div>
        </div>

        {!composing && (
          <button
            type="button"
            className="cc-compose-button"
            onClick={startCompose}
          >
            <PenSquare size={17} />
            <span>New message</span>
          </button>
        )}
      </section>

      {error && (
        <div className="cc-alert cc-alert-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setError('')}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {notice && (
        <div className="cc-alert cc-alert-success" role="status">
          <CheckCheck size={18} />
          <span>{notice}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setNotice('')}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section className="cc-message-workspace">
        <aside className="cc-message-sidebar">
          <div className="cc-sidebar-label">YOUR MAILBOX</div>

          <button
            type="button"
            className={`cc-folder-button ${
              folder === 'inbox' ? 'active' : ''
            }`}
            onClick={() => changeFolder('inbox')}
          >
            <Inbox size={19} />
            <span>Inbox</span>

            {folder === 'inbox' && unreadCount > 0 && (
              <span className="cc-count">{unreadCount}</span>
            )}
          </button>

          <button
            type="button"
            className={`cc-folder-button ${
              folder === 'sent' ? 'active' : ''
            }`}
            onClick={() => changeFolder('sent')}
          >
            <Send size={18} />
            <span>Sent messages</span>
          </button>

          <div className="cc-sidebar-divider" />

          <div className="cc-mailbox-note">
            <Users size={20} />
            <strong>Campus community</strong>
            <p>
              Communicate with available students and authorised
              Student Council members.
            </p>
          </div>
        </aside>

        <div className="cc-message-main">
          {composing ? (
            <div className="cc-compose-view">
              <div className="cc-view-heading">
                <button
                  type="button"
                  className="cc-back-button"
                  onClick={() => setComposing(false)}
                >
                  <ArrowLeft size={17} />
                  Back to messages
                </button>

                <span className="cc-eyebrow">NEW MESSAGE</span>
                <h3>Compose a message</h3>
                <p>Write your message and choose a recipient.</p>
              </div>

              <form className="cc-compose-form" onSubmit={sendMessage}>
                <label className="cc-field">
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

                <label className="cc-field">
                  <span>Subject</span>
                  <input
                    value={subject}
                    onChange={(event) =>
                      setSubject(event.target.value)
                    }
                    maxLength={200}
                    minLength={2}
                    placeholder="Enter a clear subject"
                    required
                  />
                </label>

                <label className="cc-field">
                  <span>Message</span>
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={8}
                    maxLength={10000}
                    minLength={2}
                    placeholder="Write your message here..."
                    required
                  />
                  <small className="cc-character-count">
                    {body.length.toLocaleString()}/10,000 characters
                  </small>
                </label>

                <div className="cc-compose-footer">
                  <p>
                    <Mail size={15} />
                    Your message will be stored in Campus Care.
                  </p>

                  <button
                    className="cc-send-button"
                    type="submit"
                    disabled={
                      sending ||
                      !recipients.length ||
                      !recipientId ||
                      !subject.trim() ||
                      !body.trim()
                    }
                  >
                    <Send size={17} />
                    {sending ? 'Sending message...' : 'Send message'}
                  </button>
                </div>
              </form>
            </div>
          ) : selected ? (
            <article className="cc-detail-view">
              <div className="cc-detail-toolbar">
                <button
                  type="button"
                  className="cc-back-button"
                  onClick={() => setSelected(null)}
                >
                  <ArrowLeft size={17} />
                  Back to {folder === 'inbox' ? 'inbox' : 'sent'}
                </button>

                <span className="cc-detail-folder">
                  {folder === 'inbox' ? (
                    <Inbox size={15} />
                  ) : (
                    <Send size={15} />
                  )}
                  {folder === 'inbox' ? 'Inbox' : 'Sent'}
                </span>
              </div>

              <div className="cc-detail-title">
                <div className="cc-detail-icon">
                  <MailOpen size={23} />
                </div>

                <div>
                  <span className="cc-eyebrow">MESSAGE DETAILS</span>
                  <h2>{selected.subject}</h2>
                </div>
              </div>

              <div className="cc-sender-card">
                <div className="cc-person-avatar">
                  {initials(selectedPerson?.name)}
                </div>

                <div className="cc-person-info">
                  <span className="cc-person-label">
                    {folder === 'inbox' ? 'FROM' : 'SENT TO'}
                  </span>

                  <strong>
                    {selectedPerson?.name || 'Campus Care user'}
                  </strong>

                  {selectedPerson?.email && (
                    <span className="cc-person-email">
                      {selectedPerson.email}
                    </span>
                  )}
                </div>

                <div className="cc-date-info">
                  <span>DATE SENT</span>
                  <strong>{dateTime(selected.createdAt)}</strong>
                </div>
              </div>

              <div className="cc-message-content">
                <div className="cc-content-label">MESSAGE</div>
                <p>{selected.body}</p>
              </div>

              <div className="cc-detail-footer">
                <Mail size={16} />
                <span>
                  This message is part of your Campus Care
                  communications.
                </span>
              </div>
            </article>
          ) : (
            <>
              <div className="cc-list-header">
                <div>
                  <h3>
                    {folder === 'inbox' ? 'Inbox' : 'Sent messages'}
                  </h3>
                  <p>
                    {loading
                      ? 'Loading your messages...'
                      : `${messages.length} ${
                          messages.length === 1 ? 'message' : 'messages'
                        }`}
                    {folder === 'inbox' && unreadCount > 0
                      ? ` · ${unreadCount} unread`
                      : ''}
                  </p>
                </div>

                <button
                  type="button"
                  className="cc-icon-button"
                  aria-label="Refresh messages"
                  title="Refresh messages"
                  disabled={loading}
                  onClick={() => {
                    void loadMessages();
                    void loadRecipients();
                  }}
                >
                  <RefreshCw
                    size={17}
                    className={loading ? 'cc-spinning' : ''}
                  />
                </button>
              </div>

              <div className="cc-search">
                <Search size={18} />
                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search messages, people or subjects..."
                  aria-label="Search messages"
                />

                {searchText && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearchText('')}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {loading ? (
                <div className="cc-empty-state">
                  <span className="cc-spinner" />
                  <p>Loading your messages...</p>
                </div>
              ) : filteredMessages.length ? (
                <div className="cc-message-list">
                  {filteredMessages.map((message) => {
                    const person =
                      folder === 'inbox'
                        ? message.sender
                        : message.recipient;

                    const unread =
                      folder === 'inbox' && !message.isRead;

                    return (
                      <button
                        type="button"
                        className={`cc-message-row ${
                          unread ? 'cc-unread' : ''
                        }`}
                        key={message.id}
                        onClick={() => void openMessage(message)}
                      >
                        <span className="cc-row-avatar">
                          {initials(person?.name)}
                        </span>

                        <span className="cc-row-content">
                          <span className="cc-row-top">
                            <strong>
                              {person?.name || 'Campus Care user'}
                            </strong>

                            <time dateTime={message.createdAt}>
                              {shortDate(message.createdAt)}
                            </time>
                          </span>

                          <span className="cc-row-subject">
                            {message.subject}
                          </span>

                          <span className="cc-row-preview">
                            {message.body.replace(/\s+/g, ' ').slice(0, 120)}
                            {message.body.length > 120 ? '…' : ''}
                          </span>
                        </span>

                        <span className="cc-row-status">
                          {unread ? (
                            <span
                              className="cc-unread-indicator"
                              aria-label="Unread"
                              title="Unread message"
                            />
                          ) : (
                            <Mail size={17} />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="cc-empty-state">
                  <div className="cc-empty-icon">
                    {searchText ? (
                      <Search size={28} />
                    ) : folder === 'inbox' ? (
                      <Inbox size={29} />
                    ) : (
                      <Send size={28} />
                    )}
                  </div>

                  <h3>
                    {searchText
                      ? 'No matching messages'
                      : folder === 'inbox'
                        ? 'Your inbox is empty'
                        : 'No sent messages yet'}
                  </h3>

                  <p>
                    {searchText
                      ? 'Try another search term.'
                      : folder === 'inbox'
                        ? 'Messages sent to you will appear here.'
                        : 'Messages you send will appear here.'}
                  </p>

                  {!searchText && folder === 'sent' && (
                    <button
                      type="button"
                      className="cc-compose-button"
                      onClick={startCompose}
                    >
                      <PenSquare size={16} />
                      Compose your first message
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

