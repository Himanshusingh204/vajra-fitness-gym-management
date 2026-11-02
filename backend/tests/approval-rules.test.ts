import { describe, it, expect } from 'vitest';
import { assertTransition, ApprovalError, protectedChanges, isLargePriceChange } from '../src/services/approval.service';

const legal: Array<[string, string]> = [
  ['DRAFT', 'PENDING_REVIEW'],
  ['DRAFT', 'CANCELLED'],
  ['PENDING_REVIEW', 'APPROVED'],
  ['PENDING_REVIEW', 'REJECTED'],
  ['PENDING_REVIEW', 'CHANGES_REQUESTED'],
  ['PENDING_REVIEW', 'CANCELLED'],
  ['CHANGES_REQUESTED', 'PENDING_REVIEW'],
  ['CHANGES_REQUESTED', 'CANCELLED'],
];

const illegal: Array<[string, string]> = [
  ['DRAFT', 'APPROVED'],
  ['DRAFT', 'REJECTED'],
  ['CHANGES_REQUESTED', 'APPROVED'],
  ['CHANGES_REQUESTED', 'REJECTED'],
  ['PENDING_REVIEW', 'PENDING_REVIEW'],
  ['PENDING_REVIEW', 'DRAFT'],
  ['APPROVED', 'REJECTED'],
  ['APPROVED', 'PENDING_REVIEW'],
  ['APPROVED', 'CANCELLED'],
  ['REJECTED', 'APPROVED'],
  ['REJECTED', 'PENDING_REVIEW'],
  ['CANCELLED', 'PENDING_REVIEW'],
  ['NOT_A_STATUS', 'APPROVED'],
];

describe('approval transitions', () => {
  it.each(legal)('allows %s -> %s', (from, to) => {
    expect(() => assertTransition(from, to)).not.toThrow();
  });

  it.each(illegal)('refuses %s -> %s with a 409 INVALID_TRANSITION', (from, to) => {
    let caught: unknown;
    try {
      assertTransition(from, to);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ApprovalError);
    expect(caught).toMatchObject({ status: 409, code: 'INVALID_TRANSITION' });
  });
});

describe('protected gym fields', () => {
  const gym = { name: 'Peak Club', address: '2 Test Ave', city: 'Mumbai', lat: 19.1, lng: 72.8, gstNumber: null, tagline: 'Old' };

  it('returns only protected fields whose value really changes', () => {
    expect(protectedChanges(gym, { name: 'Peak Club', city: 'Pune', tagline: 'New', lat: 19.1 })).toEqual({ city: 'Pune' });
  });

  it('treats an empty string and null as the same value', () => {
    expect(protectedChanges(gym, { gstNumber: '' })).toEqual({});
  });

  it('picks up lat/lng and GST changes', () => {
    expect(protectedChanges(gym, { lat: 18.5, gstNumber: '27ABCDE1234F1Z5' })).toEqual({ lat: 18.5, gstNumber: '27ABCDE1234F1Z5' });
  });

  it('ignores fields that are not sent', () => {
    expect(protectedChanges(gym, { tagline: 'New' })).toEqual({});
  });
});

describe('plan price threshold', () => {
  it('needs approval only above a 20% change either way', () => {
    expect(isLargePriceChange(1000, 1200)).toBe(false);
    expect(isLargePriceChange(1000, 1201)).toBe(true);
    expect(isLargePriceChange(1000, 800)).toBe(false);
    expect(isLargePriceChange(1000, 799)).toBe(true);
  });
});
