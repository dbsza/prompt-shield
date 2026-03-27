/**
 * Returns true if hostname is allowed by the domain allowlist.
 * An empty list means "active on all sites" (no filtering).
 *
 * Matching is suffix-based: an entry of "chatgpt.com" allows
 * "chatgpt.com" and "www.chatgpt.com" but NOT "evil-chatgpt.com".
 */
export function isDomainAllowed(hostname: string, allowedDomains: string[]): boolean {
  if (allowedDomains.length === 0) return true;
  const host = hostname.toLowerCase();
  return allowedDomains.some((domain) => {
    const normalized = domain.toLowerCase().trim();
    return host === normalized || host.endsWith('.' + normalized);
  });
}
