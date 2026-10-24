
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  CheckCheck,
  Inbox,
  LoaderCircle,
  MessageSquare,
  X,
} from 'lucide-react';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

type NotificationResponse = {
  notifications: NotificationItem[];
  unreadCount: number;
};

function formatNotificationDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const now = Date.now();
  const difference = Math.max(0, now - date.getTime());

  if (difference < 60_000) return 'Just now';
  if (difference < 3_600_000) {
    return `${Math.floor(difference / 60_000)}m ago`;
  }
  if (difference < 86_400_000) {
    return `${Math.floor(difference / 3_600_000)}h ago`;
  }
  if (difference < 604_800_000) {
    return `${Math.floor(difference / 86_400_000)}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function NotificationBell() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      const response = await fetch('/api/notifications', {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });

      if (response.status === 401) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Unable to load notifications.');
      }

      const data = result as NotificationResponse;

      setNotifications(
        Array.isArray(data.notifications) ? data.notifications : [],
      );
      setUnreadCount(
        Number.isFinite(data.unreadCount) ? data.unreadCount : 0,
      );
      setError('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load notifications.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications(true);

    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const markAsRead = async (id: string) => {
    const previous = notifications;

    setUpdatingId(id);
    setError('');

    setNotifications((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              isRead: true,
              readAt: new Date().toISOString(),
            }
          : item,
      ),
    );

    setUnreadCount((count) =>
      Math.max(
        0,
        count - (previous.find((item) => item.id === id && !item.isRead) ? 1 : 0),
      ),
    );

    try {
      const response = await fetch(`/api/notifications/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Accept: 'application/json' },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Unable to update notification.');
      }

      await loadNotifications();
    } catch (err) {
      setNotifications(previous);
      await loadNotifications();

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update notification.',
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0 || markingAll) return;

    setMarkingAll(true);
    setError('');

    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Unable to update notifications.');
      }

      setNotifications((items) =>
        items.map((item) => ({
          ...item,
          isRead: true,
          readAt: item.readAt || new Date().toISOString(),
        })),
      );

      setUnreadCount(0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to mark notifications as read.',
      );

      await loadNotifications();
    } finally {
      setMarkingAll(false);
    }
  };

  const openNotification = async (item: NotificationItem) => {
    if (!item.isRead) {
      await markAsRead(item.id);
    }

    setOpen(false);

    // Only navigate to local application paths.
    const safeLink =
      item.link &&
      item.link.startsWith('/') &&
      !item.link.startsWith('//') &&
      !item.link.includes('\\')
        ? item.link
        : '/student';

    if (safeLink.startsWith('/portal')) {
      router.push('/student?tab=messages');
    } else {
      router.push(safeLink);
    }
  };

  return (
    <div className="cc-notification" ref={containerRef}>
      <button
        type="button"
        className={`notification-button ${open ? 'is-open' : ''}`}
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);

          if (nextOpen) {
            void loadNotifications(true);
          }
        }}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell size={18} />

        {unreadCount > 0 && (
          <span className="cc-notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          className="cc-notification-panel"
          role="dialog"
          aria-label="Notifications"
        >
          <header className="cc-notification-panel-header">
            <div>
              <span className="section-kicker">CAMPUS CARE</span>
              <h3>Notifications</h3>
              <p>
                {unreadCount === 0
                  ? 'You are all caught up.'
                  : `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`}
              </p>
            </div>

            <button
              type="button"
              className="cc-notification-close"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
            >
              <X size={17} />
            </button>
          </header>

          {unreadCount > 0 && (
            <div className="cc-notification-actions">
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={markingAll}
              >
                {markingAll ? (
                  <LoaderCircle size={14} className="cc-notification-spin" />
                ) : (
                  <CheckCheck size={14} />
                )}
                Mark all as read
              </button>
            </div>
          )}

          {error && (
            <div className="cc-notification-error" role="alert">
              {error}
              <button
                type="button"
                onClick={() => setError('')}
                aria-label="Dismiss error"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="cc-notification-list">
            {loading ? (
              <div className="cc-notification-state">
                <LoaderCircle
                  size={22}
                  className="cc-notification-spin"
                />
                <span>Loading notifications…</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="cc-notification-state">
                <span className="cc-notification-empty-icon">
                  <Inbox size={25} />
                </span>
                <b>No notifications yet</b>
                <span>Updates about your campus activity will appear here.</span>
              </div>
            ) : (
              notifications.map((item) => (
                <article
                  key={item.id}
                  className={`cc-notification-item ${item.isRead ? 'read' : 'unread'}`}
                >
                  <span className="cc-notification-item-icon">
                    {item.type === 'MESSAGE' ? (
                      <MessageSquare size={17} />
                    ) : (
                      <Bell size={17} />
                    )}
                  </span>

                  <button
                    type="button"
                    className="cc-notification-item-content"
                    onClick={() => void openNotification(item)}
                  >
                    <span className="cc-notification-item-title">
                      {item.title}
                      {!item.isRead && (
                        <span className="cc-notification-unread-dot" />
                      )}
                    </span>

                    <span className="cc-notification-item-message">
                      {item.message}
                    </span>

                    <span className="cc-notification-item-time">
                      {formatNotificationDate(item.createdAt)}
                    </span>
                  </button>

                  {!item.isRead && (
                    <button
                      type="button"
                      className="cc-notification-read-button"
                      title="Mark as read"
                      aria-label={`Mark ${item.title} as read`}
                      disabled={updatingId === item.id}
                      onClick={() => void markAsRead(item.id)}
                    >
                      {updatingId === item.id ? (
                        <LoaderCircle
                          size={15}
                          className="cc-notification-spin"
                        />
                      ) : (
                        <Check size={15} />
                      )}
                    </button>
                  )}
                </article>
              ))
            )}
          </div>

          <footer className="cc-notification-footer">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push('/student?tab=messages');
              }}
            >
              <MessageSquare size={15} />
              Open Messages
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}

