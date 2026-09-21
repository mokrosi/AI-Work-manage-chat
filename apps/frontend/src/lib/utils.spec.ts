import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges conditional class names', () => {
    expect(cn('px-2', 'py-1', false && 'mb-4', null, undefined)).toBe('px-2 py-1');
  });

  it('lets the later tailwind class win on conflicts', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});