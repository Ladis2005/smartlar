'use client';

import { useState } from 'react';

import { signInAdmin } from '@/server/actions/auth';

export function LoginForm() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(event.currentTarget);
    try {
      const result = await signInAdmin(formData);
      if (result?.error) setError(result.error);
    } catch {
      // O redirecionamento após login bem-sucedido chega aqui como exceção.
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-6">
      <div>
        <label className="label" htmlFor="email">
          E-mail
        </label>
        <input id="email" name="email" type="email" className="field" autoComplete="email" required />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Palavra-passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="field"
          autoComplete="current-password"
          required
        />
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? 'A entrar…' : 'Entrar no painel'}
      </button>
    </form>
  );
}
