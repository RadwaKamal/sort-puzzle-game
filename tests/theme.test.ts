import { describe, expect, it } from 'vitest';
import { theme } from '../src/theme';

describe('theme', () => {
  it('defines at least 12 distinct liquid colors', () => {
    expect(theme.liquidColors.length).toBeGreaterThanOrEqual(12);
    expect(new Set(theme.liquidColors).size).toBe(theme.liquidColors.length);
  });
});
