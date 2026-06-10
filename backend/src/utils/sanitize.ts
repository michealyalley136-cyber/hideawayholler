const HTML_TAG_RE = /<[^>]*>/g;
const DANGEROUS_PROTOCOL_RE = /javascript:|data:text\/html/gi;

export function sanitizeText(input: unknown, maxLength = 5000): string {
  if (input == null) return '';
  return String(input)
    .replace(HTML_TAG_RE, '')
    .replace(DANGEROUS_PROTOCOL_RE, '')
    .trim()
    .slice(0, maxLength);
}

export function isAllowedHttpsImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return host === 'images.unsplash.com' || host.endsWith('.unsplash.com');
  } catch {
    return false;
  }
}
