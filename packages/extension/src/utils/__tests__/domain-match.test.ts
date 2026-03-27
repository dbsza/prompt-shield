import { describe, it, expect } from 'vitest';
import { isDomainAllowed } from '../domain-match';

describe('isDomainAllowed', () => {
  it('returns true when allowedDomains is empty (no filtering)', () => {
    expect(isDomainAllowed('claude.ai', [])).toBe(true);
    expect(isDomainAllowed('google.com', [])).toBe(true);
  });

  it('matches exact domain', () => {
    expect(isDomainAllowed('chatgpt.com', ['chatgpt.com'])).toBe(true);
  });

  it('matches subdomain via suffix', () => {
    expect(isDomainAllowed('www.chatgpt.com', ['chatgpt.com'])).toBe(true);
    expect(isDomainAllowed('chat.openai.com', ['openai.com'])).toBe(true);
  });

  it('does not match unrelated domain with same suffix string', () => {
    expect(isDomainAllowed('evil-chatgpt.com', ['chatgpt.com'])).toBe(false);
    expect(isDomainAllowed('notchatgpt.com', ['chatgpt.com'])).toBe(false);
  });

  it('returns false when hostname not in list', () => {
    expect(isDomainAllowed('google.com', ['claude.ai', 'chatgpt.com'])).toBe(false);
  });

  it('returns true when hostname matches one of multiple domains', () => {
    expect(isDomainAllowed('claude.ai', ['chatgpt.com', 'claude.ai'])).toBe(true);
  });

  it('is case insensitive', () => {
    expect(isDomainAllowed('Claude.AI', ['claude.ai'])).toBe(true);
    expect(isDomainAllowed('claude.ai', ['Claude.AI'])).toBe(true);
  });

  it('trims whitespace in stored domain entries', () => {
    expect(isDomainAllowed('claude.ai', ['  claude.ai  '])).toBe(true);
  });
});
