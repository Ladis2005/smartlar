type Level = 'info' | 'warn' | 'error';

const REDACTED = '[oculto]';
const SENSITIVE = /token|key|secret|authorization|password/i;

/** Remove qualquer campo que possa conter credenciais antes de escrever no log. */
export function redact(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE.test(key)) {
      out[key] = REDACTED;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = redact(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function write(level: Level, event: string, data: Record<string, unknown> = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...redact(data),
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, data?: Record<string, unknown>) => write('info', event, data),
  warn: (event: string, data?: Record<string, unknown>) => write('warn', event, data),
  error: (event: string, data?: Record<string, unknown>) => write('error', event, data),
};
