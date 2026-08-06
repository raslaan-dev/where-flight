/**
 * A closed set of failures.
 *
 * Every one of these has to be *shown* to the user in plain English with a way
 * forward, so the type is a discriminated union and the copy table below is
 * exhaustive — adding a case without writing its copy is a type error.
 */
export type ApiErrorKind =
  | 'OFFLINE'
  | 'TIMEOUT'
  | 'AUTH_INVALID'
  | 'RATE_LIMITED'
  | 'BUDGET_EXHAUSTED'
  | 'SERVER'
  | 'BAD_REQUEST'
  | 'BAD_PAYLOAD';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  /** Unix ms after which a retry is worth attempting. */
  readonly retryAfter?: number;

  constructor(kind: ApiErrorKind, message: string, options?: { status?: number; retryAfter?: number }) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = options?.status;
    this.retryAfter = options?.retryAfter;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** Maps an HTTP status onto the union. */
export function kindFromStatus(status: number): ApiErrorKind {
  if (status === 401 || status === 403) return 'AUTH_INVALID';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVER';
  if (status >= 400) return 'BAD_REQUEST';
  return 'SERVER';
}

export type ErrorCopy = {
  title: string;
  body: string;
  /** Label for the primary action. Null when only the secondary makes sense. */
  primaryAction: string | null;
  /** Shown when cached data exists to fall back to. */
  offerCachedData: boolean;
};

/**
 * `Record` rather than a switch: TypeScript then fails the build if a new
 * error kind is added without copy, instead of shipping a blank screen.
 */
export const ERROR_COPY: Record<ApiErrorKind, ErrorCopy> = {
  OFFLINE: {
    title: 'No internet connection',
    body: 'Live positions need a connection. Your saved flights and the last view you loaded are still available.',
    primaryAction: 'Try again',
    offerCachedData: true,
  },
  TIMEOUT: {
    title: 'The network timed out',
    body: 'OpenSky did not respond in time. This usually clears up on its own.',
    primaryAction: 'Try again',
    offerCachedData: true,
  },
  AUTH_INVALID: {
    title: 'Those OpenSky credentials were rejected',
    body: 'Check the client ID and secret in Settings, or disconnect to carry on with the free anonymous allowance.',
    primaryAction: 'Open settings',
    offerCachedData: true,
  },
  RATE_LIMITED: {
    title: 'OpenSky is rate limiting us',
    body: 'Too many requests in a short window. Updates will resume automatically in a moment.',
    primaryAction: null,
    offerCachedData: true,
  },
  BUDGET_EXHAUSTED: {
    title: "Today's API allowance is used up",
    body: 'OpenSky resets the allowance at midnight UTC. Connecting your own OpenSky account in Settings raises it from 400 to 4,000 requests a day.',
    primaryAction: 'Open settings',
    offerCachedData: true,
  },
  SERVER: {
    title: 'OpenSky is having trouble',
    body: 'The network is a volunteer-run service and occasionally goes down. Nothing is wrong on your side.',
    primaryAction: 'Try again',
    offerCachedData: true,
  },
  BAD_REQUEST: {
    title: 'That area could not be searched',
    body: 'The map region was rejected by OpenSky. Zooming out and back in usually fixes it.',
    primaryAction: 'Reset the view',
    offerCachedData: false,
  },
  BAD_PAYLOAD: {
    title: 'Unexpected response from OpenSky',
    body: 'The server replied with something this app could not read. This is normally temporary.',
    primaryAction: 'Try again',
    offerCachedData: true,
  },
};

export function copyForError(error: unknown): ErrorCopy {
  if (isApiError(error)) return ERROR_COPY[error.kind];
  return ERROR_COPY.BAD_PAYLOAD;
}
