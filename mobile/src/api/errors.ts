export class ApiError extends Error {
  status: number;
  code?: string;
  issues?: { path: string; message: string }[];

  constructor(status: number, message: string, code?: string, issues?: { path: string; message: string }[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

// status 0 means the request never got a response (offline, DNS, timeout).
export const networkError = () => new ApiError(0, 'Network request failed', 'NETWORK');

// The API answers errors in two shapes: { error: 'text', code? } from most
// controllers, and { success: false, error: { code, message } } from the
// subscription middleware.
export function errorFromResponse(status: number, body: unknown): ApiError {
  const data = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const err = data.error;
  let message = '';
  let code = typeof data.code === 'string' ? data.code : undefined;

  if (typeof err === 'string') {
    message = err;
  } else if (err && typeof err === 'object') {
    const nested = err as Record<string, unknown>;
    if (typeof nested.message === 'string') message = nested.message;
    if (!code && typeof nested.code === 'string') code = nested.code;
  } else if (typeof data.message === 'string') {
    message = data.message;
  }

  const issues = Array.isArray(data.issues) ? (data.issues as { path: string; message: string }[]) : undefined;
  return new ApiError(status, message || `Request failed (${status})`, code, issues);
}

export function friendlyMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Something went wrong. Please try again.';

  if (error.code === 'NETWORK') return "Can't reach Vajra Fitness right now. Check your connection and try again.";
  if (error.code === 'SUBSCRIPTION_READONLY') {
    return "This gym's subscription has expired, so changes are paused. You can still view everything.";
  }
  if (error.code === 'TRAINER_PENDING') return 'Your trainer account is waiting for approval from the gym.';
  if (error.code === 'TRAINER_REJECTED') return 'Your trainer application was not approved by the gym.';
  if (error.status === 429) return 'Too many attempts. Wait a few minutes and try again.';
  if (error.status >= 500) return 'Something went wrong on our side. Try again in a moment.';
  if (error.issues?.length) return error.issues[0]!.message;
  return error.message;
}
