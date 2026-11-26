import { describe, expect, it } from 'vitest';
import { isKnownGym } from './gymChoice';

describe('isKnownGym', () => {
  it('accepts a gym the member belongs to', () => {
    expect(isKnownGym('a', [{ gymId: 'a' }, { gymId: 'b' }])).toBe(true);
  });

  it('rejects a gym the member left', () => {
    expect(isKnownGym('c', [{ gymId: 'a' }])).toBe(false);
    expect(isKnownGym('c', [])).toBe(false);
  });
});
