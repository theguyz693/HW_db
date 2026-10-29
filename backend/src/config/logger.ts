// ──────────────────────────────────────────────
// Logger — simple structured logging
// ──────────────────────────────────────────────

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

const currentLevel: LogLevel = (process.env['LOG_LEVEL'] as LogLevel) || 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  return [prefix, message, ...args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : a))].join(
    ' ',
  );
}

export const logger = {
  error(message: string, ...args: unknown[]): void {
    if (shouldLog('error')) console.error(formatMessage('error', message, ...args));
  },
  warn(message: string, ...args: unknown[]): void {
    if (shouldLog('warn')) console.warn(formatMessage('warn', message, ...args));
  },
  info(message: string, ...args: unknown[]): void {
    if (shouldLog('info')) console.log(formatMessage('info', message, ...args));
  },
  debug(message: string, ...args: unknown[]): void {
    if (shouldLog('debug')) console.log(formatMessage('debug', message, ...args));
  },
};
