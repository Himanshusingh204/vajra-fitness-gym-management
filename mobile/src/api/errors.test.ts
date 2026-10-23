import { describe, expect, it } from 'vitest';
import { ApiError, errorFromResponse, friendlyMessage, networkError } from './errors';

describe('errorFromResponse', () => {
  it('reads the plain { error } shape', () => {
    const err = errorFromResponse(400, { error: 'Invalid credentials' });
    expect(err.message).toBe('Invalid credentials');
    expect(err.status).toBe(400);
  });

  it('reads the subscription middleware shape', () => {
    const err = errorFromResponse(403, {
      success: false,
      error: { code: 'SUBSCRIPTION_READONLY', message: 'Your subscription has expired.' },
    });
    expect(err.code).toBe('SUBSCRIPTION_READONLY');
    expect(err.message).toBe('Your subscription has expired.');
  });

  it('reads a top level code', () => {
    const err = errorFromResponse(403, { error: 'Awaiting approval', code: 'TRAINER_PENDING' });
    expect(err.code).toBe('TRAINER_PENDING');
  });

  it('copes with an empty body', () => {
    expect(errorFromResponse(502, null).message).toBe('Request failed (502)');
  });
});

describe('friendlyMessage', () => {
  it('explains network failures', () => {
    expect(friendlyMessage(networkError())).toMatch(/connection/);
  });

  it('explains a read-only gym', () => {
    expect(friendlyMessage(new ApiError(403, 'x', 'SUBSCRIPTION_READONLY'))).toMatch(/changes are paused/);
  });

  it('hides server internals on 5xx', () => {
    expect(friendlyMessage(new ApiError(500, 'Internal server error'))).toMatch(/on our side/);
  });

  it('uses the first validation issue', () => {
    const err = errorFromResponse(400, {
      error: 'Invalid request payload',
      issues: [{ path: 'phone', message: 'phone must be a valid Indian mobile number' }],
    });
    expect(friendlyMessage(err)).toBe('phone must be a valid Indian mobile number');
  });

  it('passes through ordinary API messages', () => {
    expect(friendlyMessage(new ApiError(409, 'An account with this email already exists'))).toBe(
      'An account with this email already exists',
    );
  });

  it('has a fallback for unknown errors', () => {
    expect(friendlyMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });
});
