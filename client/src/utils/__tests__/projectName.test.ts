import { describe, it, expect } from 'vitest';
import { descriptionToKebab } from '../projectName';

describe('descriptionToKebab (FR-163 §4.3)', () => {
  it('lowercases and hyphenates whitespace', () => {
    expect(descriptionToKebab('Agent Workflow')).toBe('agent-workflow');
    expect(descriptionToKebab('a  b')).toBe('a-b');
  });
  it('& becomes and', () => {
    expect(descriptionToKebab('Rise & Fall')).toBe('rise-and-fall');
  });
  it('strips accents via NFD', () => {
    expect(descriptionToKebab('Café Niño')).toBe('cafe-nino');
  });
  it('removes punctuation but keeps dots and digits', () => {
    expect(descriptionToKebab("Don't Panic!")).toBe('dont-panic');
    expect(descriptionToKebab('ito.ai review')).toBe('ito.ai-review');
    expect(descriptionToKebab('Top 10')).toBe('top-10');
  });
  it('collapses and trims separators', () => {
    expect(descriptionToKebab('a -- b')).toBe('a-b');
    expect(descriptionToKebab('-a-b-')).toBe('a-b');
  });
  it('AC 3 worked example', () => {
    expect(descriptionToKebab("Don't Panic — Café #2!")).toBe('dont-panic-cafe-2');
  });
  it('never truncates', () => {
    const long = 'x'.repeat(120);
    expect(descriptionToKebab(long)).toHaveLength(120);
  });
});
