import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { usePageTitle } from '../hooks/usePageTitle';

type NotificationItem = {
  id: string;
  type: 'APPLICATION_STATUS' | 'NEW_APPLICATION' | 'MESSAGE' | 'SYSTEM';
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

function timeLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function Notifications() {
    usePageTitle("Notifications");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api<NotificationItem[]>('/notifications')
      .then(setItems)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not load notifications.'))
      .finally(() => setLoading(false));
  }, []);

  async function markRead(item: NotificationItem) {
    if (item.readAt) return;
    try {
      const updated = await api<NotificationItem>(`/notifications/${item.id}/read`, { method: 'PATCH' });
      setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update notification.');
    }
  }

  async function markAllRead() {
    try {
      await api<{ updated: number }>('/notifications/read-all', { method: 'PATCH' });
      setItems((current) => current.map((item) => item.readAt ? item : { ...item, readAt: new Date().toISOString() }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update notifications.');
    }
  }

  return (
    <main className="jobs-page">
      <section className="jobs-container">
        <div className="applications-header">
          <div>
            <p className="eyebrow">CAREERHUB</p>
            <h1>Notifications</h1>
            <p>Updates about your applications and messages.</p>
          </div>
          {items.some((item) => !item.readAt) && <button className="secondary-button" type="button" onClick={markAllRead}>Mark all as read</button>}
        </div>

        {error && <p className="message" role="alert">{error}</p>}
        {loading ? (
          <section className="jobs-state" aria-live="polite"><div className="jobs-loader" /><h2>Loading notifications...</h2></section>
        ) : items.length === 0 ? (
          <section className="jobs-state"><h2>You’re all caught up</h2><p>New updates will appear here.</p></section>
        ) : (
          <div className="notification-list">
            {items.map((item) => (
              <article className={`notification-card${item.readAt ? '' : ' unread'}`} key={item.id}>
                <div className="notification-copy">
                  <div className="notification-heading"><h2>{item.title}</h2>{!item.readAt && <span className="notification-dot" aria-label="Unread" />}</div>
                  <p>{item.body}</p>
                  <time dateTime={item.createdAt}>{timeLabel(item.createdAt)}</time>
                </div>
                {!item.readAt && <button className="secondary-button" type="button" onClick={() => markRead(item)}>Mark as read</button>}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
