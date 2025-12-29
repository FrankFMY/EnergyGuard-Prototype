import { describe, it, expect } from 'vitest';
import { cn } from '../utils.js';

describe('cn utility', () => {
	it('merges class names correctly', () => {
		expect(cn('foo', 'bar')).toBe('foo bar');
	});

	it('handles conditional classes', () => {
		const isActive = true;
		expect(cn('base', isActive && 'active')).toBe('base active');
	});

	it('handles falsy values', () => {
		expect(cn('base', false, null, undefined, 'end')).toBe('base end');
	});

	it('merges tailwind classes correctly', () => {
		expect(cn('px-2', 'px-4')).toBe('px-4');
		expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
	});

	it('handles array of classes', () => {
		expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
	});

	it('handles object syntax', () => {
		expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
	});
});
