/**
 * Error reporting. Always logs to stderr; when SENTRY_DSN is set, errors are
 * also sent to Sentry through its HTTP envelope API (no SDK needed).
 */

type ErrorContext = Record<string, unknown>;

type ParsedDsn = { endpoint: string; publicKey: string };

let cachedDsn: ParsedDsn | null | undefined;

function parseDsn(): ParsedDsn | null {
  if (cachedDsn !== undefined) {
    return cachedDsn;
  }

  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    cachedDsn = null;
    return null;
  }

  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, "");

    cachedDsn = {
      endpoint: `${url.protocol}//${url.host}/api/${projectId}/envelope/`,
      publicKey: url.username,
    };
  } catch {
    console.error("Invalid SENTRY_DSN; error reporting disabled");
    cachedDsn = null;
  }

  return cachedDsn;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }

  return new Error(typeof value === "string" ? value : JSON.stringify(value));
}

export async function captureException(
  error: unknown,
  context: ErrorContext = {},
): Promise<void> {
  const dsn = parseDsn();

  if (!dsn) {
    return;
  }

  const err = toError(error);
  const eventId = crypto.randomUUID().replace(/-/g, "");

  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: "node",
    level: "error",
    environment: process.env.NODE_ENV,
    exception: {
      values: [
        {
          type: err.name,
          value: err.message,
          stacktrace: err.stack
            ? {
                frames: err.stack
                  .split("\n")
                  .slice(1)
                  .reverse()
                  .map((line) => ({ function: line.trim() })),
              }
            : undefined,
        },
      ],
    },
    extra: context,
  };

  const envelope = [
    JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }),
    JSON.stringify({ type: "event" }),
    JSON.stringify(event),
  ].join("\n");

  try {
    await fetch(dsn.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=bookmyplay/1.0, sentry_key=${dsn.publicKey}`,
      },
      body: envelope,
    });
  } catch (sendError) {
    console.error("Failed to report error to Sentry:", sendError);
  }
}

/**
 * Drop-in replacement for console.error in route handlers: logs every argument
 * and reports the first Error found (or the message) to the error tracker.
 */
export function logError(...args: unknown[]): void {
  console.error(...args);

  const error = args.find((arg) => arg instanceof Error) ?? args[0];
  const message = typeof args[0] === "string" ? args[0] : undefined;

  void captureException(error, message ? { message } : {});
}
