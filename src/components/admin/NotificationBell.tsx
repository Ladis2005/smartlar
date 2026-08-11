'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { formatMzn } from '@/lib/money';
import type { ActivityFeedItem } from '@/server/admin-data';

const STORAGE_KEY = 'smartlar_admin_notifications_last_seen';

const EVENT_TEXT: Record<string, (item: ActivityFeedItem) => string> = {
  order_created: (item) => `Novo pedido de ${item.customer_name ?? 'cliente'}`,
  payment_confirmed: (item) => `Pagamento confirmado — ${item.customer_name ?? 'cliente'}`,
};

function timeAgo(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'agora mesmo';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return `há ${Math.floor(hours / 24)} d`;
}

export function NotificationBell({ items }: { items: ActivityFeedItem[] }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lastSeen = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
    const count = items.filter((item) => new Date(item.created_at).getTime() > lastSeen).length;
    setUnread(count);
  }, [items]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggle() {
    setOpen((current) => !current);
    if (!open) {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      setUnread(0);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Notificações"
        className="btn-ghost relative flex h-10 w-10 items-center justify-center text-lg"
      >
        🔔
        {unread > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-navy-100 bg-white p-2 shadow-lg">
          <p className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-navy-500">Atividade recente</p>
          {items.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-navy-500">Sem notificações por agora.</p>
          ) : (
            <ul className="max-h-96 space-y-1 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.order_id ? `/admin/pedidos/${item.order_id}` : '/admin/pedidos'}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-2 py-2 text-sm hover:bg-navy-50"
                  >
                    <p className="font-medium text-navy-900">
                      {(EVENT_TEXT[item.event]?.(item) ?? item.event) +
                        (item.order_number ? ` — #${item.order_number}` : '')}
                    </p>
                    <p className="text-xs text-navy-500">
                      {item.total_cents ? `${formatMzn(item.total_cents)} • ` : ''}
                      {timeAgo(item.created_at)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
