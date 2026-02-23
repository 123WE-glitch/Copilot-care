import https from 'https';

export interface PostJsonOptions {
  url: string;
  headers: Record<string, string>;
  body: unknown;
  timeoutMs: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

const RETRYABLE_HTTP_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const RETRYABLE_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ENOTFOUND',
  'EPIPE',
]);

export class LLMHttpStatusError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'LLMHttpStatusError';
    this.statusCode = statusCode;
  }
}

export type LLMTransportErrorCode =
  | 'ERR_LLM_INVALID_JSON'
  | 'ERR_LLM_TIMEOUT'
  | 'ERR_LLM_REQUEST_FAILED';

export class LLMTransportError extends Error {
  public readonly transportCode: LLMTransportErrorCode;

  constructor(
    transportCode: LLMTransportErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = 'LLMTransportError';
    this.transportCode = transportCode;
    if (options && 'cause' in options) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof LLMHttpStatusError) {
    return RETRYABLE_HTTP_STATUS.has(error.statusCode);
  }

  if (error instanceof LLMTransportError) {
    return error.transportCode === 'ERR_LLM_TIMEOUT';
  }

  if (error instanceof Error) {
    const networkCode = (error as NodeJS.ErrnoException).code;
    if (networkCode && RETRYABLE_NETWORK_CODES.has(networkCode)) {
      return true;
    }

    const normalizedMessage = error.message.toLowerCase();
    if (normalizedMessage.includes('timeout')) {
      return true;
    }
  }

  return false;
}

async function postJsonSingleAttempt(options: PostJsonOptions): Promise<unknown> {
  const target = new URL(options.url);
  const payload = JSON.stringify(options.body);

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port ? Number(target.port) : 443,
        path: `${target.pathname}${target.search}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...options.headers,
        },
      },
      (response) => {
        let data = '';
        response.setEncoding('utf8');

        response.on('data', (chunk: string) => {
          data += chunk;
        });

        response.on('end', () => {
          const status = response.statusCode ?? 0;
          if (status >= 400) {
            reject(
              new LLMHttpStatusError(
                status,
                `LLM HTTP ${status}: ${data.slice(0, 300) || 'empty body'}`,
              ),
            );
            return;
          }

          if (!data) {
            resolve({});
            return;
          }

          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(
              new LLMTransportError(
                'ERR_LLM_INVALID_JSON',
                `LLM response is not valid JSON: ${
                  error instanceof Error ? error.message : 'unknown error'
                }`,
                { cause: error },
              ),
            );
          }
        });
      },
    );

    request.on('error', (error) => {
      reject(error);
    });

    request.setTimeout(options.timeoutMs, () => {
      request.destroy(
        new LLMTransportError(
          'ERR_LLM_TIMEOUT',
          `LLM request timeout after ${options.timeoutMs}ms`,
        ),
      );
    });

    request.write(payload);
    request.end();
  });
}

export async function postJson(options: PostJsonOptions): Promise<unknown> {
  const maxRetries = Math.max(0, options.maxRetries ?? 1);
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? 300);

  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      return await postJsonSingleAttempt(options);
    } catch (error) {
      if (attempt >= maxRetries || !isRetryableError(error)) {
        throw error;
      }
      const backoffMs = retryDelayMs * (attempt + 1);
      await delay(backoffMs);
      attempt += 1;
    }
  }

  throw new LLMTransportError(
    'ERR_LLM_REQUEST_FAILED',
    'LLM HTTP request failed without explicit error',
  );
}
