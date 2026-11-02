import { describe, expect, test } from 'vitest';

describe('two cases', () => {
  test('passes', () => {
    expect(1).toBe(1);
  });

  test('fails', () => {
    expect(1).toBe(2);
  });
});
