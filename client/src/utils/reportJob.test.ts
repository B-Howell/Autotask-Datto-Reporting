import { describe, expect, it } from 'vitest';
import { errorMessage, isAbortError } from './reportJob';

describe('errorMessage', () => {
  it('reads the message of an Error and stringifies anything else', () => {
    expect(errorMessage(new Error('Request failed (500)'))).toBe('Request failed (500)');
    expect(errorMessage('plain text')).toBe('plain text');
    expect(errorMessage(42)).toBe('42');
  });

  it('answers the fallback only when the error carries no text', () => {
    expect(errorMessage(new Error(''), 'The run could not start')).toBe('The run could not start');
    expect(errorMessage(new Error(''))).toBe('');
    expect(errorMessage(new Error('Refused'), 'The run could not start')).toBe('Refused');
  });
});

describe('isAbortError', () => {
  it('is true only for a DOMException named AbortError', () => {
    expect(isAbortError(new DOMException('cancelled', 'AbortError'))).toBe(true);
    expect(isAbortError(new DOMException('nope', 'NetworkError'))).toBe(false);
    expect(isAbortError(new Error('AbortError'))).toBe(false);
  });
});
