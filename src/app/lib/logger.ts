const DEV = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => { if (DEV) console.log(...args); },
  warn: (...args: unknown[]) => { if (DEV) console.warn(...args); },
  error: (...args: unknown[]) => { if (DEV) console.error(...args); },
};
