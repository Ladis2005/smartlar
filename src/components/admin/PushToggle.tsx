'use client';

import { useEffect, useState } from 'react';

import { subscribeToPush, unsubscribeFromPush, sendTestPush } from '@/server/actions/push';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) output[i] = rawData.charCodeAt(i);
  return output;
}

type Status = 'unsupported' | 'checking' | 'off' | 'on' | 'denied';

export function PushToggle() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
  const [status, setStatus] = useState<Status>('checking');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!vapidPublicKey || typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    navigator.serviceWorker.register('/sw.js').then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      setStatus(existing ? 'on' : 'off');
    });
  }, [vapidPublicKey]);

  async function enable() {
    if (!vapidPublicKey) return;
    setBusy(true);
    setMessage('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }
      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const json = subscription.toJSON();
      const result = await subscribeToPush({
        endpoint: json.endpoint as string,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
      });
      setMessage(result.message);
      setStatus('on');
    } catch {
      setMessage('Não foi possível ativar. Tenta novamente.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage('');
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromPush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus('off');
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMessage('A enviar...');
    const result = await sendTestPush();
    setMessage(result.message);
    setBusy(false);
  }

  if (status === 'unsupported') return null;

  if (status === 'denied') {
    return (
      <p className="text-xs text-navy-500">
        Notificações bloqueadas no navegador. Ative-as nas definições do site para as receber.
      </p>
    );
  }

  if (status === 'checking') return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'off' ? (
        <button type="button" onClick={enable} disabled={busy} className="btn-outline text-xs">
          🔔 Ativar notificações neste aparelho
        </button>
      ) : (
        <>
          <span className="text-xs font-medium text-emerald-700">🔔 Notificações ativas neste aparelho</span>
          <button type="button" onClick={test} disabled={busy} className="btn-ghost text-xs">
            Testar
          </button>
          <button type="button" onClick={disable} disabled={busy} className="btn-ghost text-xs">
            Desativar
          </button>
        </>
      )}
      {message ? <span className="text-xs text-navy-500">{message}</span> : null}
    </div>
  );
}
