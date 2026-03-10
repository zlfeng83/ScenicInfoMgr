import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
    it('should merge class names correctly', () => {
        expect(cn('a', 'b')).toBe('a b');
    });

    it('should handle conditional class names', () => {
        expect(cn('a', true && 'b', false && 'c')).toBe('a b');
    });

    it('should merge tailwind classes correctly using tailwind-merge', () => {
        expect(cn('p-4', 'p-2')).toBe('p-2');
    });

    it('should handle arrays and objects', () => {
        expect(cn(['a', 'b'], { c: true, d: false })).toBe('a b c');
    });

    it('should handle empty inputs', () => {
        expect(cn()).toBe('');
    });
});
