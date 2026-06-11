import { describe, expect, it } from 'vitest';
import { cn, formatDate } from './utils';

describe('utils', () => {
  it('cn merges class names', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });

  it('formatDate returns pt-BR string', () => {
    expect(formatDate('2026-06-10T12:00:00.000Z')).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});
